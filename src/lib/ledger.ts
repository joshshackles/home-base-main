import type { LedgerEntryStatus, LedgerEntryType, RecurringChargeSchedule } from "@prisma/client";

export function ledgerSignedAmount(entry: { type: LedgerEntryType; status: LedgerEntryStatus; amount: number }) {
  if (entry.status === "VOIDED") return 0;
  if (entry.type === "PAYMENT" || entry.type === "CREDIT") return -entry.amount;
  return entry.amount;
}

export function ledgerBalance(entries: Array<{ type: LedgerEntryType; status: LedgerEntryStatus; amount: number }>) {
  return entries.reduce((total, entry) => total + ledgerSignedAmount(entry), 0);
}

export function ledgerTypeLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function ledgerStatusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function safeMonthlyDueDate(year: number, month: number, dayOfMonth: number) {
  const day = Math.min(Math.max(dayOfMonth, 1), 28);
  return new Date(year, month, day);
}

export function nextMonthlyRunDate(fromDate: Date, dayOfMonth: number) {
  const safeDay = Math.min(Math.max(dayOfMonth, 1), 28);
  const currentMonthDue = safeMonthlyDueDate(fromDate.getFullYear(), fromDate.getMonth(), safeDay);
  if (currentMonthDue > fromDate) return currentMonthDue;
  return safeMonthlyDueDate(fromDate.getFullYear(), fromDate.getMonth() + 1, safeDay);
}

export function advanceMonthlyRunDate(runDate: Date, dayOfMonth: number) {
  return safeMonthlyDueDate(runDate.getFullYear(), runDate.getMonth() + 1, dayOfMonth);
}

export function isScheduleDue(schedule: Pick<RecurringChargeSchedule, "isActive" | "nextRunDate" | "endDate">, runThroughDate: Date) {
  if (!schedule.isActive) return false;
  if (schedule.endDate && schedule.nextRunDate > schedule.endDate) return false;
  return schedule.nextRunDate <= runThroughDate;
}

export function agingBucket(dueDate: Date | null | undefined, now = new Date()) {
  if (!dueDate) return "No due date";
  const days = Math.floor((monthStart(now).getTime() - monthStart(dueDate).getTime()) / 86400000);
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
}

export function agingBucketKey(dueDate: Date | null | undefined, now = new Date()) {
  if (!dueDate) return "no_due_date";
  const days = Math.floor((monthStart(now).getTime() - monthStart(dueDate).getTime()) / 86400000);
  if (days <= 0) return "current";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_plus";
}

export function paymentPlanStatusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function installmentStatusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function addMonthsSafe(date: Date, months: number, dayOfMonth: number) {
  return safeMonthlyDueDate(date.getFullYear(), date.getMonth() + months, dayOfMonth);
}

export function plannedInstallmentCount(totalAmount: number, installmentAmount: number) {
  if (installmentAmount <= 0) return 0;
  return Math.ceil(totalAmount / installmentAmount);
}

export function recurringChargePeriodKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
