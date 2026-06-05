import { LedgerEntryStatus, LedgerEntryType, PaymentMethod, ScheduledPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformApplicationFeeAmount, getStripe, stripePaymentsEnabled } from "@/lib/stripe";
import { buildPlatformFeeSnapshot } from "@/lib/payments/platform-fee-policy";
import { recordPaymentEvent } from "@/lib/payments/rental-finance";
import { scheduleRetryForFailedPayment } from "@/lib/payments/financial-automation";

export async function processDueScheduledPayments(runAt = new Date()) {
  if (!stripePaymentsEnabled()) return { processed: 0, skipped: 0, failed: 0, reason: "Stripe is not configured." };
  const stripe = getStripe();
  const due = await prisma.scheduledPayment.findMany({
    where: { status: ScheduledPaymentStatus.SCHEDULED, scheduledFor: { lte: runAt } },
    take: 25,
    orderBy: { scheduledFor: "asc" },
    include: { user: true, unit: { include: { property: { include: { owner: true } } } }, ledgerEntry: true }
  });
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  for (const payment of due) {
    const owner = payment.unit.property.owner;
    const destinationAccountId = owner?.stripeConnectAccountId;
    const ownerId = owner?.id;
    const savedMethod = payment.stripePaymentMethodId ? await prisma.renterPaymentMethod.findFirst({ where: { userId: payment.userId, stripePaymentMethodId: payment.stripePaymentMethodId }, select: { id: true } }) : null;
    if (!payment.stripePaymentMethodId || !savedMethod || !payment.user.stripeCustomerId || !destinationAccountId || !ownerId || !owner?.stripeChargesEnabled) {
      skipped += 1;
      await prisma.scheduledPayment.update({ where: { id: payment.id }, data: { status: ScheduledPaymentStatus.FAILED, failureReason: "Missing owned renter payment method, Stripe customer, or landlord Connect account." } });
      await recordPaymentEvent({ type: "PAYMENT_FAILED", userId: payment.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, amount: payment.amount, message: "Scheduled payment could not run because payment setup is incomplete or the saved payment method no longer belongs to this renter." });
      await scheduleRetryForFailedPayment({ userId: payment.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, scheduledPaymentId: payment.id, amount: payment.amount, stripePaymentMethodId: payment.stripePaymentMethodId, reason: "Scheduled payment setup incomplete." });
      continue;
    }
    await prisma.scheduledPayment.update({ where: { id: payment.id }, data: { status: ScheduledPaymentStatus.PROCESSING } });
    try {
      const platformFeeSnapshot = buildPlatformFeeSnapshot(payment.amount);
      const intent = await stripe.paymentIntents.create({
        amount: payment.amount,
        currency: "usd",
        customer: payment.user.stripeCustomerId,
        payment_method: payment.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        application_fee_amount: getPlatformApplicationFeeAmount(payment.amount) || undefined,
        transfer_data: { destination: destinationAccountId },
        metadata: { scheduledPaymentId: payment.id, ledgerEntryId: payment.ledgerEntryId ?? "", tenantUserId: payment.userId, landlordUserId: ownerId, ...platformFeeSnapshot }
      }, { idempotencyKey: `scheduled-payment-${payment.id}` });
      const paid = intent.status === "succeeded";
      await prisma.$transaction(async (tx) => {
        await tx.scheduledPayment.update({ where: { id: payment.id }, data: { status: paid ? ScheduledPaymentStatus.COMPLETED : ScheduledPaymentStatus.PROCESSING, processedAt: paid ? new Date() : null } });
        if (payment.ledgerEntryId) {
          await tx.ledgerEntry.update({ where: { id: payment.ledgerEntryId }, data: { stripePaymentStatus: paid ? "paid" : intent.status, stripePaidAt: paid ? new Date() : null, paidAt: paid ? new Date() : null } });
        }
        if (paid) {
          await tx.ledgerEntry.create({ data: { applicationId: payment.ledgerEntry?.applicationId, unitId: payment.unitId, tenantUserId: payment.userId, type: LedgerEntryType.PAYMENT, status: LedgerEntryStatus.POSTED, paymentMethod: PaymentMethod.ACH, amount: payment.amount, description: `Scheduled payment${payment.ledgerEntry ? ` for ${payment.ledgerEntry.description}` : ""}`, memo: "Automatically processed from scheduled payment.", paidAt: new Date(), stripePaymentIntentId: intent.id, stripePaymentStatus: "paid" } });
        }
      });
      await recordPaymentEvent({ type: paid ? "PAYMENT_SUCCEEDED" : "PAYMENT_STARTED", userId: payment.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, amount: payment.amount, message: paid ? "Scheduled payment processed successfully." : "Scheduled payment submitted to Stripe and is awaiting final confirmation.", metadata: { paymentIntentId: intent.id, scheduledPaymentId: payment.id, stripeStatus: intent.status, platformFeeSnapshot } });
      processed += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Scheduled payment failed.";
      await prisma.scheduledPayment.update({ where: { id: payment.id }, data: { status: ScheduledPaymentStatus.FAILED, failureReason: message } });
      await recordPaymentEvent({ type: "PAYMENT_FAILED", userId: payment.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, amount: payment.amount, message, metadata: { scheduledPaymentId: payment.id } });
      await scheduleRetryForFailedPayment({ userId: payment.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, scheduledPaymentId: payment.id, amount: payment.amount, stripePaymentMethodId: payment.stripePaymentMethodId, reason: message });
    }
  }
  return { processed, skipped, failed };
}
