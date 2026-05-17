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
