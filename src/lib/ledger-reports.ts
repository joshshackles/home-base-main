import { LedgerEntryType } from "@prisma/client";
import { agingBucket, agingBucketKey, ledgerBalance, ledgerSignedAmount } from "@/lib/ledger";

export type LedgerEntryForReport = {
  id: string;
  applicationId: string | null;
  tenantUserId: string | null;
  unitId: string;
  type: string;
  status: string;
  paymentMethod?: string | null;
  amount: number;
  description: string;
  memo?: string | null;
  dueDate?: Date | null;
  paidAt?: Date | null;
  postedAt: Date;
  voidedAt?: Date | null;
  voidReason?: string | null;
  application?: { id: string; applicantName: string; applicantEmail: string; status: string } | null;
  tenantUser?: { id: string; name: string | null; email: string } | null;
  unit: { id: string; unitNumber: string; property: { id: string; name: string; addressLine: string; city: string; state: string; zip: string } };
};

export function accountName(entry: LedgerEntryForReport) {
  return entry.application?.applicantName || entry.tenantUser?.name || entry.tenantUser?.email || "Unit ledger";
}

export function accountEmail(entry: LedgerEntryForReport) {
  return entry.application?.applicantEmail || entry.tenantUser?.email || "";
}

export function unitLabel(entry: LedgerEntryForReport) {
  return `${entry.unit.property.name} Unit ${entry.unit.unitNumber}`;
}

export function balanceRowsByAccount(entries: LedgerEntryForReport[]) {
  const groups = new Map<string, LedgerEntryForReport[]>();
  for (const entry of entries) {
    const key = entry.applicationId || entry.tenantUserId || entry.unitId;
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  return Array.from(groups.entries()).map(([key, related]) => {
    const seed = related[0];
    const balance = ledgerBalance(related.map((entry) => ({ type: entry.type as LedgerEntryType, status: entry.status as any, amount: entry.amount })));
    const oldestCharge = related
      .filter((entry) => entry.status !== "VOIDED" && (entry.type === "CHARGE" || entry.type === "ADJUSTMENT"))
      .sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0];
    return {
      key,
      seed,
      entries: related,
      balance,
      oldestCharge,
      agingBucket: agingBucket(oldestCharge?.dueDate),
      agingBucketKey: agingBucketKey(oldestCharge?.dueDate)
    };
  });
}

export function ledgerCsvRows(entries: LedgerEntryForReport[]) {
  return entries.map((entry) => [
    entry.id,
    entry.postedAt,
    entry.dueDate || "",
    entry.paidAt || "",
    accountName(entry),
    accountEmail(entry),
    entry.applicationId || "",
    entry.tenantUserId || "",
    entry.unit.property.name,
    entry.unit.unitNumber,
    entry.type,
    entry.status,
    entry.paymentMethod || "",
    entry.description,
    entry.memo || "",
    entry.amount,
    ledgerSignedAmount({ type: entry.type as LedgerEntryType, status: entry.status as any, amount: entry.amount }),
    entry.voidedAt || "",
    entry.voidReason || ""
  ]);
}

export const ledgerCsvHeaders = [
  "Ledger ID",
  "Posted At",
  "Due Date",
  "Paid At",
  "Account Name",
  "Account Email",
  "Application ID",
  "Tenant User ID",
  "Property",
  "Unit",
  "Type",
  "Status",
  "Payment Method",
  "Description",
  "Memo",
  "Amount",
  "Signed Amount",
  "Voided At",
  "Void Reason"
];

export function agingCsvRows(entries: LedgerEntryForReport[]) {
  return balanceRowsByAccount(entries)
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .map((row) => [
      row.key,
      accountName(row.seed),
      accountEmail(row.seed),
      row.seed.unit.property.name,
      row.seed.unit.unitNumber,
      row.oldestCharge?.description || "",
      row.oldestCharge?.dueDate || "",
      row.agingBucket,
      row.balance
    ]);
}

export const agingCsvHeaders = ["Account Key", "Account Name", "Email", "Property", "Unit", "Oldest Charge", "Oldest Due Date", "Aging Bucket", "Balance"];
