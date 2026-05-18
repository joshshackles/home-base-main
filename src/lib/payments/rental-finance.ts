import { AutoPayEnrollmentStatus, LedgerEntryStatus, LedgerEntryType, LateFeeMode, PaymentEventType, PaymentMethod, PaymentRetryAttemptStatus, ScheduledPaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function clampRentDay(day: number) {
  if (!Number.isFinite(day)) return 1;
  return Math.min(Math.max(Math.trunc(day), 1), 28);
}

export function calculateLateFee(input: { amount: number; dueDate?: Date | null; graceDays: number; mode: LateFeeMode; lateFeeAmount: number; dailyLateFee?: number; maxLateFee?: number | null; asOf?: Date }) {
  const asOf = input.asOf ?? new Date();
  if (!input.dueDate || input.mode === LateFeeMode.NONE) return 0;
  const due = new Date(input.dueDate.getFullYear(), input.dueDate.getMonth(), input.dueDate.getDate() + Math.max(0, input.graceDays));
  const daysLate = Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / 86400000));
  if (daysLate <= 0) return 0;
  let fee = 0;
  if (input.mode === LateFeeMode.FLAT) fee = input.lateFeeAmount;
  if (input.mode === LateFeeMode.PERCENT) fee = Math.round(input.amount * (input.lateFeeAmount / 100));
  if (input.mode === LateFeeMode.DAILY_FLAT) fee = input.lateFeeAmount + daysLate * Math.max(0, input.dailyLateFee ?? 0);
  return input.maxLateFee ? Math.min(fee, input.maxLateFee) : fee;
}

export async function getTenantPaymentCenter(userId: string) {
  const [methods, schedules, events, openCharges, autopayEnrollments, retryAttempts] = await Promise.all([
    prisma.renterPaymentMethod.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    prisma.scheduledPayment.findMany({ where: { userId, status: { in: [ScheduledPaymentStatus.SCHEDULED, ScheduledPaymentStatus.PROCESSING] } }, orderBy: { scheduledFor: "asc" }, include: { unit: { include: { property: true } }, ledgerEntry: true } }),
    prisma.paymentEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12, include: { unit: { include: { property: true } }, ledgerEntry: true } }),
    prisma.ledgerEntry.findMany({ where: { tenantUserId: userId, status: { not: LedgerEntryStatus.VOIDED }, type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] }, stripePaymentStatus: { not: "paid" } }, orderBy: [{ dueDate: "asc" }, { postedAt: "desc" }], include: { unit: { include: { property: true, rentBillingPolicy: true } } } }),
    prisma.autoPayEnrollment.findMany({ where: { userId, status: { in: [AutoPayEnrollmentStatus.ACTIVE, AutoPayEnrollmentStatus.PAUSED] } }, orderBy: [{ status: "asc" }, { nextRunDate: "asc" }], include: { unit: { include: { property: true, rentBillingPolicy: true } } } }),
    prisma.paymentRetryAttempt.findMany({ where: { userId, status: { in: [PaymentRetryAttemptStatus.SCHEDULED, PaymentRetryAttemptStatus.PROCESSING] } }, orderBy: { nextAttemptAt: "asc" }, include: { unit: { include: { property: true } }, ledgerEntry: true } })
  ]);
  return { methods, schedules, events, openCharges, autopayEnrollments, retryAttempts };
}

export async function getLandlordPaymentOperations(landlordUserId: string) {
  const units = await prisma.unit.findMany({
    where: { property: { ownerId: landlordUserId } },
    include: { property: true, rentBillingPolicy: true, ledgerEntries: { where: { status: { not: LedgerEntryStatus.VOIDED } }, orderBy: { postedAt: "desc" }, take: 20 }, scheduledPayments: { where: { status: { in: [ScheduledPaymentStatus.SCHEDULED, ScheduledPaymentStatus.PROCESSING] } }, orderBy: { scheduledFor: "asc" }, take: 5 } }
  });
  const entries = units.flatMap((unit) => unit.ledgerEntries.map((entry) => ({ ...entry, unit })));
  const received = entries.filter((entry) => entry.type === LedgerEntryType.PAYMENT || entry.type === LedgerEntryType.CREDIT).reduce((sum, entry) => sum + entry.amount, 0);
  const charges = entries.filter((entry) => entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT).reduce((sum, entry) => sum + entry.amount, 0);
  const outstanding = Math.max(0, charges - received);
  const scheduled = units.reduce((sum, unit) => sum + unit.scheduledPayments.reduce((inner, item) => inner + item.amount, 0), 0);
  const autopayCount = units.reduce((sum, unit) => sum + unit.scheduledPayments.filter((item) => item.isAutopay).length, 0);
  const [autopayEnrollments, retries, statements, adjustments] = await Promise.all([
    prisma.autoPayEnrollment.findMany({ where: { unit: { property: { ownerId: landlordUserId } } }, orderBy: { nextRunDate: "asc" }, take: 20, include: { user: true, unit: { include: { property: true } } } }),
    prisma.paymentRetryAttempt.findMany({ where: { unit: { property: { ownerId: landlordUserId } }, status: { in: [PaymentRetryAttemptStatus.SCHEDULED, PaymentRetryAttemptStatus.PROCESSING, PaymentRetryAttemptStatus.FAILED] } }, orderBy: { nextAttemptAt: "asc" }, take: 20, include: { user: true, unit: { include: { property: true } }, ledgerEntry: true } }),
    prisma.ownerStatement.findMany({ where: { ownerUserId: landlordUserId }, orderBy: { periodStart: "desc" }, take: 8, include: { unit: { include: { property: true } } } }),
    prisma.financialAdjustment.findMany({ where: { unit: { property: { ownerId: landlordUserId } } }, orderBy: { createdAt: "desc" }, take: 8, include: { unit: { include: { property: true } } } })
  ]);
  return { units, entries, received, charges, outstanding, scheduled, autopayCount, autopayEnrollments, retries, statements, adjustments };
}

export async function recordPaymentEvent(input: { type: PaymentEventType; message: string; userId?: string | null; unitId?: string | null; ledgerEntryId?: string | null; stripeEventId?: string | null; amount?: number | null; metadata?: Record<string, unknown> }) {
  if (input.stripeEventId) {
    const existing = await prisma.paymentEvent.findUnique({ where: { stripeEventId: input.stripeEventId }, select: { id: true } });
    if (existing) return existing;
  }
  return prisma.paymentEvent.create({ data: { type: input.type, message: input.message, userId: input.userId ?? undefined, unitId: input.unitId ?? undefined, ledgerEntryId: input.ledgerEntryId ?? undefined, stripeEventId: input.stripeEventId ?? undefined, amount: input.amount ?? undefined, metadata: input.metadata as Prisma.InputJsonValue | undefined } });
}

export async function applyLateFeeForEntry(ledgerEntryId: string, actorUserId?: string) {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: ledgerEntryId }, include: { unit: { include: { rentBillingPolicy: true } } } });
  if (!entry || entry.status === LedgerEntryStatus.VOIDED || (entry.type !== LedgerEntryType.CHARGE && entry.type !== LedgerEntryType.ADJUSTMENT)) return null;
  const policy = entry.unit.rentBillingPolicy;
  if (!policy) return null;
  const fee = calculateLateFee({ amount: entry.amount, dueDate: entry.dueDate, graceDays: policy.graceDays, mode: policy.lateFeeMode, lateFeeAmount: policy.lateFeeAmount, dailyLateFee: policy.dailyLateFee, maxLateFee: policy.maxLateFee });
  if (fee <= 0) return null;
  const existing = await prisma.ledgerEntry.findFirst({ where: { unitId: entry.unitId, tenantUserId: entry.tenantUserId, type: LedgerEntryType.ADJUSTMENT, memo: { contains: `Late fee for ${entry.id}` } } });
  if (existing) return existing;
  const created = await prisma.ledgerEntry.create({ data: { applicationId: entry.applicationId, unitId: entry.unitId, tenantUserId: entry.tenantUserId, type: LedgerEntryType.ADJUSTMENT, status: LedgerEntryStatus.POSTED, amount: fee, description: `Late fee - ${entry.description}`, memo: `Late fee for ${entry.id}`, dueDate: new Date(), createdById: actorUserId, paymentMethod: PaymentMethod.OTHER } });
  await recordPaymentEvent({ type: PaymentEventType.LATE_FEE_APPLIED, userId: entry.tenantUserId, unitId: entry.unitId, ledgerEntryId: created.id, amount: fee, message: "Late fee applied from the unit billing policy." });
  return created;
}
