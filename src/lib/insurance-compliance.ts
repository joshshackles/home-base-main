import { ComplianceRecordStatus, InsurancePolicyType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function insuranceCompliancePaths(base: "admin" | "landlord" = "admin") {
  return [`/${base}/compliance`, `/${base}/operations`, `/${base}`];
}

function text(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${key} must be ${max} characters or fewer.`);
  return trimmed;
}

function requiredText(formData: FormData, key: string, label: string, max = 240) {
  const value = text(formData, key, max);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key, 40);
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date.`);
  return date;
}

function optionalInt(formData: FormData, key: string) {
  const value = text(formData, key, 20);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} must be a positive number.`);
  return parsed;
}

function optionalCents(formData: FormData, key: string) {
  const value = text(formData, key, 40);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} must be a valid positive amount.`);
  return Math.round(parsed * 100);
}

function optionalEnum<T extends Record<string, string>>(formData: FormData, key: string, values: T, fallback: T[keyof T]) {
  const value = formData.get(key);
  return typeof value === "string" && Object.values(values).includes(value) ? (value as T[keyof T]) : fallback;
}

function connection(field: string, id: string | null | undefined) {
  return id ? { [field]: { connect: { id } } } : {};
}

async function assertPortfolioAccess(options: { ownerId?: string; propertyId?: string | null; unitId?: string | null; applicationId?: string | null }) {
  if (!options.ownerId) return;
  if (options.propertyId) {
    const property = await prisma.property.findFirst({ where: { id: options.propertyId, ownerId: options.ownerId, isArchived: false }, select: { id: true } });
    if (!property) throw new Error("Selected property was not found in this portfolio.");
  }
  if (options.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: options.unitId, property: { ownerId: options.ownerId, isArchived: false } }, select: { id: true } });
    if (!unit) throw new Error("Selected rental was not found in this portfolio.");
  }
  if (options.applicationId) {
    const application = await prisma.application.findFirst({ where: { id: options.applicationId, unit: { property: { ownerId: options.ownerId, isArchived: false } } }, select: { id: true } });
    if (!application) throw new Error("Selected application was not found in this portfolio.");
  }
}

export async function createInsurancePolicyFromForm(formData: FormData, options: { ownerId?: string }) {
  const propertyId = text(formData, "propertyId", 80);
  const unitId = text(formData, "unitId", 80);
  const applicationId = text(formData, "applicationId", 80);
  await assertPortfolioAccess({ ownerId: options.ownerId, propertyId, unitId, applicationId });

  const payload: Prisma.InsurancePolicyCreateInput = {
    type: optionalEnum(formData, "type", InsurancePolicyType, InsurancePolicyType.RENTERS),
    status: optionalEnum(formData, "status", ComplianceRecordStatus, ComplianceRecordStatus.MISSING),
    providerName: text(formData, "providerName", 160),
    policyNumber: text(formData, "policyNumber", 160),
    coverageAmountCents: optionalCents(formData, "coverageAmount"),
    effectiveAt: optionalDate(formData, "effectiveAt"),
    expiresAt: optionalDate(formData, "expiresAt"),
    documentUrl: text(formData, "documentUrl", 500),
    notes: text(formData, "notes", 2000),
    ...(options.ownerId ? { owner: { connect: { id: options.ownerId } } } : {}),
    ...connection("property", propertyId),
    ...connection("unit", unitId),
    ...connection("application", applicationId)
  };
  return prisma.insurancePolicy.create({ data: payload });
}

export async function createCertificationRecordFromForm(formData: FormData, options: { ownerId?: string }) {
  const propertyId = text(formData, "propertyId", 80);
  const unitId = text(formData, "unitId", 80);
  await assertPortfolioAccess({ ownerId: options.ownerId, propertyId, unitId });
  return prisma.certificationRecord.create({
    data: {
      name: requiredText(formData, "name", "Certification name", 180),
      status: optionalEnum(formData, "status", ComplianceRecordStatus, ComplianceRecordStatus.MISSING),
      issuingAuthority: text(formData, "issuingAuthority", 180),
      certificateNumber: text(formData, "certificateNumber", 180),
      issuedAt: optionalDate(formData, "issuedAt"),
      expiresAt: optionalDate(formData, "expiresAt"),
      documentUrl: text(formData, "documentUrl", 500),
      notes: text(formData, "notes", 2000),
      ...(options.ownerId ? { owner: { connect: { id: options.ownerId } } } : {}),
      ...connection("property", propertyId),
      ...connection("unit", unitId)
    }
  });
}

export async function createComplianceInspectionRequirementFromForm(formData: FormData, options: { ownerId?: string }) {
  const propertyId = text(formData, "propertyId", 80);
  const unitId = text(formData, "unitId", 80);
  await assertPortfolioAccess({ ownerId: options.ownerId, propertyId, unitId });
  return prisma.complianceInspectionRequirement.create({
    data: {
      name: requiredText(formData, "name", "Requirement name", 180),
      status: optionalEnum(formData, "status", ComplianceRecordStatus, ComplianceRecordStatus.MISSING),
      requiredEveryMonths: optionalInt(formData, "requiredEveryMonths"),
      lastCompletedAt: optionalDate(formData, "lastCompletedAt"),
      nextDueAt: optionalDate(formData, "nextDueAt"),
      notes: text(formData, "notes", 2000),
      ...connection("property", propertyId),
      ...connection("unit", unitId)
    }
  });
}
