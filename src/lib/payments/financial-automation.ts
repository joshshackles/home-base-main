import {
  AutoPayEnrollmentStatus,
  FinancialAdjustmentType,
  LedgerEntryStatus,
  LedgerEntryType,
  OwnerStatementStatus,
  PaymentEventType,
  PaymentMethod,
  PaymentRetryAttemptStatus,
  PaymentTransactionSource,
  PaymentTransactionStatus,
  Prisma,
  ScheduledPaymentStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe, stripePaymentsEnabled } from "@/lib/stripe";
import { buildPlatformFeeSnapshot, calculatePlatformFeeAmount, getActivePlatformFeePolicyForPayments } from "@/lib/payments/platform-fee-policy";
import { recordPaymentTransaction } from "@/lib/payments/payment-transactions";
import { recordPaymentEvent } from "@/lib/payments/rental-finance";

export const RETRY_DELAYS_DAYS = [2, 5, 10] as const;
export const MAX_AUTOPAY_FAILURES_BEFORE_PAUSE = 3;

export function centsFromDollars(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "0"));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function clampBillingDay(day: number) {
  return Math.min(Math.max(Math.trunc(Number.isFinite(day) ? day : 1), 1), 28);
}

export function nextMonthlyRunDate(dayOfMonth: number, from = new Date()) {
  const day = clampBillingDay(dayOfMonth);
  const candidate = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0);
  if (candidate <= from) return new Date(from.getFullYear(), from.getMonth() + 1, day, 12, 0, 0, 0);
  return candidate;
}

export function periodKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function enableAutoPay(input: { userId: string; unitId: string; stripePaymentMethodId: string; backupPaymentMethodId?: string; amountLimit?: number | null; dayOfMonth?: number }) {
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, OR: [{ tenantUserId: input.userId }, { applications: { some: { applicantUserId: input.userId } } }] },
    include: { rentBillingPolicy: true }
  });
  if (!unit) throw new Error("This unit is not available for autopay from your account.");
  const ownedMethods = await prisma.renterPaymentMethod.findMany({
    where: { userId: input.userId, stripePaymentMethodId: { in: [input.stripePaymentMethodId, input.backupPaymentMethodId].filter((value): value is string => Boolean(value)) } },
    select: { stripePaymentMethodId: true }
  });
  const ownedIds = new Set(ownedMethods.map((method) => method.stripePaymentMethodId));
  if (!ownedIds.has(input.stripePaymentMethodId)) throw new Error("The primary payment method is not saved to this renter account.");
  if (input.backupPaymentMethodId && !ownedIds.has(input.backupPaymentMethodId)) throw new Error("The backup payment method is not saved to this renter account.");
  const day = clampBillingDay(input.dayOfMonth ?? unit.rentBillingPolicy?.dueDayOfMonth ?? 1);
  const enrollment = await prisma.autoPayEnrollment.upsert({
    where: { userId_unitId: { userId: input.userId, unitId: input.unitId } },
    create: {
      userId: input.userId,
      unitId: input.unitId,
      stripePaymentMethodId: input.stripePaymentMethodId,
      backupPaymentMethodId: input.backupPaymentMethodId || undefined,
      amountLimit: input.amountLimit ?? undefined,
      dayOfMonth: day,
      nextRunDate: nextMonthlyRunDate(day)
    },
    update: {
      stripePaymentMethodId: input.stripePaymentMethodId,
      backupPaymentMethodId: input.backupPaymentMethodId || undefined,
      amountLimit: input.amountLimit ?? undefined,
      dayOfMonth: day,
      nextRunDate: nextMonthlyRunDate(day),
      status: AutoPayEnrollmentStatus.ACTIVE,
      pausedAt: null,
      cancelledAt: null
    }
  });
  await recordPaymentEvent({ type: PaymentEventType.AUTOPAY_ENABLED, userId: input.userId, unitId: input.unitId, message: "Autopay enrollment enabled.", metadata: { dayOfMonth: day, amountLimit: input.amountLimit ?? null } });
  return enrollment;
}

export async function updateAutoPayStatus(input: { userId: string; enrollmentId: string; status: AutoPayEnrollmentStatus }) {
  const data: Prisma.AutoPayEnrollmentUpdateInput = { status: input.status };
  if (input.status === AutoPayEnrollmentStatus.PAUSED) data.pausedAt = new Date();
  if (input.status === AutoPayEnrollmentStatus.CANCELLED) data.cancelledAt = new Date();
  if (input.status === AutoPayEnrollmentStatus.ACTIVE) {
    data.pausedAt = null;
    data.cancelledAt = null;
  }
  const current = await prisma.autoPayEnrollment.findFirst({ where: { id: input.enrollmentId, userId: input.userId } });
  if (!current) throw new Error("Autopay enrollment not found.");
  const enrollment = await prisma.autoPayEnrollment.update({ where: { id: current.id }, data });
  const type = input.status === AutoPayEnrollmentStatus.CANCELLED ? PaymentEventType.AUTOPAY_CANCELLED : input.status === AutoPayEnrollmentStatus.PAUSED ? PaymentEventType.AUTOPAY_PAUSED : PaymentEventType.AUTOPAY_ENABLED;
  await recordPaymentEvent({ type, userId: input.userId, unitId: enrollment.unitId, message: `Autopay ${input.status.toLowerCase()}.` });
  return enrollment;
}

export async function generateMonthlyRentCharges(runAt = new Date(), landlordUserId?: string) {
  const schedules = await prisma.rentBillingPolicy.findMany({
    where: { unit: landlordUserId ? { property: { ownerId: landlordUserId } } : undefined },
    include: { unit: { include: { property: true } } }
  });
  let created = 0;
  for (const policy of schedules) {
    const dueDate = new Date(runAt.getFullYear(), runAt.getMonth(), clampBillingDay(policy.dueDayOfMonth), 12, 0, 0, 0);
    const period = periodKey(dueDate);
    const tenantUserId = policy.unit.tenantUserId;
    if (!tenantUserId || policy.monthlyRent <= 0) continue;
    const existing = await prisma.ledgerEntry.findFirst({ where: { unitId: policy.unitId, generatedForPeriod: period, type: LedgerEntryType.CHARGE, description: { contains: "Monthly rent" } }, select: { id: true } });
    if (existing) continue;
    const entry = await prisma.ledgerEntry.create({
      data: {
        unitId: policy.unitId,
        tenantUserId,
        type: LedgerEntryType.CHARGE,
        status: LedgerEntryStatus.POSTED,
        paymentMethod: PaymentMethod.OTHER,
        amount: policy.monthlyRent,
        description: `Monthly rent - ${period}`,
        memo: "Generated automatically from rent billing policy.",
        dueDate,
        generatedForPeriod: period
      }
    });
    created += 1;
    await recordPaymentEvent({ type: PaymentEventType.RENT_GENERATED, userId: tenantUserId, unitId: policy.unitId, ledgerEntryId: entry.id, amount: policy.monthlyRent, message: `Monthly rent generated for ${policy.unit.property.name} #${policy.unit.unitNumber}.`, metadata: { period } });
  }
  return { created };
}

export async function scheduleRetryForFailedPayment(input: { userId: string; unitId: string; amount: number; ledgerEntryId?: string | null; scheduledPaymentId?: string | null; stripePaymentMethodId?: string | null; backupPaymentMethodId?: string | null; reason?: string }) {
  const existingCount = input.ledgerEntryId ? await prisma.paymentRetryAttempt.count({ where: { ledgerEntryId: input.ledgerEntryId } }) : 0;
  const attemptNumber = existingCount + 1;
  if (attemptNumber > RETRY_DELAYS_DAYS.length) {
    const enrollment = await prisma.autoPayEnrollment.findUnique({ where: { userId_unitId: { userId: input.userId, unitId: input.unitId } } });
    if (enrollment) {
      const nextFailureCount = enrollment.failureCount + 1;
      await prisma.autoPayEnrollment.update({
        where: { id: enrollment.id },
        data: {
          failureCount: nextFailureCount,
          status: nextFailureCount >= MAX_AUTOPAY_FAILURES_BEFORE_PAUSE ? AutoPayEnrollmentStatus.PAUSED : enrollment.status,
          pausedAt: nextFailureCount >= MAX_AUTOPAY_FAILURES_BEFORE_PAUSE ? new Date() : enrollment.pausedAt
        }
      });
      if (nextFailureCount >= MAX_AUTOPAY_FAILURES_BEFORE_PAUSE) {
        await recordPaymentEvent({ type: PaymentEventType.AUTOPAY_PAUSED, userId: input.userId, unitId: input.unitId, ledgerEntryId: input.ledgerEntryId, amount: input.amount, message: "Autopay paused after repeated failed payment recovery attempts.", metadata: { maxRetryAttempts: RETRY_DELAYS_DAYS.length, maxAutopayFailures: MAX_AUTOPAY_FAILURES_BEFORE_PAUSE, reason: input.reason ?? null } });
      }
    }
    return null;
  }
  const nextAttemptAt = new Date(Date.now() + RETRY_DELAYS_DAYS[attemptNumber - 1] * 86400000);
  const retry = await prisma.paymentRetryAttempt.create({
    data: {
      userId: input.userId,
      unitId: input.unitId,
      ledgerEntryId: input.ledgerEntryId ?? undefined,
      scheduledPaymentId: input.scheduledPaymentId ?? undefined,
      stripePaymentMethodId: input.stripePaymentMethodId ?? undefined,
      backupPaymentMethodId: input.backupPaymentMethodId ?? undefined,
      amount: input.amount,
      attemptNumber,
      nextAttemptAt,
      failureReason: input.reason
    }
  });
  await recordPaymentEvent({ type: PaymentEventType.PAYMENT_RETRY_SCHEDULED, userId: input.userId, unitId: input.unitId, ledgerEntryId: input.ledgerEntryId, amount: input.amount, message: `Payment retry #${attemptNumber} scheduled for ${nextAttemptAt.toLocaleDateString()}.`, metadata: { retryAttemptId: retry.id, reason: input.reason ?? null } });
  return retry;
}

export async function processDuePaymentRetries(runAt = new Date()) {
  if (!stripePaymentsEnabled()) return { processed: 0, failed: 0, skipped: 0, reason: "Stripe is not configured." };
  const stripe = getStripe();
  const retries = await prisma.paymentRetryAttempt.findMany({
    where: { status: PaymentRetryAttemptStatus.SCHEDULED, nextAttemptAt: { lte: runAt } },
    take: 25,
    orderBy: { nextAttemptAt: "asc" },
    include: { user: true, unit: { include: { property: { include: { owner: true } } } }, ledgerEntry: true }
  });
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  for (const retry of retries) {
    const owner = retry.unit.property.owner;
    const methodId = retry.stripePaymentMethodId || retry.backupPaymentMethodId;
    if (!methodId || !retry.user.stripeCustomerId || !owner?.stripeConnectAccountId || !owner.stripeChargesEnabled) {
      skipped += 1;
      await prisma.paymentRetryAttempt.update({ where: { id: retry.id }, data: { status: PaymentRetryAttemptStatus.FAILED, processedAt: new Date(), failureReason: "Retry setup is incomplete." } });
      continue;
    }
    await prisma.paymentRetryAttempt.update({ where: { id: retry.id }, data: { status: PaymentRetryAttemptStatus.PROCESSING } });
    try {
      const platformFeePolicy = await getActivePlatformFeePolicyForPayments();
      const platformFeeSnapshot = buildPlatformFeeSnapshot(retry.amount, platformFeePolicy);
      const intent = await stripe.paymentIntents.create({
        amount: retry.amount,
        currency: "usd",
        customer: retry.user.stripeCustomerId,
        payment_method: methodId,
        confirm: true,
        off_session: true,
        application_fee_amount: calculatePlatformFeeAmount(retry.amount, platformFeePolicy) || undefined,
        transfer_data: { destination: owner.stripeConnectAccountId },
        metadata: { retryAttemptId: retry.id, ledgerEntryId: retry.ledgerEntryId ?? "", tenantUserId: retry.userId, landlordUserId: owner.id, ...platformFeeSnapshot }
      }, { idempotencyKey: `payment-retry-${retry.id}` });
      const paid = intent.status === "succeeded";
      await recordPaymentTransaction({
        source: PaymentTransactionSource.PAYMENT_RETRY,
        status: paid ? PaymentTransactionStatus.SUCCEEDED : PaymentTransactionStatus.PROCESSING,
        ledgerEntryId: retry.ledgerEntryId,
        unitId: retry.unitId,
        tenantUserId: retry.userId,
        landlordUserId: owner.id,
        grossAmount: retry.amount,
        paymentMethod: PaymentMethod.ACH,
        stripePaymentIntentId: intent.id,
        stripePaymentStatus: intent.status,
        idempotencyKey: `payment-retry-${retry.id}`,
        metadata: { retryAttemptId: retry.id, platformFeeSnapshot },
        platformFeePolicy
      });
      await prisma.$transaction(async (tx) => {
        await tx.paymentRetryAttempt.update({ where: { id: retry.id }, data: { status: paid ? PaymentRetryAttemptStatus.SUCCEEDED : PaymentRetryAttemptStatus.PROCESSING, processedAt: paid ? new Date() : null, failureReason: paid ? null : `Stripe status: ${intent.status}` } });
        if (retry.ledgerEntryId) await tx.ledgerEntry.update({ where: { id: retry.ledgerEntryId }, data: { stripePaymentStatus: paid ? "paid" : intent.status, stripePaidAt: paid ? new Date() : null, paidAt: paid ? new Date() : null } });
        if (paid) {
          await tx.ledgerEntry.create({ data: { applicationId: retry.ledgerEntry?.applicationId, unitId: retry.unitId, tenantUserId: retry.userId, type: LedgerEntryType.PAYMENT, status: LedgerEntryStatus.POSTED, paymentMethod: PaymentMethod.ACH, amount: retry.amount, description: `Recovered payment${retry.ledgerEntry ? ` for ${retry.ledgerEntry.description}` : ""}`, memo: "Processed by failed-payment recovery workflow.", paidAt: new Date(), stripePaymentIntentId: intent.id, stripePaymentStatus: "paid" } });
        }
      });
      processed += 1;
      await recordPaymentEvent({ type: paid ? PaymentEventType.PAYMENT_RETRY_SUCCEEDED : PaymentEventType.PAYMENT_STARTED, userId: retry.userId, unitId: retry.unitId, ledgerEntryId: retry.ledgerEntryId, amount: retry.amount, message: paid ? "Payment retry succeeded." : "Payment retry submitted to Stripe and is awaiting final confirmation.", metadata: { retryAttemptId: retry.id, paymentIntentId: intent.id, stripeStatus: intent.status, platformFeeSnapshot } });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Payment retry failed.";
      if (owner?.id) {
        await recordPaymentTransaction({
          source: PaymentTransactionSource.PAYMENT_RETRY,
          status: PaymentTransactionStatus.FAILED,
          ledgerEntryId: retry.ledgerEntryId,
          unitId: retry.unitId,
          tenantUserId: retry.userId,
          landlordUserId: owner.id,
          grossAmount: retry.amount,
          paymentMethod: PaymentMethod.ACH,
          stripePaymentStatus: "failed",
          idempotencyKey: `payment-retry-${retry.id}`,
          failureReason: message,
          metadata: { retryAttemptId: retry.id }
        }).catch(() => null);
      }
      await prisma.paymentRetryAttempt.update({ where: { id: retry.id }, data: { status: PaymentRetryAttemptStatus.FAILED, processedAt: new Date(), failureReason: message } });
      await recordPaymentEvent({ type: PaymentEventType.PAYMENT_RETRY_FAILED, userId: retry.userId, unitId: retry.unitId, ledgerEntryId: retry.ledgerEntryId, amount: retry.amount, message, metadata: { retryAttemptId: retry.id } });
      await scheduleRetryForFailedPayment({ userId: retry.userId, unitId: retry.unitId, amount: retry.amount, ledgerEntryId: retry.ledgerEntryId, scheduledPaymentId: retry.scheduledPaymentId, stripePaymentMethodId: retry.backupPaymentMethodId || retry.stripePaymentMethodId, reason: message });
    }
  }
  return { processed, failed, skipped };
}

export async function processDueAutoPay(runAt = new Date()) {
  const enrollments = await prisma.autoPayEnrollment.findMany({
    where: { status: AutoPayEnrollmentStatus.ACTIVE, nextRunDate: { lte: runAt } },
    take: 25,
    orderBy: { nextRunDate: "asc" },
    include: { unit: { include: { ledgerEntries: { where: { status: { not: LedgerEntryStatus.VOIDED }, type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] }, stripePaymentStatus: { not: "paid" } }, orderBy: [{ dueDate: "asc" }, { postedAt: "asc" }], take: 1 } } } }
  });
  let scheduled = 0;
  for (const enrollment of enrollments) {
    const charge = enrollment.unit.ledgerEntries[0];
    const nextRunDate = nextMonthlyRunDate(enrollment.dayOfMonth, runAt);
    if (!charge) {
      await prisma.autoPayEnrollment.update({ where: { id: enrollment.id }, data: { nextRunDate } });
      continue;
    }
    const amount = charge.amount;
    if (enrollment.amountLimit && amount > enrollment.amountLimit) {
      await recordPaymentEvent({ type: PaymentEventType.PAYMENT_FAILED, userId: enrollment.userId, unitId: enrollment.unitId, ledgerEntryId: charge.id, amount, message: "Autopay skipped because the charge exceeded the renter's amount limit." });
      await prisma.autoPayEnrollment.update({ where: { id: enrollment.id }, data: { failureCount: { increment: 1 }, nextRunDate } });
      continue;
    }
    await prisma.scheduledPayment.create({ data: { userId: enrollment.userId, unitId: enrollment.unitId, ledgerEntryId: charge.id, stripePaymentMethodId: enrollment.stripePaymentMethodId, amount, scheduledFor: runAt, isAutopay: true } });
    await prisma.autoPayEnrollment.update({ where: { id: enrollment.id }, data: { lastRunDate: runAt, nextRunDate } });
    scheduled += 1;
  }
  return { scheduled };
}

export async function createFinancialAdjustment(input: { actorUserId: string; unitId: string; ledgerEntryId?: string | null; type: FinancialAdjustmentType; amount: number; reason: string }) {
  if (input.amount <= 0) throw new Error("Adjustment amount must be greater than zero.");
  const entry = input.ledgerEntryId ? await prisma.ledgerEntry.findUnique({ where: { id: input.ledgerEntryId } }) : null;
  const ledgerType = input.type === FinancialAdjustmentType.MANUAL_CHARGE || input.type === FinancialAdjustmentType.RENT_ADJUSTMENT ? LedgerEntryType.ADJUSTMENT : LedgerEntryType.CREDIT;
  const created = await prisma.$transaction(async (tx) => {
    const ledger = await tx.ledgerEntry.create({ data: { unitId: input.unitId, tenantUserId: entry?.tenantUserId, applicationId: entry?.applicationId, type: ledgerType, status: LedgerEntryStatus.POSTED, paymentMethod: PaymentMethod.OTHER, amount: input.amount, description: input.type.replaceAll("_", " ").toLowerCase(), memo: input.reason, createdById: input.actorUserId, dueDate: ledgerType === LedgerEntryType.ADJUSTMENT ? new Date() : undefined, paidAt: ledgerType === LedgerEntryType.CREDIT ? new Date() : undefined } });
    const adjustment = await tx.financialAdjustment.create({ data: { type: input.type, unitId: input.unitId, ledgerEntryId: ledger.id, actorUserId: input.actorUserId, tenantUserId: entry?.tenantUserId, amount: input.amount, reason: input.reason } });
    return { ledger, adjustment };
  });
  await recordPaymentEvent({ type: PaymentEventType.FINANCIAL_ADJUSTMENT_CREATED, userId: entry?.tenantUserId, unitId: input.unitId, ledgerEntryId: created.ledger.id, amount: input.amount, message: `Financial adjustment created: ${input.reason}`, metadata: { adjustmentId: created.adjustment.id, adjustmentType: input.type } });
  return created;
}

export async function createStripeRefundForLedgerPayment(input: { actorUserId: string; ledgerEntryId: string; amount: number; reason: string }) {
  if (input.amount <= 0) throw new Error("Refund amount must be greater than zero.");
  const payment = await prisma.ledgerEntry.findUnique({ where: { id: input.ledgerEntryId }, include: { unit: true } });
  if (!payment || payment.type !== LedgerEntryType.PAYMENT || !payment.stripePaymentIntentId) throw new Error("Only Stripe-backed payment ledger entries can be refunded from this workflow.");
  if (!stripePaymentsEnabled()) throw new Error("Stripe payments are not configured.");
  const stripe = getStripe();
  const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: input.amount, metadata: { ledgerEntryId: payment.id, actorUserId: input.actorUserId } }, { idempotencyKey: `ledger-refund-${payment.id}-${input.amount}` });
  const created = await prisma.$transaction(async (tx) => {
    const credit = await tx.ledgerEntry.create({ data: { unitId: payment.unitId, tenantUserId: payment.tenantUserId, applicationId: payment.applicationId, type: LedgerEntryType.CREDIT, status: LedgerEntryStatus.POSTED, paymentMethod: PaymentMethod.OTHER, amount: input.amount, description: `Refund - ${payment.description}`, memo: input.reason, createdById: input.actorUserId, paidAt: new Date(), stripePaymentStatus: "refund_pending" } });
    const adjustment = await tx.financialAdjustment.create({ data: { type: FinancialAdjustmentType.REFUND, unitId: payment.unitId, ledgerEntryId: credit.id, actorUserId: input.actorUserId, tenantUserId: payment.tenantUserId, amount: input.amount, reason: input.reason, stripeRefundId: refund.id, stripePaymentIntentId: payment.stripePaymentIntentId } });
    return { credit, adjustment };
  });
  await recordPaymentEvent({ type: PaymentEventType.REFUND_REQUESTED, userId: payment.tenantUserId, unitId: payment.unitId, ledgerEntryId: created.credit.id, amount: input.amount, message: "Refund requested through Stripe.", metadata: { refundId: refund.id, adjustmentId: created.adjustment.id } });
  return created;
}

export async function generateOwnerStatement(input: { ownerUserId: string; periodStart: Date; periodEnd: Date; unitId?: string | null; generatedById?: string | null }) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { unit: { property: { ownerId: input.ownerUserId }, id: input.unitId ?? undefined }, status: { not: LedgerEntryStatus.VOIDED }, postedAt: { gte: input.periodStart, lte: input.periodEnd } },
    include: { unit: { include: { property: true } } },
    orderBy: { postedAt: "asc" }
  });
  const grossCharges = entries.filter((entry) => entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT).reduce((sum, entry) => sum + entry.amount, 0);
  const collectedPayments = entries.filter((entry) => entry.type === LedgerEntryType.PAYMENT).reduce((sum, entry) => sum + entry.amount, 0);
  const creditsAndRefunds = entries.filter((entry) => entry.type === LedgerEntryType.CREDIT).reduce((sum, entry) => sum + entry.amount, 0);
  const outstandingBalance = Math.max(0, grossCharges - collectedPayments - creditsAndRefunds);
  const existingStatement = await prisma.ownerStatement.findFirst({ where: { ownerUserId: input.ownerUserId, unitId: input.unitId ?? null, periodStart: input.periodStart, periodEnd: input.periodEnd } });
  const statement = existingStatement
    ? await prisma.ownerStatement.update({ where: { id: existingStatement.id }, data: { grossCharges, collectedPayments, creditsAndRefunds, outstandingBalance, generatedById: input.generatedById ?? undefined } })
    : await prisma.ownerStatement.create({ data: { ownerUserId: input.ownerUserId, unitId: input.unitId ?? undefined, periodStart: input.periodStart, periodEnd: input.periodEnd, grossCharges, collectedPayments, creditsAndRefunds, outstandingBalance, generatedById: input.generatedById ?? undefined, status: OwnerStatementStatus.DRAFT } });
  await prisma.ownerStatementItem.deleteMany({ where: { ownerStatementId: statement.id } });
  if (entries.length) {
    await prisma.ownerStatementItem.createMany({ data: entries.map((entry) => ({ ownerStatementId: statement.id, ledgerEntryId: entry.id, amount: entry.amount, label: `${entry.unit.property.name} #${entry.unit.unitNumber} · ${entry.description}` })), skipDuplicates: true });
  }
  await recordPaymentEvent({ type: PaymentEventType.STATEMENT_GENERATED, userId: input.ownerUserId, unitId: input.unitId, amount: collectedPayments, message: "Owner statement generated.", metadata: { statementId: statement.id, periodStart: input.periodStart.toISOString(), periodEnd: input.periodEnd.toISOString() } });
  return statement;
}

export async function getOwnerStatementSummary(ownerUserId: string) {
  return prisma.ownerStatement.findMany({ where: { ownerUserId }, orderBy: { periodStart: "desc" }, take: 12, include: { unit: { include: { property: true } }, items: { take: 4, include: { ledgerEntry: true } } } });
}
