import type Stripe from "stripe";
import { AuditAction, LedgerEntryStatus, LedgerEntryType, PaymentDisputeStatus, PaymentEventType, PaymentMethod, PaymentRetryAttemptStatus, PaymentWebhookProcessingStatus, ScheduledPaymentStatus, VendorPayoutStatus, Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { recordPaymentEvent } from "@/lib/payments/rental-finance";
import { scheduleRetryForFailedPayment } from "@/lib/payments/financial-automation";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function stripeId(value: string | { id?: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function receiptFromCharge(charge?: Stripe.Charge | null) {
  return {
    receiptUrl: charge?.receipt_url ?? null,
    receiptNumber: charge?.receipt_number ?? null
  };
}

export async function beginStripeWebhookEvent(event: Stripe.Event) {
  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { stripeEventId: event.id } });
  if (existing?.status === PaymentWebhookProcessingStatus.PROCESSED) return { log: existing, duplicate: true };

  const payload = { id: event.id, type: event.type, livemode: event.livemode, object: event.data.object };
  const data = {
    type: event.type,
    livemode: event.livemode,
    apiVersion: event.api_version ?? null,
    idempotencyKey: `stripe-webhook:${event.id}`,
    status: PaymentWebhookProcessingStatus.PROCESSING,
    processingStartedAt: new Date(),
    failedAt: null,
    errorMessage: null,
    payload: jsonValue(payload)
  };

  if (existing) {
    const log = await prisma.paymentWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { ...data, attempts: { increment: 1 } }
    });
    return { log, duplicate: false };
  }

  const log = await prisma.paymentWebhookEvent.create({
    data: { stripeEventId: event.id, ...data }
  });
  return { log, duplicate: false };
}

export async function markStripeWebhookProcessed(stripeEventId: string, status: Extract<PaymentWebhookProcessingStatus, "PROCESSED" | "SKIPPED"> = PaymentWebhookProcessingStatus.PROCESSED) {
  await prisma.paymentWebhookEvent.updateMany({
    where: { stripeEventId },
    data: { status, processedAt: new Date(), failedAt: null, errorMessage: null }
  });
}

export async function markStripeWebhookFailed(stripeEventId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Stripe webhook processing failed.";
  await prisma.paymentWebhookEvent.updateMany({
    where: { stripeEventId },
    data: { status: PaymentWebhookProcessingStatus.FAILED, failedAt: new Date(), errorMessage: message.slice(0, 1000) }
  });
}

export async function reconcilePaidLedgerEntry(input: { ledgerEntryId: string; checkoutSessionId?: string | null; paymentIntentId?: string | null; stripeEventId?: string | null; charge?: Stripe.Charge | null }) {
  const charge = await prisma.ledgerEntry.findUnique({ where: { id: input.ledgerEntryId }, include: { unit: true, application: true } });
  if (!charge || charge.status === LedgerEntryStatus.VOIDED) return null;

  const receipt = receiptFromCharge(input.charge);
  const existingPayment = input.paymentIntentId
    ? await prisma.ledgerEntry.findFirst({ where: { stripePaymentIntentId: input.paymentIntentId, type: LedgerEntryType.PAYMENT }, select: { id: true } })
    : null;

  if (existingPayment) {
    await prisma.ledgerEntry.update({
      where: { id: charge.id },
      data: {
        stripeCheckoutSessionId: input.checkoutSessionId ?? charge.stripeCheckoutSessionId,
        stripePaymentStatus: "paid",
        stripePaidAt: charge.stripePaidAt ?? new Date(),
        paidAt: charge.paidAt ?? new Date(),
        stripeReceiptUrl: receipt.receiptUrl ?? charge.stripeReceiptUrl,
        stripeReceiptNumber: receipt.receiptNumber ?? charge.stripeReceiptNumber
      }
    });
    return existingPayment;
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.update({
      where: { id: charge.id },
      data: {
        stripeCheckoutSessionId: input.checkoutSessionId ?? charge.stripeCheckoutSessionId,
        stripePaymentStatus: "paid",
        stripePaidAt: new Date(),
        paidAt: new Date(),
        stripeReceiptUrl: receipt.receiptUrl ?? undefined,
        stripeReceiptNumber: receipt.receiptNumber ?? undefined
      }
    });
    return tx.ledgerEntry.create({
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
        stripePaymentStatus: "paid",
        stripeReceiptUrl: receipt.receiptUrl ?? undefined,
        stripeReceiptNumber: receipt.receiptNumber ?? undefined
      }
    });
  });

  await writeAuditLog({ action: AuditAction.COMPLETE, entityType: "LedgerEntry", entityId: charge.id, message: "Stripe payment reconciled to ledger.", metadata: { checkoutSessionId: input.checkoutSessionId, paymentIntentId: input.paymentIntentId, receiptUrl: receipt.receiptUrl } });
  await recordPaymentEvent({ type: PaymentEventType.PAYMENT_SUCCEEDED, userId: charge.tenantUserId, unitId: charge.unitId, ledgerEntryId: charge.id, stripeEventId: input.stripeEventId, amount: charge.amount, message: "Online payment succeeded and was reconciled to the ledger.", metadata: { checkoutSessionId: input.checkoutSessionId, paymentIntentId: input.paymentIntentId, receiptUrl: receipt.receiptUrl } });
  if (receipt.receiptUrl) await recordPaymentEvent({ type: PaymentEventType.RECEIPT_AVAILABLE, userId: charge.tenantUserId, unitId: charge.unitId, ledgerEntryId: created.id, amount: charge.amount, message: "Stripe receipt is available.", metadata: { receiptUrl: receipt.receiptUrl, receiptNumber: receipt.receiptNumber } });
  return created;
}

export async function reconcileCheckoutSession(session: Stripe.Checkout.Session, stripeEventId: string, stripe?: Stripe) {
  const ledgerEntryId = session.metadata?.ledgerEntryId;
  const paymentIntentId = stripeId(session.payment_intent as string | { id?: string } | null | undefined);
  let charge: Stripe.Charge | null = null;
  if (stripe && paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    charge = typeof intent.latest_charge === "string" ? null : intent.latest_charge;
  }
  if (ledgerEntryId) await reconcilePaidLedgerEntry({ ledgerEntryId, checkoutSessionId: session.id, paymentIntentId, stripeEventId, charge });

  const tenantUserId = session.metadata?.tenantUserId;
  if (tenantUserId && session.mode === "setup") {
    await recordPaymentEvent({ type: PaymentEventType.METHOD_ADDED, userId: tenantUserId, stripeEventId, message: "Payment method setup completed in Stripe.", metadata: { checkoutSessionId: session.id, setupIntentId: stripeId(session.setup_intent as string | { id?: string } | null | undefined) } });
  }
}

export async function reconcilePaymentIntentSucceeded(intent: Stripe.PaymentIntent, stripeEventId: string) {
  const ledgerEntryId = intent.metadata?.ledgerEntryId;
  const scheduledPaymentId = intent.metadata?.scheduledPaymentId;
  const retryAttemptId = intent.metadata?.retryAttemptId;
  const charge = typeof intent.latest_charge === "string" ? null : intent.latest_charge;
  if (ledgerEntryId) await reconcilePaidLedgerEntry({ ledgerEntryId, paymentIntentId: intent.id, stripeEventId, charge });
  if (scheduledPaymentId) await prisma.scheduledPayment.updateMany({ where: { id: scheduledPaymentId }, data: { status: ScheduledPaymentStatus.COMPLETED, processedAt: new Date(), failureReason: null } });
  if (retryAttemptId) await prisma.paymentRetryAttempt.updateMany({ where: { id: retryAttemptId }, data: { status: PaymentRetryAttemptStatus.SUCCEEDED, processedAt: new Date(), failureReason: null } });
}

export async function reconcilePaymentIntentFailed(intent: Stripe.PaymentIntent, stripeEventId: string) {
  const ledgerEntryId = intent.metadata?.ledgerEntryId;
  const scheduledPaymentId = intent.metadata?.scheduledPaymentId;
  const retryAttemptId = intent.metadata?.retryAttemptId;
  const reason = intent.last_payment_error?.message ?? "Stripe payment failed.";
  if (scheduledPaymentId) await prisma.scheduledPayment.updateMany({ where: { id: scheduledPaymentId }, data: { status: ScheduledPaymentStatus.FAILED, processedAt: new Date(), failureReason: reason } });
  if (retryAttemptId) await prisma.paymentRetryAttempt.updateMany({ where: { id: retryAttemptId }, data: { status: PaymentRetryAttemptStatus.FAILED, processedAt: new Date(), failureReason: reason } });
  if (!ledgerEntryId) return;

  await prisma.ledgerEntry.updateMany({ where: { id: ledgerEntryId }, data: { stripePaymentStatus: "failed" } });
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: ledgerEntryId }, select: { id: true, unitId: true, tenantUserId: true, amount: true } });
  await recordPaymentEvent({ type: PaymentEventType.PAYMENT_FAILED, userId: entry?.tenantUserId, unitId: entry?.unitId, ledgerEntryId, stripeEventId, amount: intent.amount, message: reason, metadata: { paymentIntentId: intent.id, scheduledPaymentId, retryAttemptId } });
  if (entry?.tenantUserId) await scheduleRetryForFailedPayment({ userId: entry.tenantUserId, unitId: entry.unitId, ledgerEntryId: entry.id, scheduledPaymentId: scheduledPaymentId || undefined, amount: entry.amount, reason }).catch(() => null);
}

export async function recordRefundFromCharge(charge: Stripe.Charge, stripeEventId: string) {
  const paymentIntentId = stripeId(charge.payment_intent as string | { id?: string } | null | undefined);
  if (!paymentIntentId) return null;
  const payment = await prisma.ledgerEntry.findFirst({ where: { stripePaymentIntentId: paymentIntentId, type: LedgerEntryType.PAYMENT }, include: { unit: { include: { property: true } } } });
  if (!payment) return null;
  await prisma.ledgerEntry.update({ where: { id: payment.id }, data: { stripeRefundStatus: charge.refunded ? "refunded" : "partially_refunded" } });
  return recordPaymentEvent({ type: PaymentEventType.PAYMENT_REFUNDED, userId: payment.tenantUserId, unitId: payment.unitId, ledgerEntryId: payment.id, stripeEventId, amount: charge.amount_refunded ?? undefined, message: "Stripe refund updated.", metadata: { chargeId: charge.id, paymentIntentId, refunded: charge.refunded, amountRefunded: charge.amount_refunded } });
}

function mapDisputeStatus(status: string): PaymentDisputeStatus {
  if (status === "won") return PaymentDisputeStatus.WON;
  if (status === "lost") return PaymentDisputeStatus.LOST;
  if (status === "under_review" || status === "warning_under_review") return PaymentDisputeStatus.UNDER_REVIEW;
  if (status === "closed" || status === "charge_refunded") return PaymentDisputeStatus.CLOSED;
  return PaymentDisputeStatus.NEEDS_RESPONSE;
}

export async function recordDispute(dispute: Stripe.Dispute, stripeEventId: string, stripe?: Stripe) {
  let paymentIntentId = stripeId((dispute as Stripe.Dispute & { payment_intent?: string | { id?: string } | null }).payment_intent);
  const chargeId = stripeId(dispute.charge as string | { id?: string } | null | undefined);
  if (!paymentIntentId && chargeId && stripe) {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = stripeId(charge.payment_intent as string | { id?: string } | null | undefined);
  }
  const ledgerEntry = paymentIntentId
    ? await prisma.ledgerEntry.findFirst({ where: { stripePaymentIntentId: paymentIntentId }, include: { unit: { include: { property: true } } } })
    : null;
  if (!ledgerEntry?.unit.property.ownerId) return null;

  const status = mapDisputeStatus(dispute.status);
  const saved = await prisma.paymentDispute.upsert({
    where: { stripeDisputeId: dispute.id },
    create: {
      ownerUserId: ledgerEntry.unit.property.ownerId,
      unitId: ledgerEntry.unitId,
      ledgerEntryId: ledgerEntry.id,
      stripeDisputeId: dispute.id,
      stripeChargeId: chargeId ?? undefined,
      amount: dispute.amount,
      reason: dispute.reason ?? undefined,
      status,
      evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined,
      resolvedAt: status === PaymentDisputeStatus.WON || status === PaymentDisputeStatus.LOST || status === PaymentDisputeStatus.CLOSED ? new Date() : undefined
    },
    update: {
      status,
      reason: dispute.reason ?? undefined,
      evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined,
      resolvedAt: status === PaymentDisputeStatus.WON || status === PaymentDisputeStatus.LOST || status === PaymentDisputeStatus.CLOSED ? new Date() : undefined
    }
  });

  await recordPaymentEvent({
    type: status === PaymentDisputeStatus.WON || status === PaymentDisputeStatus.LOST || status === PaymentDisputeStatus.CLOSED ? PaymentEventType.DISPUTE_CLOSED : saved.createdAt.getTime() === saved.updatedAt.getTime() ? PaymentEventType.DISPUTE_OPENED : PaymentEventType.DISPUTE_UPDATED,
    userId: ledgerEntry.tenantUserId,
    unitId: ledgerEntry.unitId,
    ledgerEntryId: ledgerEntry.id,
    stripeEventId,
    amount: dispute.amount,
    message: `Stripe dispute ${status.toLowerCase().replace(/_/g, " ")}.`,
    metadata: { disputeId: dispute.id, chargeId, paymentIntentId, reason: dispute.reason, status: dispute.status }
  });
  return saved;
}

export async function recordTransferOrPayout(event: Stripe.Event) {
  if (event.type === "transfer.created" || event.type === "transfer.reversed") {
    const transfer = event.data.object as Stripe.Transfer;
    const status = event.type === "transfer.created" ? VendorPayoutStatus.PROCESSING : VendorPayoutStatus.FAILED;
    const update = await prisma.vendorPayout.updateMany({
      where: { stripeTransferId: transfer.id },
      data: { status, failureReason: event.type === "transfer.reversed" ? "Stripe transfer was reversed." : null }
    });
    await recordPaymentEvent({ type: event.type === "transfer.created" ? PaymentEventType.PAYOUT_PROCESSING : PaymentEventType.PAYOUT_FAILED, stripeEventId: event.id, amount: transfer.amount, message: event.type === "transfer.created" ? "Stripe transfer entered processing." : "Stripe transfer was reversed.", metadata: { transferId: transfer.id, destination: transfer.destination, matchedVendorPayouts: update.count } });
    return update;
  }

  if (event.type === "payout.paid" || event.type === "payout.failed") {
    const payout = event.data.object as Stripe.Payout;
    await recordPaymentEvent({ type: event.type === "payout.paid" ? PaymentEventType.PAYOUT_PAID : PaymentEventType.PAYOUT_FAILED, stripeEventId: event.id, amount: payout.amount, message: event.type === "payout.paid" ? "Stripe payout was paid." : payout.failure_message ?? "Stripe payout failed.", metadata: { payoutId: payout.id, arrivalDate: payout.arrival_date, failureCode: payout.failure_code } });
  }
  return null;
}

export async function getLandlordPaymentReconciliationCenter(ownerUserId: string) {
  const [ledgerEntries, retries, autopayEnrollments, disputes, vendorPayouts, paymentEvents] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { unit: { property: { ownerId: ownerUserId } }, status: { not: LedgerEntryStatus.VOIDED } }, orderBy: { postedAt: "desc" }, take: 80, include: { unit: { include: { property: true } }, tenantUser: true } }),
    prisma.paymentRetryAttempt.findMany({ where: { unit: { property: { ownerId: ownerUserId } }, status: { in: [PaymentRetryAttemptStatus.SCHEDULED, PaymentRetryAttemptStatus.PROCESSING, PaymentRetryAttemptStatus.FAILED] } }, orderBy: { nextAttemptAt: "asc" }, take: 30, include: { unit: { include: { property: true } }, user: true, ledgerEntry: true } }),
    prisma.autoPayEnrollment.findMany({ where: { unit: { property: { ownerId: ownerUserId } } }, orderBy: [{ status: "asc" }, { failureCount: "desc" }], take: 30, include: { unit: { include: { property: true } }, user: true } }),
    prisma.paymentDispute.findMany({ where: { ownerUserId }, orderBy: { updatedAt: "desc" }, take: 30, include: { unit: { include: { property: true } }, ledgerEntry: true } }),
    prisma.vendorPayout.findMany({ where: { ownerUserId }, orderBy: { updatedAt: "desc" }, take: 30, include: { vendor: true, unit: { include: { property: true } }, ledgerEntry: true } }),
    prisma.paymentEvent.findMany({ where: { OR: [{ unit: { is: { property: { ownerId: ownerUserId } } } }, { type: { in: [PaymentEventType.PAYOUT_PAID, PaymentEventType.PAYOUT_FAILED, PaymentEventType.PAYOUT_PROCESSING] } }] }, orderBy: { createdAt: "desc" }, take: 30, include: { unit: { include: { property: true } }, ledgerEntry: true } })
  ]);

  const received = ledgerEntries.filter((entry) => entry.type === LedgerEntryType.PAYMENT || entry.type === LedgerEntryType.CREDIT).reduce((sum, entry) => sum + entry.amount, 0);
  const openCharges = ledgerEntries.filter((entry) => (entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT) && entry.stripePaymentStatus !== "paid");
  const refunds = ledgerEntries.filter((entry) => entry.stripeRefundStatus);
  const receiptGaps = ledgerEntries.filter((entry) => entry.type === LedgerEntryType.PAYMENT && entry.stripePaymentIntentId && !entry.stripeReceiptUrl);
  const paidChargeGaps = ledgerEntries.filter((entry) => (entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT) && entry.stripePaymentStatus === "paid" && !entry.paidAt);

  return {
    ledgerEntries,
    retries,
    autopayEnrollments,
    disputes,
    vendorPayouts,
    paymentEvents,
    metrics: {
      received,
      outstanding: openCharges.reduce((sum, entry) => sum + entry.amount, 0),
      failedRetries: retries.filter((retry) => retry.status === PaymentRetryAttemptStatus.FAILED).length,
      activeDisputes: disputes.filter((dispute) => dispute.status === PaymentDisputeStatus.NEEDS_RESPONSE || dispute.status === PaymentDisputeStatus.UNDER_REVIEW).length,
      refundCount: refunds.length,
      receiptGapCount: receiptGaps.length,
      reconciliationGapCount: paidChargeGaps.length
    },
    openCharges,
    refunds,
    receiptGaps,
    paidChargeGaps
  };
}
