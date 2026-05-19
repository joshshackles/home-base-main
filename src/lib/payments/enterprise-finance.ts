import { AccountingExportType, CreditReportingStatus, FinancialRiskLevel, LedgerEntryType, SecurityDepositStatus, VendorPayoutStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function monthBounds(month?: string) {
  const now = new Date();
  const [year, rawMonth] = month?.split("-").map(Number) ?? [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(Date.UTC(year, (rawMonth || 1) - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end, label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}` };
}

export async function getEnterpriseFinanceCenter(ownerUserId: string, month?: string) {
  const { start, end, label } = monthBounds(month);
  const [units, disputes, vendorPayouts, deposits, exports, creditRecords, insights, ledgerEntries] = await Promise.all([
    prisma.unit.findMany({
      where: { property: { ownerId: ownerUserId } },
      select: { id: true, unitNumber: true, rentAmount: true, tenantUserId: true, property: { select: { name: true } } },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
    }),
    prisma.paymentDispute.findMany({ where: { ownerUserId }, orderBy: [{ status: "asc" }, { evidenceDueBy: "asc" }], take: 20, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, ledgerEntry: { select: { description: true, amount: true } } } }),
    prisma.vendorPayout.findMany({ where: { ownerUserId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 20, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, vendor: { select: { name: true, email: true } }, maintenanceRequest: { select: { subject: true } } } }),
    prisma.securityDepositAccount.findMany({ where: { unit: { property: { ownerId: ownerUserId } } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 20, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, tenantUser: { select: { name: true, email: true } } } }),
    prisma.accountingExport.findMany({ where: { ownerUserId }, orderBy: { createdAt: "desc" }, take: 12, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } } } }),
    prisma.creditReportingRecord.findMany({ where: { unit: { property: { ownerId: ownerUserId } } }, orderBy: [{ status: "asc" }, { period: "desc" }], take: 20, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, tenantUser: { select: { name: true, email: true } } } }),
    prisma.financialInsightSnapshot.findMany({ where: { ownerUserId }, orderBy: { createdAt: "desc" }, take: 10, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } } } }),
    prisma.ledgerEntry.findMany({ where: { unit: { property: { ownerId: ownerUserId } }, postedAt: { gte: start, lt: end } }, select: { id: true, type: true, amount: true, status: true, paidAt: true, dueDate: true, description: true, unitId: true, tenantUserId: true }, orderBy: { postedAt: "desc" } })
  ]);

  const grossCharges = ledgerEntries.filter((entry) => entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT).reduce((sum, entry) => sum + entry.amount, 0);
  const received = ledgerEntries.filter((entry) => entry.type === LedgerEntryType.PAYMENT || entry.type === LedgerEntryType.CREDIT).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const payableVendorStatuses: VendorPayoutStatus[] = [VendorPayoutStatus.DRAFT, VendorPayoutStatus.APPROVAL_REQUIRED, VendorPayoutStatus.APPROVED, VendorPayoutStatus.PROCESSING];
  const pendingVendor = vendorPayouts.filter((payout) => payableVendorStatuses.includes(payout.status)).reduce((sum, payout) => sum + payout.amount, 0);
  const depositsHeld = deposits.filter((deposit) => deposit.status === SecurityDepositStatus.HELD || deposit.status === SecurityDepositStatus.PARTIALLY_RELEASED).reduce((sum, deposit) => sum + deposit.amountHeld - deposit.amountReleased, 0);
  const openDisputes = disputes.filter((dispute) => dispute.status === "NEEDS_RESPONSE" || dispute.status === "UNDER_REVIEW").length;
  const creditReady = creditRecords.filter((record) => record.status === CreditReportingStatus.READY).length;

  return { month: label, units, disputes, vendorPayouts, deposits, exports, creditRecords, insights, ledgerEntries, metrics: { grossCharges, received, outstanding: grossCharges - received, pendingVendor, depositsHeld, openDisputes, creditReady } };
}

export async function generateFinancialInsights(ownerUserId: string) {
  const units = await prisma.unit.findMany({
    where: { property: { ownerId: ownerUserId } },
    select: { id: true, rentAmount: true, ledgerEntries: { select: { type: true, amount: true, dueDate: true, paidAt: true } } }
  });

  const created = [];
  for (const unit of units) {
    const openBalance = unit.ledgerEntries.reduce((sum, entry) => {
      if (entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT) return sum + entry.amount;
      if (entry.type === LedgerEntryType.PAYMENT || entry.type === LedgerEntryType.CREDIT) return sum - Math.abs(entry.amount);
      return sum;
    }, 0);
    const overdueCount = unit.ledgerEntries.filter((entry) => entry.dueDate && entry.dueDate < new Date() && !entry.paidAt && (entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT)).length;
    const score = Math.max(0, Math.min(100, Math.round(openBalance / 1000) + overdueCount * 20));
    const riskLevel = score >= 80 ? FinancialRiskLevel.CRITICAL : score >= 55 ? FinancialRiskLevel.HIGH : score >= 25 ? FinancialRiskLevel.MEDIUM : FinancialRiskLevel.LOW;
    const recommendation = riskLevel === FinancialRiskLevel.LOW ? "Portfolio cashflow is stable for this unit." : riskLevel === FinancialRiskLevel.MEDIUM ? "Review open balance and send a friendly payment reminder." : riskLevel === FinancialRiskLevel.HIGH ? "Prioritize collection outreach and confirm autopay/payment method status." : "Escalate this account for immediate review before additional services are approved.";
    created.push(await prisma.financialInsightSnapshot.create({ data: { ownerUserId, unitId: unit.id, score, riskLevel, delinquentBalance: openBalance, projectedCashflow: unit.rentAmount - Math.max(openBalance, 0), recommendation, reasons: { overdueCount, openBalance } } }));
  }
  return created;
}

export async function createAccountingExportRecord(input: { ownerUserId: string; generatedById?: string; unitId?: string | null; type: AccountingExportType; periodStart: Date; periodEnd: Date; fileName: string; rowCount: number; totalAmount: number }) {
  return prisma.accountingExport.create({ data: input });
}
