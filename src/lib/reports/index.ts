import { ApplicationStatus, ComplianceRecordStatus, InspectionStatus, LeadStatus, LedgerEntryStatus, LedgerEntryType, MaintenanceRequestStatus, MessageThreadStatus, Prisma, UnitStatus, VendorInvoiceStatus, VendorPayoutStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { ledgerSignedAmount } from "@/lib/ledger";

export type ReportScope = { role: "admin" } | { role: "landlord"; ownerUserId: string };
export type ReportSection =
  | "overview"
  | "financial"
  | "occupancy"
  | "delinquency"
  | "cash_flow"
  | "leasing"
  | "lead_conversion"
  | "application_funnel"
  | "maintenance"
  | "maintenance_cost"
  | "vendor_performance"
  | "inspection_compliance"
  | "communications";

export type ReportFilters = {
  from: Date;
  to: Date;
  section: ReportSection;
  rentalId?: string;
  propertyId?: string;
};

export type ReportMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
};

export type ReportTable = {
  title: string;
  description: string;
  headers: string[];
  rows: Array<Array<string | number>>;
};

export type ReportChartPoint = { label: string; value: number; detail?: string };

export type ReportsDashboardDTO = {
  scopeLabel: string;
  filters: ReportFilters;
  metrics: ReportMetric[];
  financial: {
    collected: number;
    charges: number;
    outstanding: number;
    overdue: number;
    collectionRate: number;
    trend: ReportChartPoint[];
  };
  occupancy: {
    totalRentals: number;
    occupied: number;
    available: number;
    pending: number;
    unavailable: number;
    archived: number;
    occupancyRate: number;
    rows: ReportTable;
  };
  delinquency: {
    overdueBalance: number;
    overdueCount: number;
    delinquencyRate: number;
    rows: ReportTable;
  };
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
    rows: ReportTable;
  };
  leasing: {
    leads: number;
    applications: number;
    approved: number;
    submitted: number;
    conversionRate: number;
    statusRows: ReportChartPoint[];
    recentRows: ReportTable;
  };
  leadConversion: {
    leads: number;
    contacted: number;
    applicationStarted: number;
    closed: number;
    conversionRate: number;
    rows: ReportTable;
  };
  applicationFunnel: {
    started: number;
    submitted: number;
    underReview: number;
    approved: number;
    denied: number;
    withdrawn: number;
    rows: ReportTable;
  };
  maintenance: {
    open: number;
    completed: number;
    urgent: number;
    averageResolutionDays: number | null;
    statusRows: ReportChartPoint[];
    recentRows: ReportTable;
  };
  maintenanceCost: {
    invoiceTotal: number;
    payoutTotal: number;
    averageCost: number;
    rows: ReportTable;
  };
  vendorPerformance: {
    activeVendors: number;
    submittedInvoices: number;
    paidPayouts: number;
    averageInvoice: number;
    rows: ReportTable;
  };
  inspectionCompliance: {
    inspectionsDue: number;
    inspectionsPassed: number;
    inspectionsFailed: number;
    complianceRisk: number;
    rows: ReportTable;
  };
  communications: {
    openThreads: number;
    closedThreads: number;
    messages: number;
    internalMessages: number;
    statusRows: ReportChartPoint[];
    recentRows: ReportTable;
  };
  exports: Array<{ label: string; href: string }>;
};

const DAY = 24 * 60 * 60 * 1000;

export function parseReportSection(value?: string | string[] | null): ReportSection {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "financial" ||
    raw === "occupancy" ||
    raw === "delinquency" ||
    raw === "cash_flow" ||
    raw === "leasing" ||
    raw === "lead_conversion" ||
    raw === "application_funnel" ||
    raw === "maintenance" ||
    raw === "maintenance_cost" ||
    raw === "vendor_performance" ||
    raw === "inspection_compliance" ||
    raw === "communications"
  ) return raw;
  return "overview";
}

export function parseReportFilters(searchParams?: Record<string, string | string[] | undefined>): ReportFilters {
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 30 * DAY);
  const fromRaw = getSearchValue(searchParams, "from");
  const toRaw = getSearchValue(searchParams, "to");
  const from = safeDate(fromRaw, startOfDay(defaultFrom));
  const to = endOfDay(safeDate(toRaw, today));
  return {
    from,
    to,
    section: parseReportSection(getSearchValue(searchParams, "section")),
    rentalId: getSearchValue(searchParams, "rentalId") || undefined,
    propertyId: getSearchValue(searchParams, "propertyId") || undefined
  };
}

export function reportQueryString(filters: ReportFilters, overrides: Partial<{ section: ReportSection; format: "csv" | "json" }> = {}) {
  const params = new URLSearchParams();
  params.set("from", toInputDate(filters.from));
  params.set("to", toInputDate(filters.to));
  params.set("section", overrides.section ?? filters.section);
  if (filters.rentalId) params.set("rentalId", filters.rentalId);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (overrides.format) params.set("format", overrides.format);
  return params.toString();
}

export function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSearchValue(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function unitWhere(scope: ReportScope, filters: ReportFilters): Prisma.UnitWhereInput {
  return {
    ...(scope.role === "landlord" ? { property: { ownerId: scope.ownerUserId } } : {}),
    ...(filters.rentalId ? { id: filters.rentalId } : {}),
    ...(filters.propertyId ? { propertyId: filters.propertyId } : {})
  };
}

function ledgerWhere(scope: ReportScope, filters: ReportFilters): Prisma.LedgerEntryWhereInput {
  return {
    postedAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { unit: { property: { ownerId: scope.ownerUserId } } } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function applicationWhere(scope: ReportScope, filters: ReportFilters): Prisma.ApplicationWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { unit: { property: { ownerId: scope.ownerUserId } } } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function leadWhere(scope: ReportScope, filters: ReportFilters): Prisma.LeadWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { unit: { property: { ownerId: scope.ownerUserId } } } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function maintenanceWhere(scope: ReportScope, filters: ReportFilters): Prisma.MaintenanceRequestWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { unit: { property: { ownerId: scope.ownerUserId } } } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function vendorInvoiceWhere(scope: ReportScope, filters: ReportFilters): Prisma.VendorInvoiceWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { ownerUserId: scope.ownerUserId } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function vendorPayoutWhere(scope: ReportScope, filters: ReportFilters): Prisma.VendorPayoutWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { ownerUserId: scope.ownerUserId } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function inspectionWhere(scope: ReportScope, filters: ReportFilters): Prisma.InspectionWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(scope.role === "landlord" ? { unit: { property: { ownerId: scope.ownerUserId } } } : {}),
    ...(filters.rentalId ? { unitId: filters.rentalId } : {}),
    ...(filters.propertyId ? { unit: { propertyId: filters.propertyId } } : {})
  };
}

function complianceRequirementWhere(scope: ReportScope, filters: ReportFilters): Prisma.ComplianceInspectionRequirementWhereInput {
  const and: Prisma.ComplianceInspectionRequirementWhereInput[] = [];
  if (scope.role === "landlord") and.push({ OR: [{ unit: { property: { ownerId: scope.ownerUserId } } }, { property: { ownerId: scope.ownerUserId } }] });
  if (filters.rentalId) and.push({ unitId: filters.rentalId });
  if (filters.propertyId) and.push({ OR: [{ propertyId: filters.propertyId }, { unit: { propertyId: filters.propertyId } }] });
  return and.length ? { AND: and } : {};
}

function threadWhere(scope: ReportScope, filters: ReportFilters): Prisma.MessageThreadWhereInput {
  const and: Prisma.MessageThreadWhereInput[] = [{ createdAt: { gte: filters.from, lte: filters.to } }];
  if (scope.role === "landlord") {
    and.push({ OR: [
      { application: { unit: { property: { ownerId: scope.ownerUserId } } } },
      { maintenanceRequest: { unit: { property: { ownerId: scope.ownerUserId } } } }
    ] });
  }
  if (filters.rentalId) {
    and.push({ OR: [
      { application: { unitId: filters.rentalId } },
      { maintenanceRequest: { unitId: filters.rentalId } }
    ] });
  }
  if (filters.propertyId) {
    and.push({ OR: [
      { application: { unit: { propertyId: filters.propertyId } } },
      { maintenanceRequest: { unit: { propertyId: filters.propertyId } } }
    ] });
  }
  return { AND: and };
}

function messageWhere(scope: ReportScope, filters: ReportFilters): Prisma.MessageWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    thread: threadWhere(scope, filters)
  };
}

export async function getReportFilterOptions(scope: ReportScope) {
  const properties = await prisma.property.findMany({
    where: scope.role === "landlord" ? { ownerId: scope.ownerUserId, isArchived: false } : { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, units: { select: { id: true, unitNumber: true }, orderBy: { unitNumber: "asc" } } }
  });
  return {
    properties: properties.map((property) => ({ id: property.id, label: property.name })),
    rentals: properties.flatMap((property) => property.units.map((unit) => ({ id: unit.id, label: `${property.name} #${unit.unitNumber}` })))
  };
}

export async function getReportsDashboard(scope: ReportScope, filters: ReportFilters): Promise<ReportsDashboardDTO> {
  const unitScope = unitWhere(scope, filters);
  const ledgerScope = ledgerWhere(scope, filters);
  const appScope = applicationWhere(scope, filters);
  const maintScope = maintenanceWhere(scope, filters);
  const vendorInvoiceScope = vendorInvoiceWhere(scope, filters);
  const vendorPayoutScope = vendorPayoutWhere(scope, filters);
  const inspectionScope = inspectionWhere(scope, filters);
  const complianceScope = complianceRequirementWhere(scope, filters);
  const msgThreadScope = threadWhere(scope, filters);
  const msgScope = messageWhere(scope, filters);
  const leadsScope = leadWhere(scope, filters);

  const [
    totalRentals,
    occupied,
    available,
    pending,
    unavailable,
    archived,
    charges,
    payments,
    overdueEntries,
    leads,
    applications,
    approvedApplications,
    submittedApplications,
    recentApplications,
    openMaintenance,
    completedMaintenance,
    urgentMaintenance,
    completedMaintenanceRows,
    recentMaintenance,
    openThreads,
    closedThreads,
    messageCount,
    internalMessageCount,
    recentThreads,
    ledgerRows,
    propertyRows,
    leadRows,
    applicationRows,
    delinquencyRows,
    vendorInvoiceRows,
    vendorPayoutRows,
    activeVendors,
    inspectionRows,
    complianceRows
  ] = await Promise.all([
    prisma.unit.count({ where: unitScope }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.OCCUPIED } }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.AVAILABLE } }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.PENDING } }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.UNAVAILABLE } }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.ARCHIVED } }),
    prisma.ledgerEntry.findMany({ where: { ...ledgerScope, status: { not: LedgerEntryStatus.VOIDED }, type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] } }, select: { amount: true, type: true, status: true, dueDate: true, postedAt: true } }),
    prisma.ledgerEntry.findMany({ where: { ...ledgerScope, status: { not: LedgerEntryStatus.VOIDED }, type: { in: [LedgerEntryType.PAYMENT, LedgerEntryType.CREDIT] } }, select: { amount: true, type: true, status: true, postedAt: true } }),
    prisma.ledgerEntry.findMany({ where: { ...ledgerScope, status: LedgerEntryStatus.POSTED, type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] }, dueDate: { lt: new Date() } }, select: { amount: true, type: true, status: true } }),
    prisma.lead.count({ where: leadsScope }),
    prisma.application.count({ where: appScope }),
    prisma.application.count({ where: { ...appScope, status: ApplicationStatus.APPROVED } }),
    prisma.application.count({ where: { ...appScope, status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED] } } }),
    prisma.application.findMany({ where: appScope, orderBy: { createdAt: "desc" }, take: 8, include: { unit: { include: { property: true } } } }),
    prisma.maintenanceRequest.count({ where: { ...maintScope, status: { notIn: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED] } } }),
    prisma.maintenanceRequest.count({ where: { ...maintScope, status: MaintenanceRequestStatus.COMPLETED } }),
    prisma.maintenanceRequest.count({ where: { ...maintScope, priority: "URGENT", status: { notIn: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED] } } }),
    prisma.maintenanceRequest.findMany({ where: { ...maintScope, status: MaintenanceRequestStatus.COMPLETED, completedAt: { not: null } }, select: { createdAt: true, completedAt: true }, take: 200 }),
    prisma.maintenanceRequest.findMany({ where: maintScope, orderBy: { createdAt: "desc" }, take: 8, include: { unit: { include: { property: true } }, requester: true, assignedTo: true } }),
    prisma.messageThread.count({ where: { ...msgThreadScope, status: { not: MessageThreadStatus.CLOSED } } }),
    prisma.messageThread.count({ where: { ...msgThreadScope, status: MessageThreadStatus.CLOSED } }),
    prisma.message.count({ where: msgScope }),
    prisma.message.count({ where: { ...msgScope, isInternal: true } }),
    prisma.messageThread.findMany({ where: msgThreadScope, orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 8, include: { application: { include: { unit: { include: { property: true } } } }, maintenanceRequest: { include: { unit: { include: { property: true } } } }, messages: { select: { id: true }, take: 1 } } }),
    prisma.ledgerEntry.findMany({ where: ledgerScope, orderBy: { postedAt: "desc" }, take: 500, include: { unit: { include: { property: true } }, tenantUser: true, application: true } }),
    prisma.property.findMany({ where: scope.role === "landlord" ? { ownerId: scope.ownerUserId } : {}, orderBy: { name: "asc" }, include: { units: true } }),
    prisma.lead.findMany({ where: leadsScope, orderBy: { createdAt: "desc" }, take: 500, include: { unit: { include: { property: true } }, application: { select: { id: true, status: true } } } }),
    prisma.application.findMany({ where: appScope, orderBy: { createdAt: "desc" }, take: 500, include: { unit: { include: { property: true } }, lead: { select: { id: true, status: true } } } }),
    prisma.ledgerEntry.findMany({ where: { ...ledgerScope, status: LedgerEntryStatus.POSTED, type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] }, dueDate: { lt: new Date() } }, orderBy: { dueDate: "asc" }, take: 200, include: { unit: { include: { property: true } }, tenantUser: true, application: true } }),
    prisma.vendorInvoice.findMany({ where: vendorInvoiceScope, orderBy: { createdAt: "desc" }, take: 300, include: { vendor: true, vendorProfile: true, unit: { include: { property: true } }, maintenanceRequest: true } }),
    prisma.vendorPayout.findMany({ where: vendorPayoutScope, orderBy: { createdAt: "desc" }, take: 300, include: { vendor: true, unit: { include: { property: true } }, maintenanceRequest: true } }),
    prisma.vendorProfile.count({ where: scope.role === "landlord" ? { ownerUserId: scope.ownerUserId, isActive: true } : { isActive: true } }),
    prisma.inspection.findMany({ where: inspectionScope, orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }], take: 300, include: { unit: { include: { property: true } }, assignedTo: true } }),
    prisma.complianceInspectionRequirement.findMany({ where: complianceScope, orderBy: [{ nextDueAt: "asc" }, { updatedAt: "desc" }], take: 300, include: { property: true, unit: { include: { property: true } } } })
  ]);

  const chargeTotal = charges.reduce((sum, entry) => sum + Math.max(0, ledgerSignedAmount(entry)), 0);
  const paymentTotal = Math.abs(payments.reduce((sum, entry) => sum + Math.min(0, ledgerSignedAmount(entry)), 0));
  const outstanding = Math.max(0, chargeTotal - paymentTotal);
  const overdue = overdueEntries.reduce((sum, entry) => sum + Math.max(0, ledgerSignedAmount(entry)), 0);
  const collectionRate = chargeTotal > 0 ? Math.min(100, Math.round((paymentTotal / chargeTotal) * 100)) : 100;
  const occupancyRate = totalRentals > 0 ? Math.round((occupied / totalRentals) * 100) : 0;
  const conversionRate = leads > 0 ? Math.round((approvedApplications / leads) * 100) : 0;
  const averageResolutionDays = completedMaintenanceRows.length > 0
    ? Math.round((completedMaintenanceRows.reduce((sum, row) => sum + ((row.completedAt?.getTime() ?? row.createdAt.getTime()) - row.createdAt.getTime()) / DAY, 0) / completedMaintenanceRows.length) * 10) / 10
    : null;

  const trend = buildMonthlyTrend(ledgerRows.map((entry) => ({ date: entry.postedAt, value: Math.abs(ledgerSignedAmount(entry)), type: entry.type })));
  const delinquencyBalance = delinquencyRows.reduce((sum, entry) => sum + Math.max(0, ledgerSignedAmount(entry)), 0);
  const delinquencyRate = chargeTotal > 0 ? Math.round((delinquencyBalance / chargeTotal) * 100) : 0;
  const cashInflow = paymentTotal;
  const invoiceTotal = vendorInvoiceRows.filter((invoice) => invoice.status !== VendorInvoiceStatus.CANCELLED && invoice.status !== VendorInvoiceStatus.REJECTED).reduce((sum, invoice) => sum + invoice.amount, 0);
  const payoutTotal = vendorPayoutRows.filter((payout) => payout.status !== VendorPayoutStatus.CANCELLED && payout.status !== VendorPayoutStatus.FAILED).reduce((sum, payout) => sum + payout.amount, 0);
  const cashOutflow = invoiceTotal + payoutTotal;
  const cashNet = cashInflow - cashOutflow;
  const contactedLeads = leadRows.filter((lead) => lead.status === LeadStatus.CONTACTED || lead.status === LeadStatus.APPLICATION_STARTED || Boolean(lead.application)).length;
  const applicationStartedLeads = leadRows.filter((lead) => lead.status === LeadStatus.APPLICATION_STARTED || Boolean(lead.application)).length;
  const closedLeads = leadRows.filter((lead) => lead.status === LeadStatus.CLOSED).length;
  const funnelCounts = Object.values(ApplicationStatus).reduce((accumulator, status) => ({ ...accumulator, [status]: applicationRows.filter((application) => application.status === status).length }), {} as Record<ApplicationStatus, number>);
  const averageMaintenanceCost = vendorInvoiceRows.length > 0 ? Math.round(invoiceTotal / vendorInvoiceRows.length) : 0;
  const paidPayouts = vendorPayoutRows.filter((payout) => payout.status === VendorPayoutStatus.PAID).length;
  const submittedInvoices = vendorInvoiceRows.filter((invoice) => invoice.status === VendorInvoiceStatus.SUBMITTED || invoice.status === VendorInvoiceStatus.APPROVED || invoice.status === VendorInvoiceStatus.PAID).length;
  const averageInvoice = vendorInvoiceRows.length > 0 ? Math.round(invoiceTotal / vendorInvoiceRows.length) : 0;
  const inspectionsPassed = inspectionRows.filter((inspection) => inspection.status === InspectionStatus.PASSED).length;
  const inspectionsFailed = inspectionRows.filter((inspection) => inspection.status === InspectionStatus.FAILED || inspection.status === InspectionStatus.NEEDS_REINSPECTION).length;
  const complianceRiskRows = complianceRows.filter((row) => row.status === ComplianceRecordStatus.MISSING || row.status === ComplianceRecordStatus.EXPIRED || row.status === ComplianceRecordStatus.EXPIRING_SOON || (row.nextDueAt && row.nextDueAt < new Date()));

  return {
    scopeLabel: scope.role === "landlord" ? "Landlord portfolio" : "Platform portfolio",
    filters,
    metrics: [
      { label: "Collected", value: currency(paymentTotal), detail: `${collectionRate}% collection rate`, tone: "green" },
      { label: "Outstanding", value: currency(outstanding), detail: `${currency(overdue)} overdue`, tone: outstanding > 0 ? "amber" : "green" },
      { label: "Occupancy", value: pct(occupancyRate), detail: `${occupied}/${totalRentals} occupied`, tone: occupancyRate >= 90 ? "green" : occupancyRate >= 75 ? "amber" : "red" },
      { label: "Applications", value: applications, detail: `${conversionRate}% lead-to-approval`, tone: "blue" },
      { label: "Cash flow", value: currency(cashNet), detail: `${currency(cashInflow)} in / ${currency(cashOutflow)} out`, tone: cashNet >= 0 ? "green" : "red" },
      { label: "Open maintenance", value: openMaintenance, detail: `${urgentMaintenance} urgent`, tone: urgentMaintenance > 0 ? "red" : openMaintenance > 0 ? "amber" : "green" },
      { label: "Vendor spend", value: currency(invoiceTotal), detail: `${submittedInvoices} submitted invoices`, tone: invoiceTotal > 0 ? "amber" : "slate" },
      { label: "Compliance risk", value: complianceRiskRows.length, detail: `${inspectionsFailed} failed inspections`, tone: complianceRiskRows.length > 0 || inspectionsFailed > 0 ? "red" : "green" },
      { label: "Open threads", value: openThreads, detail: `${messageCount} messages`, tone: openThreads > 0 ? "blue" : "slate" }
    ],
    financial: { collected: paymentTotal, charges: chargeTotal, outstanding, overdue, collectionRate, trend },
    occupancy: {
      totalRentals,
      occupied,
      available,
      pending,
      unavailable,
      archived,
      occupancyRate,
      rows: {
        title: "Property occupancy",
        description: "Rental inventory and occupancy by property group.",
        headers: ["Property", "Rentals", "Occupied", "Available", "Occupancy"],
        rows: propertyRows.map((property) => {
          const count = property.units.length;
          const occupiedCount = property.units.filter((unit) => unit.status === UnitStatus.OCCUPIED).length;
          const availableCount = property.units.filter((unit) => unit.status === UnitStatus.AVAILABLE).length;
          return [property.name, count, occupiedCount, availableCount, count ? pct((occupiedCount / count) * 100) : "0%"];
        })
      }
    },
    delinquency: {
      overdueBalance: delinquencyBalance,
      overdueCount: delinquencyRows.length,
      delinquencyRate,
      rows: {
        title: "Delinquency drilldown",
        description: "Posted charges and adjustments past due in the selected reporting window.",
        headers: ["Rental", "Tenant/applicant", "Due", "Description", "Balance"],
        rows: delinquencyRows.map((entry) => [rentalLabel(entry.unit), entry.tenantUser?.name ?? entry.application?.applicantName ?? "Unassigned", entry.dueDate?.toLocaleDateString() ?? "No due date", entry.description, currency(Math.max(0, ledgerSignedAmount(entry)))])
      }
    },
    cashFlow: {
      inflow: cashInflow,
      outflow: cashOutflow,
      net: cashNet,
      rows: {
        title: "Cash flow drilldown",
        description: "Cash movement from tenant payments, credits, vendor invoices, and vendor payouts.",
        headers: ["Source", "Inflow", "Outflow", "Net", "Detail"],
        rows: [
          ["Tenant payments and credits", currency(cashInflow), "$0", currency(cashInflow), `${payments.length} ledger payment rows`],
          ["Vendor invoices", "$0", currency(invoiceTotal), currency(-invoiceTotal), `${vendorInvoiceRows.length} invoice rows`],
          ["Vendor payouts", "$0", currency(payoutTotal), currency(-payoutTotal), `${vendorPayoutRows.length} payout rows`],
          ["Net cash flow", currency(cashInflow), currency(cashOutflow), currency(cashNet), cashNet >= 0 ? "Positive period" : "Negative period"]
        ]
      }
    },
    leasing: {
      leads,
      applications,
      approved: approvedApplications,
      submitted: submittedApplications,
      conversionRate,
      statusRows: Object.values(ApplicationStatus).map((status) => ({ label: humanize(status), value: recentApplications.filter((application) => application.status === status).length })),
      recentRows: {
        title: "Recent applications",
        description: "Newest leasing activity in the selected date range.",
        headers: ["Applicant", "Rental", "Status", "Created"],
        rows: recentApplications.map((application) => [application.applicantName, rentalLabel(application.unit), humanize(application.status), application.createdAt.toLocaleDateString()])
      }
    },
    leadConversion: {
      leads,
      contacted: contactedLeads,
      applicationStarted: applicationStartedLeads,
      closed: closedLeads,
      conversionRate,
      rows: {
        title: "Lead conversion drilldown",
        description: "Lead status, application linkage, and approval conversion by rental.",
        headers: ["Lead", "Rental", "Lead status", "Application", "Created"],
        rows: leadRows.map((lead) => [lead.name, rentalLabel(lead.unit), humanize(lead.status), lead.application ? humanize(lead.application.status) : "No application", lead.createdAt.toLocaleDateString()])
      }
    },
    applicationFunnel: {
      started: funnelCounts.STARTED ?? 0,
      submitted: funnelCounts.SUBMITTED ?? 0,
      underReview: funnelCounts.UNDER_REVIEW ?? 0,
      approved: funnelCounts.APPROVED ?? 0,
      denied: funnelCounts.DENIED ?? 0,
      withdrawn: funnelCounts.WITHDRAWN ?? 0,
      rows: {
        title: "Application funnel drilldown",
        description: "Application stage movement and source lead status.",
        headers: ["Applicant", "Rental", "Application status", "Lead status", "Updated"],
        rows: applicationRows.map((application) => [application.applicantName, rentalLabel(application.unit), humanize(application.status), application.lead ? humanize(application.lead.status) : "Direct application", application.updatedAt.toLocaleDateString()])
      }
    },
    maintenance: {
      open: openMaintenance,
      completed: completedMaintenance,
      urgent: urgentMaintenance,
      averageResolutionDays,
      statusRows: Object.values(MaintenanceRequestStatus).map((status) => ({ label: humanize(status), value: recentMaintenance.filter((request) => request.status === status).length })),
      recentRows: {
        title: "Recent maintenance",
        description: "Recent work orders and repair requests.",
        headers: ["Subject", "Rental", "Priority", "Status"],
        rows: recentMaintenance.map((request) => [request.subject, request.unit ? rentalLabel(request.unit) : "Portfolio", humanize(request.priority), humanize(request.status)])
      }
    },
    maintenanceCost: {
      invoiceTotal,
      payoutTotal,
      averageCost: averageMaintenanceCost,
      rows: {
        title: "Maintenance cost drilldown",
        description: "Vendor invoice costs tied to maintenance work and rentals.",
        headers: ["Invoice", "Vendor", "Rental", "Status", "Amount"],
        rows: vendorInvoiceRows.map((invoice) => [invoice.invoiceNumber ?? invoice.title, invoice.vendorProfile?.companyName ?? invoice.vendor.name ?? invoice.vendor.email, invoice.unit ? rentalLabel(invoice.unit) : "Portfolio", humanize(invoice.status), currency(invoice.amount)])
      }
    },
    vendorPerformance: {
      activeVendors,
      submittedInvoices,
      paidPayouts,
      averageInvoice,
      rows: {
        title: "Vendor performance drilldown",
        description: "Vendor invoice throughput, payout state, and recent job context.",
        headers: ["Vendor", "Trade/context", "Invoices", "Paid payouts", "Total spend"],
        rows: buildVendorPerformanceRows(vendorInvoiceRows, vendorPayoutRows)
      }
    },
    inspectionCompliance: {
      inspectionsDue: complianceRows.length,
      inspectionsPassed,
      inspectionsFailed,
      complianceRisk: complianceRiskRows.length,
      rows: {
        title: "Inspection compliance drilldown",
        description: "Inspection outcomes and recurring compliance requirements with due-date risk.",
        headers: ["Item", "Rental/property", "Status", "Due/completed", "Notes"],
        rows: [
          ...inspectionRows.map((inspection) => [inspection.inspectorName || "Inspection", rentalLabel(inspection.unit), humanize(inspection.status), (inspection.completedAt ?? inspection.scheduledFor ?? inspection.createdAt).toLocaleDateString(), inspection.resultSummary ?? inspection.notes ?? ""]),
          ...complianceRows.map((requirement) => [requirement.name, requirement.unit ? rentalLabel(requirement.unit) : requirement.property?.name ?? "Portfolio", humanize(requirement.status), requirement.nextDueAt?.toLocaleDateString() ?? requirement.lastCompletedAt?.toLocaleDateString() ?? "No due date", requirement.notes ?? ""])
        ]
      }
    },
    communications: {
      openThreads,
      closedThreads,
      messages: messageCount,
      internalMessages: internalMessageCount,
      statusRows: [
        { label: "Open", value: openThreads },
        { label: "Closed", value: closedThreads },
        { label: "Internal notes", value: internalMessageCount },
        { label: "Resident-visible", value: Math.max(0, messageCount - internalMessageCount) }
      ],
      recentRows: {
        title: "Recent threads",
        description: "Messaging volume and open conversations.",
        headers: ["Subject", "Context", "Status", "Last activity"],
        rows: recentThreads.map((thread) => [thread.subject, threadContext(thread), humanize(thread.status), (thread.lastMessageAt ?? thread.createdAt).toLocaleDateString()])
      }
    },
    exports: []
  };
}

function rentalLabel(unit: { unitNumber: string; property: { name: string } }) {
  return `${unit.property.name} #${unit.unitNumber}`;
}

function threadContext(thread: { application?: { unit: { unitNumber: string; property: { name: string } } } | null; maintenanceRequest?: { unit?: { unitNumber: string; property: { name: string } } | null } | null }) {
  if (thread.application?.unit) return rentalLabel(thread.application.unit);
  if (thread.maintenanceRequest?.unit) return rentalLabel(thread.maintenanceRequest.unit);
  return "General";
}

function buildVendorPerformanceRows(invoices: Array<{ vendorUserId: string; amount: number; status: VendorInvoiceStatus; vendor: { name: string | null; email: string }; vendorProfile: { companyName: string; trade: string } | null }>, payouts: Array<{ vendorUserId: string | null; status: VendorPayoutStatus; vendor: { name: string | null; email: string } | null }>) {
  const vendors = new Map<string, { label: string; trade: string; invoices: number; paidPayouts: number; spend: number }>();
  for (const invoice of invoices) {
    const key = invoice.vendorUserId;
    const existing = vendors.get(key) ?? { label: invoice.vendorProfile?.companyName ?? invoice.vendor.name ?? invoice.vendor.email, trade: invoice.vendorProfile?.trade ?? "Vendor", invoices: 0, paidPayouts: 0, spend: 0 };
    existing.invoices += 1;
    if (invoice.status !== VendorInvoiceStatus.CANCELLED && invoice.status !== VendorInvoiceStatus.REJECTED) existing.spend += invoice.amount;
    vendors.set(key, existing);
  }
  for (const payout of payouts) {
    if (!payout.vendorUserId) continue;
    const existing = vendors.get(payout.vendorUserId) ?? { label: payout.vendor?.name ?? payout.vendor?.email ?? "Unassigned vendor", trade: "Payout", invoices: 0, paidPayouts: 0, spend: 0 };
    if (payout.status === VendorPayoutStatus.PAID) existing.paidPayouts += 1;
    vendors.set(payout.vendorUserId, existing);
  }
  return Array.from(vendors.values())
    .sort((a, b) => b.spend - a.spend)
    .map((vendor) => [vendor.label, vendor.trade, vendor.invoices, vendor.paidPayouts, currency(vendor.spend)]);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildMonthlyTrend(entries: Array<{ date: Date; value: number; type: LedgerEntryType }>): ReportChartPoint[] {
  const buckets = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - i, 1);
    const label = date.toLocaleDateString("en-US", { month: "short" });
    buckets.set(label, 0);
  }
  for (const entry of entries) {
    if (entry.type !== LedgerEntryType.PAYMENT && entry.type !== LedgerEntryType.CREDIT) continue;
    const label = entry.date.toLocaleDateString("en-US", { month: "short" });
    if (buckets.has(label)) buckets.set(label, (buckets.get(label) ?? 0) + entry.value);
  }
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

export function reportTableForSection(report: ReportsDashboardDTO, section: ReportSection): ReportTable {
  if (section === "occupancy") return report.occupancy.rows;
  if (section === "delinquency") return report.delinquency.rows;
  if (section === "cash_flow") return report.cashFlow.rows;
  if (section === "leasing") return report.leasing.recentRows;
  if (section === "lead_conversion") return report.leadConversion.rows;
  if (section === "application_funnel") return report.applicationFunnel.rows;
  if (section === "maintenance") return report.maintenance.recentRows;
  if (section === "maintenance_cost") return report.maintenanceCost.rows;
  if (section === "vendor_performance") return report.vendorPerformance.rows;
  if (section === "inspection_compliance") return report.inspectionCompliance.rows;
  if (section === "communications") return report.communications.recentRows;
  return {
    title: "Financial activity",
    description: "Collected revenue, charges, and balance performance.",
    headers: ["Metric", "Value", "Detail"],
    rows: [
      ["Collected", currency(report.financial.collected), `${report.financial.collectionRate}% collection rate`],
      ["Charges", currency(report.financial.charges), "Posted charges and adjustments"],
      ["Outstanding", currency(report.financial.outstanding), `${currency(report.financial.overdue)} overdue`]
    ]
  };
}

export function reportToCsv(report: ReportsDashboardDTO, section: ReportSection) {
  const table = reportTableForSection(report, section === "overview" ? "financial" : section);
  return toCsv(table.headers, table.rows);
}
