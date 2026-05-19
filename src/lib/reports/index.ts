import { ApplicationStatus, LedgerEntryStatus, LedgerEntryType, MaintenanceRequestStatus, MessageThreadStatus, Prisma, UnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { ledgerSignedAmount } from "@/lib/ledger";

export type ReportScope = { role: "admin" } | { role: "landlord"; ownerUserId: string };
export type ReportSection = "overview" | "financial" | "occupancy" | "leasing" | "maintenance" | "communications";

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
  leasing: {
    leads: number;
    applications: number;
    approved: number;
    submitted: number;
    conversionRate: number;
    statusRows: ReportChartPoint[];
    recentRows: ReportTable;
  };
  maintenance: {
    open: number;
    completed: number;
    urgent: number;
    averageResolutionDays: number | null;
    statusRows: ReportChartPoint[];
    recentRows: ReportTable;
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
  if (raw === "financial" || raw === "occupancy" || raw === "leasing" || raw === "maintenance" || raw === "communications") return raw;
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
    rentals: properties.flatMap((property) => property.units.map((unit) => ({ id: unit.id, label: `${property.name} #${unit.unitNumber}` })))
  };
}

export async function getReportsDashboard(scope: ReportScope, filters: ReportFilters): Promise<ReportsDashboardDTO> {
  const unitScope = unitWhere(scope, filters);
  const ledgerScope = ledgerWhere(scope, filters);
  const appScope = applicationWhere(scope, filters);
  const maintScope = maintenanceWhere(scope, filters);
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
    propertyRows
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
    prisma.property.findMany({ where: scope.role === "landlord" ? { ownerId: scope.ownerUserId } : {}, orderBy: { name: "asc" }, include: { units: true } })
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

  return {
    scopeLabel: scope.role === "landlord" ? "Landlord portfolio" : "Platform portfolio",
    filters,
    metrics: [
      { label: "Collected", value: currency(paymentTotal), detail: `${collectionRate}% collection rate`, tone: "green" },
      { label: "Outstanding", value: currency(outstanding), detail: `${currency(overdue)} overdue`, tone: outstanding > 0 ? "amber" : "green" },
      { label: "Occupancy", value: pct(occupancyRate), detail: `${occupied}/${totalRentals} occupied`, tone: occupancyRate >= 90 ? "green" : occupancyRate >= 75 ? "amber" : "red" },
      { label: "Applications", value: applications, detail: `${conversionRate}% lead-to-approval`, tone: "blue" },
      { label: "Open maintenance", value: openMaintenance, detail: `${urgentMaintenance} urgent`, tone: urgentMaintenance > 0 ? "red" : openMaintenance > 0 ? "amber" : "green" },
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
  if (section === "leasing") return report.leasing.recentRows;
  if (section === "maintenance") return report.maintenance.recentRows;
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
