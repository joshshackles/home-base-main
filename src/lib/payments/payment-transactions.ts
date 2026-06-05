import type Stripe from "stripe";
import { PaymentMethod, PaymentTransactionSource, PaymentTransactionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPlatformFeeSnapshot, calculatePlatformFeeAmount, getActivePlatformFeePolicy } from "@/lib/payments/platform-fee-policy";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function stripeId(value: string | { id?: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function statusDates(status: PaymentTransactionStatus) {
  const now = new Date();
  return {
    succeededAt: status === PaymentTransactionStatus.SUCCEEDED || status === PaymentTransactionStatus.RECONCILED ? now : undefined,
    failedAt: status === PaymentTransactionStatus.FAILED ? now : undefined,
    reconciledAt: status === PaymentTransactionStatus.RECONCILED ? now : undefined
  };
}

export function buildPaymentTransactionFinancials(grossAmount: number) {
  const policy = getActivePlatformFeePolicy();
  const platformFeeAmount = calculatePlatformFeeAmount(grossAmount, policy);
  return {
    grossAmount,
    platformFeeAmount,
    netToLandlordAmount: Math.max(0, grossAmount - platformFeeAmount),
    platformFeePolicyId: policy.id,
    platformFeePolicySnapshot: buildPlatformFeeSnapshot(grossAmount, policy)
  };
}

export async function recordPaymentTransaction(input: {
  source: PaymentTransactionSource;
  status: PaymentTransactionStatus;
  ledgerEntryId?: string | null;
  unitId: string;
  tenantUserId?: string | null;
  landlordUserId?: string | null;
  grossAmount: number;
  currency?: string;
  paymentMethod?: PaymentMethod | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeTransferId?: string | null;
  stripePaymentStatus?: string | null;
  idempotencyKey: string;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const financials = buildPaymentTransactionFinancials(input.grossAmount);
  const data = {
    source: input.source,
    status: input.status,
    ledgerEntryId: input.ledgerEntryId ?? undefined,
    unitId: input.unitId,
    tenantUserId: input.tenantUserId ?? undefined,
    landlordUserId: input.landlordUserId ?? undefined,
    grossAmount: financials.grossAmount,
    platformFeeAmount: financials.platformFeeAmount,
    netToLandlordAmount: financials.netToLandlordAmount,
    currency: input.currency ?? "usd",
    paymentMethod: input.paymentMethod ?? undefined,
    platformFeePolicyId: financials.platformFeePolicyId,
    platformFeePolicySnapshot: jsonValue(financials.platformFeePolicySnapshot),
    stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? undefined,
    stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
    stripeChargeId: input.stripeChargeId ?? undefined,
    stripeTransferId: input.stripeTransferId ?? undefined,
    stripePaymentStatus: input.stripePaymentStatus ?? undefined,
    idempotencyKey: input.idempotencyKey,
    failureReason: input.failureReason ?? undefined,
    metadata: jsonValue({ ...(input.metadata ?? {}), platformFeeSnapshot: financials.platformFeePolicySnapshot }),
    ...statusDates(input.status)
  };

  return prisma.paymentTransaction.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: data,
    update: {
      status: data.status,
      ledgerEntryId: data.ledgerEntryId,
      tenantUserId: data.tenantUserId,
      landlordUserId: data.landlordUserId,
      grossAmount: data.grossAmount,
      platformFeeAmount: data.platformFeeAmount,
      netToLandlordAmount: data.netToLandlordAmount,
      paymentMethod: data.paymentMethod,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeChargeId: data.stripeChargeId,
      stripeTransferId: data.stripeTransferId,
      stripePaymentStatus: data.stripePaymentStatus,
      failureReason: data.failureReason,
      metadata: data.metadata,
      ...statusDates(input.status)
    }
  });
}

export async function reconcilePaymentTransactionFromStripe(input: {
  ledgerEntryId: string;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  stripeEventId?: string | null;
  charge?: Stripe.Charge | null;
}) {
  const ledgerEntry = await prisma.ledgerEntry.findUnique({
    where: { id: input.ledgerEntryId },
    include: { unit: { include: { property: { select: { ownerId: true } } } } }
  });
  if (!ledgerEntry) return null;

  const paymentIntentId = input.paymentIntentId ?? stripeId(input.charge?.payment_intent as string | { id?: string } | null | undefined);
  const chargeId = input.charge?.id ?? null;
  const status = PaymentTransactionStatus.RECONCILED;

  const existing = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [
        paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : undefined,
        input.checkoutSessionId ? { stripeCheckoutSessionId: input.checkoutSessionId } : undefined,
        { ledgerEntryId: input.ledgerEntryId, status: { in: [PaymentTransactionStatus.CHECKOUT_STARTED, PaymentTransactionStatus.PROCESSING, PaymentTransactionStatus.SUCCEEDED] } }
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause))
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return prisma.paymentTransaction.update({
      where: { id: existing.id },
      data: {
        status,
        stripeCheckoutSessionId: input.checkoutSessionId ?? existing.stripeCheckoutSessionId,
        stripePaymentIntentId: paymentIntentId ?? existing.stripePaymentIntentId,
        stripeChargeId: chargeId ?? existing.stripeChargeId,
        stripePaymentStatus: "paid",
        succeededAt: existing.succeededAt ?? new Date(),
        reconciledAt: new Date(),
        metadata: jsonValue({ ...(existing.metadata as Record<string, unknown> | null ?? {}), stripeEventId: input.stripeEventId ?? null })
      }
    });
  }

  return recordPaymentTransaction({
    source: PaymentTransactionSource.WEBHOOK_RECONCILIATION,
    status,
    ledgerEntryId: input.ledgerEntryId,
    unitId: ledgerEntry.unitId,
    tenantUserId: ledgerEntry.tenantUserId,
    landlordUserId: ledgerEntry.unit.property.ownerId,
    grossAmount: ledgerEntry.amount,
    paymentMethod: input.checkoutSessionId ? PaymentMethod.CARD : PaymentMethod.ACH,
    stripeCheckoutSessionId: input.checkoutSessionId,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId: chargeId,
    stripePaymentStatus: "paid",
    idempotencyKey: `webhook-reconciliation-${paymentIntentId ?? input.checkoutSessionId ?? input.ledgerEntryId}`,
    metadata: { stripeEventId: input.stripeEventId ?? null }
  });
}

export async function markPaymentTransactionFailed(input: { paymentIntentId?: string | null; idempotencyKey?: string | null; ledgerEntryId?: string | null; failureReason: string; stripePaymentStatus?: string | null; metadata?: Record<string, unknown> }) {
  const where = [
    input.paymentIntentId ? { stripePaymentIntentId: input.paymentIntentId } : undefined,
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    input.ledgerEntryId ? { ledgerEntryId: input.ledgerEntryId } : undefined
  ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause));
  if (!where.length) return { count: 0 };

  return prisma.paymentTransaction.updateMany({
    where: { OR: where },
    data: {
      status: PaymentTransactionStatus.FAILED,
      failedAt: new Date(),
      failureReason: input.failureReason,
      stripePaymentStatus: input.stripePaymentStatus ?? "failed",
      metadata: input.metadata ? jsonValue(input.metadata) : undefined
    }
  });
}

export async function markPaymentTransactionByIntent(input: { paymentIntentId?: string | null; status: PaymentTransactionStatus; stripePaymentStatus?: string | null; metadata?: Record<string, unknown> }) {
  if (!input.paymentIntentId) return { count: 0 };
  return prisma.paymentTransaction.updateMany({
    where: { stripePaymentIntentId: input.paymentIntentId },
    data: {
      status: input.status,
      stripePaymentStatus: input.stripePaymentStatus,
      ...statusDates(input.status),
      metadata: input.metadata ? jsonValue(input.metadata) : undefined
    }
  });
}
