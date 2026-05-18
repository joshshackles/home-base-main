import { LedgerEntryStatus, LedgerEntryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LedgerGroup = {
  type: LedgerEntryType;
  status: LedgerEntryStatus;
  _sum: { amount: number | null };
};

function signedGroupAmount(group: LedgerGroup) {
  if (group.status === "VOIDED") return 0;
  const amount = group._sum.amount ?? 0;
  return group.type === "PAYMENT" || group.type === "CREDIT" ? -amount : amount;
}

export async function ledgerTotals(where: Prisma.LedgerEntryWhereInput = {}) {
  const groups = await prisma.ledgerEntry.groupBy({
    by: ["type", "status"],
    where,
    _sum: { amount: true }
  });

  let charges = 0;
  let payments = 0;
  let balance = 0;

  for (const group of groups) {
    const amount = group._sum.amount ?? 0;
    balance += signedGroupAmount(group);
    if (group.status === "VOIDED") continue;
    if (group.type === "CHARGE" || group.type === "ADJUSTMENT") charges += amount;
    if (group.type === "PAYMENT" || group.type === "CREDIT") payments += amount;
  }

  return { charges, payments, balance };
}

export type LedgerAttentionFilter = "overdue" | "due_soon" | "pending" | "voided";

export function ledgerAttentionWhere(attention: string | null | undefined, now = new Date()): Prisma.LedgerEntryWhereInput {
  const inFourteenDays = new Date(now);
  inFourteenDays.setDate(inFourteenDays.getDate() + 14);

  if (attention === "overdue") {
    return {
      status: { not: LedgerEntryStatus.VOIDED },
      type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] },
      dueDate: { lt: now }
    };
  }

  if (attention === "due_soon") {
    return {
      status: { not: LedgerEntryStatus.VOIDED },
      type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] },
      dueDate: { gte: now, lte: inFourteenDays }
    };
  }

  if (attention === "pending") return { status: LedgerEntryStatus.PENDING };
  if (attention === "voided") return { status: LedgerEntryStatus.VOIDED };
  return {};
}

export async function ledgerOperationsSnapshot(where: Prisma.LedgerEntryWhereInput = {}, now = new Date()) {
  const inFourteenDays = new Date(now);
  inFourteenDays.setDate(inFourteenDays.getDate() + 14);

  const activeChargeWhere: Prisma.LedgerEntryWhereInput = {
    ...where,
    status: { not: LedgerEntryStatus.VOIDED },
    type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] }
  };

  const [totals, overdueCount, overdueAmount, dueSoonCount, pendingCount, voidedCount] = await Promise.all([
    ledgerTotals(where),
    prisma.ledgerEntry.count({ where: { ...activeChargeWhere, dueDate: { lt: now } } }),
    prisma.ledgerEntry.aggregate({ where: { ...activeChargeWhere, dueDate: { lt: now } }, _sum: { amount: true } }),
    prisma.ledgerEntry.count({ where: { ...activeChargeWhere, dueDate: { gte: now, lte: inFourteenDays } } }),
    prisma.ledgerEntry.count({ where: { ...where, status: LedgerEntryStatus.PENDING } }),
    prisma.ledgerEntry.count({ where: { ...where, status: LedgerEntryStatus.VOIDED } })
  ]);

  const collectionRate = totals.charges > 0 ? Math.round((totals.payments / totals.charges) * 100) : 100;

  return {
    ...totals,
    overdueCount,
    overdueAmount: overdueAmount._sum.amount ?? 0,
    dueSoonCount,
    pendingCount,
    voidedCount,
    collectionRate
  };
}
