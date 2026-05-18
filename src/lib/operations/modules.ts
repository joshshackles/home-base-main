import { ComplianceRecordStatus, IntegrationConnectionStatus, MaintenanceAssetStatus, ScreeningRequestStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function money(cents?: number | null) {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ownerUnitWhere(ownerId?: string): Prisma.UnitWhereInput {
  return ownerId ? { property: { ownerId, isArchived: false } } : {};
}

export async function getApplicantScreeningModule(ownerId?: string) {
  const applicationWhere: Prisma.ApplicationWhereInput = ownerId ? { unit: { property: { ownerId, isArchived: false } } } : {};
  const screeningWhere: Prisma.ApplicantScreeningWhereInput = ownerId ? { application: { unit: { property: { ownerId, isArchived: false } } } } : {};
  const packageWhere: Prisma.ScreeningPackageWhereInput = ownerId ? { OR: [{ ownerId }, { ownerId: null }] } : {};
  const [applications, screenings, packages, income, rentalHistory, references, background] = await Promise.all([
    prisma.application.findMany({ where: applicationWhere, include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, applicantUser: { select: { name: true, email: true } } }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.applicantScreening.findMany({ where: screeningWhere, include: { application: { select: { applicantName: true, applicantEmail: true } }, package: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.screeningPackage.findMany({ where: packageWhere, orderBy: [{ isActive: "desc" }, { name: "asc" }], take: 20 }),
    prisma.incomeVerification.count({ where: ownerId ? { application: applicationWhere } : {} }),
    prisma.rentalHistoryVerification.count({ where: ownerId ? { application: applicationWhere } : {} }),
    prisma.screeningReference.count({ where: ownerId ? { application: applicationWhere } : {} }),
    prisma.backgroundCheckRequest.count({ where: ownerId ? { application: applicationWhere } : {} })
  ]);
  const pending = screenings.filter((item) => [ScreeningRequestStatus.ORDERED, ScreeningRequestStatus.IN_PROGRESS, ScreeningRequestStatus.NEEDS_REVIEW].includes(item.status)).length;
  return { applications, screenings, packages, counts: { applications: applications.length, screenings: screenings.length, pending, income, rentalHistory, references, background } };
}

export async function getMaintenanceInventoryModule(ownerId?: string) {
  const assetWhere: Prisma.MaintenanceAssetWhereInput = ownerId ? { OR: [{ ownerId }, { unit: ownerUnitWhere(ownerId) }, { property: { ownerId } }] } : {};
  const [assets, serviceRecords, warranties, keyLocks, units] = await Promise.all([
    prisma.maintenanceAsset.findMany({ where: assetWhere, include: { property: { select: { name: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } }, warranties: { orderBy: { expiresAt: "asc" }, take: 1 }, serviceRecords: { orderBy: { serviceDate: "desc" }, take: 1 } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 60 }),
    prisma.assetServiceRecord.findMany({ where: ownerId ? { asset: assetWhere } : {}, include: { asset: { select: { name: true, type: true } } }, orderBy: { serviceDate: "desc" }, take: 25 }),
    prisma.assetWarranty.findMany({ where: ownerId ? { asset: assetWhere } : {}, include: { asset: { select: { name: true } } }, orderBy: { expiresAt: "asc" }, take: 25 }),
    prisma.keyLockRecord.findMany({ where: ownerId ? { asset: assetWhere } : {}, include: { asset: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 25 }),
    prisma.unit.findMany({ where: ownerUnitWhere(ownerId), select: { id: true, unitNumber: true, property: { select: { name: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 200 })
  ]);
  return { assets, serviceRecords, warranties, keyLocks, units, counts: { assets: assets.length, needsService: assets.filter((a) => a.status === MaintenanceAssetStatus.NEEDS_SERVICE).length, warranties: warranties.length, keys: keyLocks.length } };
}

export async function getInsuranceComplianceModule(ownerId?: string) {
  const policyWhere: Prisma.InsurancePolicyWhereInput = ownerId ? { OR: [{ ownerId }, { unit: ownerUnitWhere(ownerId) }, { property: { ownerId } }] } : {};
  const certWhere: Prisma.CertificationRecordWhereInput = ownerId ? { OR: [{ ownerId }, { unit: ownerUnitWhere(ownerId) }, { property: { ownerId } }] } : {};
  const inspectionWhere: Prisma.ComplianceInspectionRequirementWhereInput = ownerId ? { OR: [{ unit: ownerUnitWhere(ownerId) }, { property: { ownerId } }] } : {};
  const propertyWhere: Prisma.PropertyWhereInput = ownerId ? { ownerId, isArchived: false } : { isArchived: false };
  const applicationWhere: Prisma.ApplicationWhereInput = ownerId ? { unit: { property: { ownerId, isArchived: false } } } : {};
  const [policies, certifications, requirements, properties, units, applications] = await Promise.all([
    prisma.insurancePolicy.findMany({ where: policyWhere, include: { property: { select: { name: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } }, application: { select: { applicantName: true, applicantEmail: true } } }, orderBy: [{ status: "desc" }, { expiresAt: "asc" }], take: 60 }),
    prisma.certificationRecord.findMany({ where: certWhere, include: { property: { select: { name: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } } }, orderBy: [{ status: "desc" }, { expiresAt: "asc" }], take: 60 }),
    prisma.complianceInspectionRequirement.findMany({ where: inspectionWhere, include: { property: { select: { name: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } } }, orderBy: [{ status: "desc" }, { nextDueAt: "asc" }], take: 60 }),
    prisma.property.findMany({ where: propertyWhere, select: { id: true, name: true, addressLine: true, city: true, state: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.unit.findMany({ where: ownerUnitWhere(ownerId), select: { id: true, unitNumber: true, property: { select: { name: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 200 }),
    prisma.application.findMany({ where: applicationWhere, select: { id: true, applicantName: true, applicantEmail: true, unit: { select: { unitNumber: true, property: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" }, take: 200 })
  ]);
  const risky = [...policies, ...certifications, ...requirements].filter((item) => [ComplianceRecordStatus.EXPIRED, ComplianceRecordStatus.EXPIRING_SOON, ComplianceRecordStatus.MISSING].includes(item.status)).length;
  return { policies, certifications, requirements, properties, units, applications, counts: { policies: policies.length, certifications: certifications.length, requirements: requirements.length, risky } };
}

export async function getIntegrationsHubModule(ownerId?: string) {
  const connectionWhere: Prisma.IntegrationConnectionWhereInput = ownerId ? { OR: [{ ownerId }, { ownerId: null }] } : {};
  const [connections, events] = await Promise.all([
    prisma.integrationConnection.findMany({ where: connectionWhere, orderBy: [{ status: "asc" }, { provider: "asc" }], take: 80 }),
    prisma.integrationEvent.findMany({ where: ownerId ? { OR: [{ actorId: ownerId }, { connection: connectionWhere }] } : {}, include: { connection: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 40 })
  ]);
  const connected = connections.filter((item) => item.status === IntegrationConnectionStatus.CONNECTED).length;
  const errors = connections.filter((item) => item.status === IntegrationConnectionStatus.ERROR).length;
  return { connections, events, counts: { connections: connections.length, connected, errors, providers: new Set(connections.map((item) => item.provider)).size } };
}
