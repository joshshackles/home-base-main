"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccountingExportType, CreditReportingStatus, SecurityDepositStatus, VendorPayoutStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthBounds, generateFinancialInsights, createAccountingExportRecord } from "@/lib/payments/enterprise-finance";

function dollarsToCents(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Invalid amount.");
  return Math.round(parsed * 100);
}

function text(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function createVendorPayoutAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const unitId = text(formData.get("unitId"));
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { ownerId: user.userId } }, select: { id: true } });
  if (!unit) throw new Error("Unit not found or not authorized.");
  await prisma.vendorPayout.create({
    data: {
      ownerUserId: user.userId,
      unitId,
      amount: dollarsToCents(formData.get("amount")),
      description: text(formData.get("description"), "Vendor payout request"),
      status: VendorPayoutStatus.APPROVAL_REQUIRED
    }
  });
  revalidatePath("/landlord/payments/enterprise");
  redirect("/landlord/payments/enterprise?vendor=created");
}

export async function approveVendorPayoutAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const id = text(formData.get("id"));
  await prisma.vendorPayout.updateMany({
    where: { id, ownerUserId: user.userId, status: { in: [VendorPayoutStatus.DRAFT, VendorPayoutStatus.APPROVAL_REQUIRED] } },
    data: { status: VendorPayoutStatus.APPROVED, approvedById: user.userId, approvedAt: new Date() }
  });
  revalidatePath("/landlord/payments/enterprise");
}

export async function createSecurityDepositAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const unitId = text(formData.get("unitId"));
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { ownerId: user.userId } }, select: { id: true, tenantUserId: true } });
  if (!unit) throw new Error("Unit not found or not authorized.");
  await prisma.securityDepositAccount.create({
    data: {
      unitId,
      tenantUserId: unit.tenantUserId,
      amountRequired: dollarsToCents(formData.get("amountRequired")),
      amountHeld: dollarsToCents(formData.get("amountHeld")),
      status: dollarsToCents(formData.get("amountHeld")) > 0 ? SecurityDepositStatus.HELD : SecurityDepositStatus.DUE,
      reconciliationNotes: text(formData.get("notes"), "") || null
    }
  });
  revalidatePath("/landlord/payments/enterprise");
  redirect("/landlord/payments/enterprise?deposit=created");
}

export async function reconcileSecurityDepositAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const id = text(formData.get("id"));
  const amountReleased = dollarsToCents(formData.get("amountReleased"));
  const deductions = dollarsToCents(formData.get("deductions"));
  const existing = await prisma.securityDepositAccount.findFirst({ where: { id, unit: { property: { ownerId: user.userId } } }, select: { amountHeld: true } });
  if (!existing) throw new Error("Deposit not found or not authorized.");
  const remaining = existing.amountHeld - amountReleased - deductions;
  await prisma.securityDepositAccount.update({
    where: { id },
    data: { amountReleased, deductions, status: remaining <= 0 ? SecurityDepositStatus.RELEASED : SecurityDepositStatus.PARTIALLY_RELEASED, releasedAt: remaining <= 0 ? new Date() : null, reconciliationNotes: text(formData.get("notes"), "") || null }
  });
  revalidatePath("/landlord/payments/enterprise");
}

export async function generateAccountingExportAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const type = text(formData.get("type"), AccountingExportType.QUICKBOOKS_CSV) as AccountingExportType;
  const { start, end, label } = monthBounds(text(formData.get("month")) || undefined);
  const unitId = text(formData.get("unitId")) || null;
  const entries = await prisma.ledgerEntry.findMany({ where: { unit: { property: { ownerId: user.userId } }, ...(unitId ? { unitId } : {}), postedAt: { gte: start, lt: end } }, select: { amount: true } });
  await createAccountingExportRecord({ ownerUserId: user.userId, generatedById: user.userId, unitId, type, periodStart: start, periodEnd: end, fileName: `${type.toLowerCase()}-${label}.csv`, rowCount: entries.length, totalAmount: entries.reduce((sum, entry) => sum + entry.amount, 0) });
  revalidatePath("/landlord/payments/enterprise");
  redirect("/landlord/payments/enterprise?export=created");
}

export async function generateCreditReportingRecordsAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const { start, end, label } = monthBounds(text(formData.get("month")) || undefined);
  const charges = await prisma.ledgerEntry.findMany({
    where: { unit: { property: { ownerId: user.userId } }, tenantUserId: { not: null }, dueDate: { gte: start, lt: end }, type: "CHARGE" },
    select: { id: true, tenantUserId: true, unitId: true, amount: true, dueDate: true, paidAt: true }
  });
  for (const charge of charges) {
    if (!charge.tenantUserId) continue;
    await prisma.creditReportingRecord.upsert({
      where: { tenantUserId_unitId_period: { tenantUserId: charge.tenantUserId, unitId: charge.unitId, period: label } },
      create: { tenantUserId: charge.tenantUserId, unitId: charge.unitId, ledgerEntryId: charge.id, period: label, amountDue: charge.amount, amountPaid: charge.paidAt ? charge.amount : 0, paidOnTime: Boolean(charge.paidAt && charge.dueDate && charge.paidAt <= charge.dueDate), status: CreditReportingStatus.READY },
      update: { ledgerEntryId: charge.id, amountDue: charge.amount, amountPaid: charge.paidAt ? charge.amount : 0, paidOnTime: Boolean(charge.paidAt && charge.dueDate && charge.paidAt <= charge.dueDate), status: CreditReportingStatus.READY }
    });
  }
  revalidatePath("/landlord/payments/enterprise");
  redirect("/landlord/payments/enterprise?credit=generated");
}

export async function refreshFinancialInsightsAction() {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  await generateFinancialInsights(user.userId);
  revalidatePath("/landlord/payments/enterprise");
  redirect("/landlord/payments/enterprise?insights=refreshed");
}
