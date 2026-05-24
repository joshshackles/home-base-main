import { GeneratedDocumentTemplateType, LedgerEntryStatus, LedgerEntryType, MaintenanceRequestStatus, RelatedDocumentRecordType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { ledgerSignedAmount } from "@/lib/ledger";
import type { DocumentDataBuildResult, DocumentFieldRequirement, DocumentGenerationRequest } from "@/lib/document-generation/types";
import { withMissingFields } from "@/lib/document-generation/validation";

const DAY = 24 * 60 * 60 * 1000;

function dateRange(request: DocumentGenerationRequest) {
  const to = request.dateRange?.to ?? new Date();
  const from = request.dateRange?.from ?? new Date(to.getTime() - 30 * DAY);
  return { from, to, label: `${from.toLocaleDateString()} - ${to.toLocaleDateString()}` };
}

function reportFields(extra: DocumentFieldRequirement[] = []): DocumentFieldRequirement[] {
  return [
    { key: "report.dateRange", label: "Date range", sourceRecord: "report", editHref: "/landlord/reports" },
    { key: "report.selection", label: "Property or unit selection", sourceRecord: "report", editHref: "/landlord/reports" },
    { key: "table.rows", label: "Report rows", sourceRecord: "report", editHref: "/landlord/reports" },
    ...extra
  ];
}

function rowTable(title: string, headers: string[], rows: Array<Array<string | number>>) {
  return { title, headers, rows, rowCount: rows.length };
}

function unitAddress(unit: { unitNumber: string; property: { name: string; addressLine: string; city: string; state: string; zip: string } }) {
  return `${unit.property.addressLine}, Unit ${unit.unitNumber}, ${unit.property.city}, ${unit.property.state} ${unit.property.zip}`;
}

function scopeWhere(request: DocumentGenerationRequest, ownerUserId?: string) {
  const where: any = {};
  if (ownerUserId) where.property = { ownerId: ownerUserId, isArchived: false };
  if (request.relatedRecordType === RelatedDocumentRecordType.PROPERTY && request.relatedRecordId) where.propertyId = request.relatedRecordId;
  if (request.relatedRecordType === RelatedDocumentRecordType.UNIT && request.relatedRecordId) where.id = request.relatedRecordId;
  return where;
}

export async function buildRentRollReportData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const range = dateRange(request);
  const units = await prisma.unit.findMany({
    where: scopeWhere(request, ownerUserId),
    include: { property: true, tenantUser: true, ledgerEntries: { where: { status: LedgerEntryStatus.POSTED } } },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    take: 500
  });
  const rows = units.map((unit) => {
    const balance = unit.ledgerEntries.reduce((sum, entry) => sum + ledgerSignedAmount(entry), 0);
    return [unit.property.name, unit.unitNumber, unit.status, unit.tenantUser?.name ?? unit.tenantUser?.email ?? "Vacant", formatCurrency(unit.rentAmount), formatCurrency(balance)];
  });
  const data = {
    report: { title: "Rent Roll Report", dateRange: range.label, selection: request.relatedRecordId ?? "Portfolio", generatedAt: new Date().toISOString() },
    summary: { units: units.length, occupied: units.filter((unit) => unit.status === "OCCUPIED").length, vacant: units.filter((unit) => unit.status === "AVAILABLE").length },
    table: rowTable("Rent roll", ["Property", "Unit", "Status", "Resident", "Rent", "Balance"], rows)
  };
  return withMissingFields({ data, requiredFields: reportFields(), warnings: rows.length === 0 ? ["No units matched the selected filters."] : [], relatedRecords: { propertyId: request.relatedRecordType === "PROPERTY" ? request.relatedRecordId : null, unitId: request.relatedRecordType === "UNIT" ? request.relatedRecordId : null }, suggestedDocumentTitle: "Rent Roll Report" });
}

export async function buildPropertySummaryReportData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const units = await prisma.unit.findMany({
    where: scopeWhere(request, ownerUserId),
    include: { property: true, applications: true, maintenanceRequests: true, inspections: true },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    take: 500
  });
  const rows = units.map((unit) => [unit.property.name, unit.unitNumber, unit.status, unit.marketingStatus, unit.applications.length, unit.maintenanceRequests.length, unit.inspections.length]);
  const data = {
    report: { title: "Property Summary Report", dateRange: dateRange(request).label, selection: request.relatedRecordId ?? "Portfolio", generatedAt: new Date().toISOString() },
    summary: { properties: new Set(units.map((unit) => unit.propertyId)).size, units: units.length, openMaintenance: units.reduce((sum, unit) => sum + unit.maintenanceRequests.length, 0) },
    table: rowTable("Property operations", ["Property", "Unit", "Occupancy", "Listing", "Applications", "Maintenance", "Inspections"], rows)
  };
  return withMissingFields({ data, requiredFields: reportFields(), warnings: rows.length === 0 ? ["No property/unit data matched the selected filters."] : [], relatedRecords: { propertyId: request.relatedRecordType === "PROPERTY" ? request.relatedRecordId : null }, suggestedDocumentTitle: "Property Summary Report" });
}

export async function buildTenantStatementData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const range = dateRange(request);
  const where: any = { postedAt: { gte: range.from, lte: range.to } };
  if (ownerUserId) where.unit = { property: { ownerId: ownerUserId } };
  if (request.relatedRecordType === RelatedDocumentRecordType.TENANT && request.relatedRecordId) where.tenantUserId = request.relatedRecordId;
  if (request.relatedRecordType === RelatedDocumentRecordType.UNIT && request.relatedRecordId) where.unitId = request.relatedRecordId;
  const entries = await prisma.ledgerEntry.findMany({ where, include: { unit: { include: { property: true } }, tenantUser: true }, orderBy: { postedAt: "asc" }, take: 500 });
  const rows = entries.map((entry) => [entry.postedAt.toLocaleDateString(), `${entry.unit.property.name} #${entry.unit.unitNumber}`, entry.tenantUser?.name ?? entry.tenantUser?.email ?? "Unit ledger", entry.type, entry.description, formatCurrency(ledgerSignedAmount(entry))]);
  const balance = entries.reduce((sum, entry) => sum + ledgerSignedAmount(entry), 0);
  const data = {
    report: { title: "Tenant Rent Ledger", dateRange: range.label, selection: request.relatedRecordId ?? "Portfolio", generatedAt: new Date().toISOString() },
    tenant: { legalName: entries[0]?.tenantUser?.name ?? entries[0]?.tenantUser?.email ?? "" },
    summary: { entries: entries.length, balance: formatCurrency(balance) },
    table: rowTable("Ledger entries", ["Date", "Unit", "Account", "Type", "Description", "Signed Amount"], rows)
  };
  return withMissingFields({ data, requiredFields: reportFields([{ key: "tenant.legalName", label: "Tenant name", sourceRecord: "tenant", editHref: "/landlord/residents" }]), warnings: rows.length === 0 ? ["No ledger entries matched the selected filters."] : [], relatedRecords: { tenantId: request.relatedRecordType === "TENANT" ? request.relatedRecordId : null, unitId: request.relatedRecordType === "UNIT" ? request.relatedRecordId : null }, suggestedDocumentTitle: "Tenant Rent Ledger" });
}

export const buildRentLedgerReportData = buildTenantStatementData;

export async function buildMaintenanceReportData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const range = dateRange(request);
  const where: any = { createdAt: { gte: range.from, lte: range.to } };
  if (ownerUserId) where.unit = { property: { ownerId: ownerUserId } };
  if (request.relatedRecordType === RelatedDocumentRecordType.UNIT && request.relatedRecordId) where.unitId = request.relatedRecordId;
  if (request.relatedRecordType === RelatedDocumentRecordType.MAINTENANCE && request.relatedRecordId) where.id = request.relatedRecordId;
  const requests = await prisma.maintenanceRequest.findMany({ where, include: { unit: { include: { property: true } }, requester: true, assignedTo: true }, orderBy: { createdAt: "desc" }, take: 500 });
  const rows = requests.map((item) => [item.subject, item.unit ? `${item.unit.property.name} #${item.unit.unitNumber}` : "Portfolio", item.priority, item.status, item.requester.name ?? item.requester.email, item.assignedTo?.name ?? item.assignedTo?.email ?? "Unassigned"]);
  const data = {
    report: { title: "Maintenance Summary Report", dateRange: range.label, selection: request.relatedRecordId ?? "Portfolio", generatedAt: new Date().toISOString() },
    summary: { open: requests.filter((item) => item.status !== MaintenanceRequestStatus.COMPLETED && item.status !== MaintenanceRequestStatus.CANCELLED).length, total: requests.length },
    table: rowTable("Maintenance requests", ["Subject", "Unit", "Priority", "Status", "Submitted By", "Assigned To"], rows)
  };
  return withMissingFields({ data, requiredFields: reportFields(), warnings: rows.length === 0 ? ["No maintenance records matched the selected filters."] : [], relatedRecords: { unitId: request.relatedRecordType === "UNIT" ? request.relatedRecordId : null, maintenanceId: request.relatedRecordType === "MAINTENANCE" ? request.relatedRecordId : null }, suggestedDocumentTitle: "Maintenance Summary Report" });
}

export async function buildInspectionReportData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const where: any = {};
  if (ownerUserId) where.unit = { property: { ownerId: ownerUserId } };
  if (request.relatedRecordType === RelatedDocumentRecordType.INSPECTION && request.relatedRecordId) where.id = request.relatedRecordId;
  if (request.relatedRecordType === RelatedDocumentRecordType.UNIT && request.relatedRecordId) where.unitId = request.relatedRecordId;
  const inspections = await prisma.inspection.findMany({ where, include: { unit: { include: { property: true } }, checklistItems: true }, orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }], take: 100 });
  const inspection = inspections[0];
  const data = {
    report: { title: "Inspection Report", dateRange: dateRange(request).label, selection: request.relatedRecordId ?? "Portfolio", generatedAt: new Date().toISOString() },
    inspection: inspection ? { id: inspection.id, status: inspection.status, summary: inspection.resultSummary ?? inspection.notes ?? "" } : {},
    unit: inspection ? { address: unitAddress(inspection.unit) } : {},
    table: rowTable("Inspection checklist", ["Item", "Status", "Notes"], inspection?.checklistItems.map((item) => [item.label, item.status, item.notes ?? ""]) ?? [])
  };
  return withMissingFields({ data, requiredFields: [{ key: "inspection.id", label: "Inspection record", sourceRecord: "inspection", editHref: "/landlord/inspections" }, { key: "unit.address", label: "Unit address", sourceRecord: "unit", editHref: "/landlord/inventory" }], warnings: inspections.length === 0 ? ["No inspection matched the selected filters."] : [], relatedRecords: { inspectionId: inspection?.id ?? (request.relatedRecordType === "INSPECTION" ? request.relatedRecordId : null), unitId: inspection?.unitId ?? (request.relatedRecordType === "UNIT" ? request.relatedRecordId : null) }, suggestedDocumentTitle: "Inspection Report" });
}

export async function buildLeaseDocumentData(request: DocumentGenerationRequest, ownerUserId?: string): Promise<DocumentDataBuildResult> {
  const application = request.relatedRecordType === RelatedDocumentRecordType.APPLICANT && request.relatedRecordId
    ? await prisma.application.findFirst({ where: { id: request.relatedRecordId, ...(ownerUserId ? { unit: { property: { ownerId: ownerUserId } } } : {}) }, include: { unit: { include: { property: { include: { owner: true } }, tenantUser: true } }, applicationDetail: true, leasePackets: { orderBy: { createdAt: "desc" }, take: 1 } } })
    : null;
  const unit = !application && request.relatedRecordType === RelatedDocumentRecordType.UNIT && request.relatedRecordId
    ? await prisma.unit.findFirst({ where: { id: request.relatedRecordId, ...(ownerUserId ? { property: { ownerId: ownerUserId } } : {}) }, include: { property: { include: { owner: true } }, tenantUser: true, currentApplication: { include: { applicationDetail: true, leasePackets: { orderBy: { createdAt: "desc" }, take: 1 } } } } })
    : application?.unit ?? null;
  const currentApplication = application ?? ("currentApplication" in (unit ?? {}) ? (unit as { currentApplication?: typeof application | null }).currentApplication ?? null : null);
  const leasePacket = currentApplication?.leasePackets?.[0] ?? null;
  const data = {
    report: { title: "Generated Lease Draft", generatedAt: new Date().toISOString(), selection: unit?.id ?? currentApplication?.id ?? "" },
    landlord: { legalEntity: unit?.property.owner?.name ?? unit?.property.owner?.email ?? "" },
    tenant: { legalName: currentApplication?.applicantName ?? unit?.tenantUser?.name ?? unit?.tenantUser?.email ?? "" },
    unit: unit ? { address: unitAddress(unit), propertyName: unit.property.name, unitNumber: unit.unitNumber } : {},
    lease: {
      startDate: leasePacket?.leaseStartDate?.toLocaleDateString() ?? unit?.availableOn?.toLocaleDateString() ?? "",
      endDate: leasePacket?.leaseEndDate?.toLocaleDateString() ?? "",
      rentAmount: leasePacket?.monthlyRent ?? unit?.rentAmount ?? null,
      depositAmount: leasePacket?.securityDeposit ?? unit?.deposit ?? null,
      utilities: unit?.utilitiesNote ?? "",
      lateFeePolicy: unit?.leaseTermsNote?.includes("late") ? unit.leaseTermsNote : "",
      occupants: currentApplication?.applicantName ? [currentApplication.applicantName] : [],
      pets: unit?.petPolicy ?? ""
    },
    signatures: { required: ["Tenant", "Landlord"] },
    legalReviewNotice: "Placeholder lease language requires legal and state-specific review before final use."
  };
  return withMissingFields({
    data,
    requiredFields: [
      { key: "tenant.legalName", label: "Tenant legal name", sourceRecord: "tenant", editHref: "/landlord/residents" },
      { key: "unit.address", label: "Unit address", sourceRecord: "unit", editHref: "/landlord/inventory" },
      { key: "lease.startDate", label: "Lease start date", sourceRecord: "lease", editHref: "/landlord/leases" },
      { key: "lease.endDate", label: "Lease end date", sourceRecord: "lease", editHref: "/landlord/leases" },
      { key: "lease.rentAmount", label: "Rent amount", sourceRecord: "unit", editHref: "/landlord/inventory" },
      { key: "lease.depositAmount", label: "Deposit amount", sourceRecord: "unit", editHref: "/landlord/inventory" },
      { key: "landlord.legalEntity", label: "Landlord legal entity", sourceRecord: "landlord", editHref: "/landlord/settings" },
      { key: "lease.utilities", label: "Utility responsibility", sourceRecord: "unit", editHref: "/landlord/inventory" },
      { key: "lease.lateFeePolicy", label: "Late fee policy", sourceRecord: "unit", editHref: "/landlord/inventory" },
      { key: "signatures.required", label: "Required signatures", sourceRecord: "lease", editHref: "/landlord/leases" }
    ],
    warnings: ["Generated lease drafts are workflow documents only until reviewed by counsel for state-specific language."],
    relatedRecords: { propertyId: unit?.propertyId ?? null, unitId: unit?.id ?? null, applicantId: currentApplication?.id ?? null, tenantId: unit?.tenantUserId ?? null, leaseId: leasePacket?.id ?? null },
    suggestedDocumentTitle: unit ? `Lease Draft - ${unit.property.name} #${unit.unitNumber}` : "Generated Lease Draft"
  });
}

export const buildLeaseRenewalDocumentData = buildLeaseDocumentData;
export const buildOwnerStatementReportData = buildPropertySummaryReportData;
export const buildUnitSummaryReportData = buildPropertySummaryReportData;
export const buildApplicationPacketData = buildLeaseDocumentData;
export const buildDocumentComplianceReportData = buildPropertySummaryReportData;

export async function buildDocumentData(request: DocumentGenerationRequest, ownerUserId?: string) {
  switch (request.templateType) {
    case GeneratedDocumentTemplateType.LEASE:
    case GeneratedDocumentTemplateType.LEASE_RENEWAL:
      return buildLeaseDocumentData(request, ownerUserId);
    case GeneratedDocumentTemplateType.RENT_LEDGER:
    case GeneratedDocumentTemplateType.TENANT_STATEMENT:
      return buildTenantStatementData(request, ownerUserId);
    case GeneratedDocumentTemplateType.MAINTENANCE_REPORT:
      return buildMaintenanceReportData(request, ownerUserId);
    case GeneratedDocumentTemplateType.INSPECTION_REPORT:
      return buildInspectionReportData(request, ownerUserId);
    case GeneratedDocumentTemplateType.RENT_ROLL:
      return buildRentRollReportData(request, ownerUserId);
    case GeneratedDocumentTemplateType.APPLICATION_PACKET:
      return buildApplicationPacketData(request, ownerUserId);
    default:
      return buildPropertySummaryReportData(request, ownerUserId);
  }
}
