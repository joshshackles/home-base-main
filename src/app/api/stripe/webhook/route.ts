import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { AuditAction, LedgerEntryStatus, LedgerEntryType, PaymentMethod, PaymentRetryAttemptStatus, ScheduledPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { scheduleRetryForFailedPayment } from "@/lib/payments/financial-automation";

export const dynamic = "force-dynamic";

async function reconcilePaidLedgerEntry(input: { ledgerEntryId: string; checkoutSessionId?: string | null; paymentIntentId?: string | null; stripeEventId?: string | null }) {
  const charge = await prisma.ledgerEntry.findUnique({ where: { id: input.ledgerEntryId }, include: { unit: true, application: true } });
  if (!charge || charge.status === LedgerEntryStatus.VOIDED) return;
  const existingPayment = input.paymentIntentId ? await prisma.ledgerEntry.findFirst({ where: { stripePaymentIntentId: input.paymentIntentId, type: LedgerEntryType.PAYMENT }, select: { id: true } }) : null;
  if (existingPayment) {
    await prisma.ledgerEntry.update({ where: { id: charge.id }, data: { stripeCheckoutSessionId: input.checkoutSessionId ?? charge.stripeCheckoutSessionId, stripePaymentStatus: "paid", stripePaidAt: charge.stripePaidAt ?? new Date(), paidAt: charge.paidAt ?? new Date() } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.update({
      where: { id: charge.id },
      data: { stripeCheckoutSessionId: input.checkoutSessionId ?? charge.stripeCheckoutSessionId, stripePaymentStatus: "paid", stripePaidAt: new Date(), paidAt: new Date() }
    });
    await tx.ledgerEntry.create({
      data: {
        applicationId: charge.applicationId,
        unitId: charge.unitId,
        tenantUserId: charge.tenantUserId,
        type: LedgerEntryType.PAYMENT,
        status: LedgerEntryStatus.POSTED,
        paymentMethod: input.checkoutSessionId ? PaymentMethod.CARD : PaymentMethod.ACH,
        amount: charge.amount,
        description: `${input.checkoutSessionId ? "Online" : "Scheduled"} payment for ${charge.description}`,
        memo: input.checkoutSessionId ? "Automatically reconciled from Stripe Checkout." : "Automatically reconciled from Stripe PaymentIntent.",
        paidAt: new Date(),
        stripePaymentIntentId: input.paymentIntentId ?? undefined,
        stripePaymentStatus: "paid"
      }
    });
  });
  await writeAuditLog({ action: AuditAction.COMPLETE, entityType: "LedgerEntry", entityId: charge.id, message: "Stripe payment reconciled to ledger.", metadata: { checkoutSessionId: input.checkoutSessionId, paymentIntentId: input.paymentIntentId } });
  await prisma.paymentEvent.create({ data: { type: "PAYMENT_SUCCEEDED", userId: charge.tenantUserId, unitId: charge.unitId, ledgerEntryId: charge.id, stripeEventId: input.stripeEventId ?? undefined, amount: charge.amount, message: "Online payment succeeded and was reconciled to the ledger.", metadata: { checkoutSessionId: input.checkoutSessionId, paymentIntentId: input.paymentIntentId } } }).catch(() => null);
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 500 });
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ledgerEntryId = session.metadata?.ledgerEntryId;
    if (ledgerEntryId) await reconcilePaidLedgerEntry({ ledgerEntryId, checkoutSessionId: session.id, paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null, stripeEventId: event.id });

    const tenantUserId = session.metadata?.tenantUserId;
    if (tenantUserId && session.mode === "setup") {
      await prisma.paymentEvent.create({ data: { type: "METHOD_ADDED", userId: tenantUserId, stripeEventId: event.id, message: "Payment method setup completed in Stripe.", metadata: { checkoutSessionId: session.id, setupIntentId: typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id ?? null } } }).catch(() => null);
    }
  }

  if (event.type === "setup_intent.succeeded") {
    const setupIntent = event.data.object;
    const paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
    const customerId = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
    if (paymentMethodId && customerId) {
      const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
      if (user) {
        const stripe = getStripe();
        const method = await stripe.paymentMethods.retrieve(paymentMethodId);
        const isBank = method.type === "us_bank_account";
        await prisma.renterPaymentMethod.upsert({
          where: { stripePaymentMethodId: paymentMethodId },
          create: { userId: user.id, stripeCustomerId: customerId, stripePaymentMethodId: paymentMethodId, type: isBank ? "US_BANK_ACCOUNT" : method.type === "card" ? "CARD" : "OTHER", brand: method.card?.brand ?? undefined, bankName: method.us_bank_account?.bank_name ?? undefined, last4: method.card?.last4 ?? method.us_bank_account?.last4 ?? undefined, verificationStatus: isBank ? "VERIFIED" : "VERIFIED" },
          update: { stripeCustomerId: customerId, brand: method.card?.brand ?? undefined, bankName: method.us_bank_account?.bank_name ?? undefined, last4: method.card?.last4 ?? method.us_bank_account?.last4 ?? undefined, verificationStatus: "VERIFIED" }
        });
        await prisma.paymentEvent.create({ data: { type: "METHOD_VERIFIED", userId: user.id, stripeEventId: event.id, message: "Saved payment method verified by Stripe.", metadata: { paymentMethodId } } }).catch(() => null);
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const ledgerEntryId = intent.metadata?.ledgerEntryId;
    const scheduledPaymentId = intent.metadata?.scheduledPaymentId;
    const retryAttemptId = intent.metadata?.retryAttemptId;
    if (ledgerEntryId) await reconcilePaidLedgerEntry({ ledgerEntryId, paymentIntentId: intent.id, stripeEventId: event.id });
    if (scheduledPaymentId) await prisma.scheduledPayment.updateMany({ where: { id: scheduledPaymentId }, data: { status: ScheduledPaymentStatus.COMPLETED, processedAt: new Date(), failureReason: null } });
    if (retryAttemptId) await prisma.paymentRetryAttempt.updateMany({ where: { id: retryAttemptId }, data: { status: PaymentRetryAttemptStatus.SUCCEEDED, processedAt: new Date(), failureReason: null } });
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const ledgerEntryId = intent.metadata?.ledgerEntryId;
    const scheduledPaymentId = intent.metadata?.scheduledPaymentId;
    const retryAttemptId = intent.metadata?.retryAttemptId;
    if (scheduledPaymentId) await prisma.scheduledPayment.updateMany({ where: { id: scheduledPaymentId }, data: { status: ScheduledPaymentStatus.FAILED, processedAt: new Date(), failureReason: intent.last_payment_error?.message ?? "Stripe payment failed." } });
    if (retryAttemptId) await prisma.paymentRetryAttempt.updateMany({ where: { id: retryAttemptId }, data: { status: PaymentRetryAttemptStatus.FAILED, processedAt: new Date(), failureReason: intent.last_payment_error?.message ?? "Stripe payment failed." } });
    if (ledgerEntryId) {
      await prisma.ledgerEntry.updateMany({ where: { id: ledgerEntryId }, data: { stripePaymentStatus: "failed" } });
      const entry = await prisma.ledgerEntry.findUnique({ where: { id: ledgerEntryId }, select: { id: true, unitId: true, tenantUserId: true, amount: true } });
      const reason = intent.last_payment_error?.message ?? "Stripe payment failed.";
      await prisma.paymentEvent.create({ data: { type: "PAYMENT_FAILED", userId: entry?.tenantUserId, unitId: entry?.unitId, ledgerEntryId, stripeEventId: event.id, amount: intent.amount, message: reason, metadata: { paymentIntentId: intent.id } } }).catch(() => null);
      if (entry?.tenantUserId) await scheduleRetryForFailedPayment({ userId: entry.tenantUserId, unitId: entry.unitId, ledgerEntryId: entry.id, scheduledPaymentId: scheduledPaymentId || undefined, amount: entry.amount, reason }).catch(() => null);
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntentId) {
      const payment = await prisma.ledgerEntry.findFirst({ where: { stripePaymentIntentId: paymentIntentId, type: LedgerEntryType.PAYMENT }, select: { id: true, unitId: true, tenantUserId: true } });
      if (payment) {
        await prisma.paymentEvent.create({ data: { type: "PAYMENT_REFUNDED", userId: payment.tenantUserId, unitId: payment.unitId, ledgerEntryId: payment.id, stripeEventId: event.id, amount: charge.amount_refunded ?? undefined, message: "Stripe refund updated.", metadata: { chargeId: charge.id, paymentIntentId } } }).catch(() => null);
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    await prisma.user.updateMany({
      where: { stripeConnectAccountId: account.id },
      data: { stripeChargesEnabled: Boolean(account.charges_enabled), stripePayoutsEnabled: Boolean(account.payouts_enabled), stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled), stripeConnectLastSyncedAt: new Date() }
    });
  }

  return NextResponse.json({ received: true });
}
