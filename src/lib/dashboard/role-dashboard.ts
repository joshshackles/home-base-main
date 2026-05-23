import { UserRole, type Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { activeOccupancyStatuses } from "@/lib/relationship-lifecycle";
import { getVendorPortal } from "@/lib/vendors";
import { buildDashboardCoherence } from "@/lib/dashboard/coherence";
import { getUserDashboardAccess, type DashboardAccess } from "@/lib/dashboard/permissions";
import { moduleLabels, type DashboardModule } from "@/lib/dashboard/role-config";

export type RoleDashboardTone = "slate" | "blue" | "green" | "amber" | "red";

export type RoleDashboardMetric = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  icon: string;
  tone?: RoleDashboardTone;
};

export type RoleDashboardItem = {
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone?: "default" | "urgent" | "success";
  meta?: string;
};

export type RoleDashboardTool = {
  title: string;
  detail: string;
  href: string;
  icon: string;
  module: DashboardModule;
};

export type RoleDashboardActivity = {
  title: string;
  detail: string;
  href: string;
  tone?: RoleDashboardTone;
};

export type RoleDashboardClarity = {
  roleGoal: string;
  currentFocus: string;
  nextActionTitle: string;
  nextActionDetail: string;
  nextActionHref: string;
  nextActionCta: string;
  followUpActions: Array<{
    title: string;
    detail: string;
    href: string;
  }>;
};

export type RoleDashboardModel = {
  name: string | null;
  role: UserRole;
  primaryModule: DashboardModule;
  accountLabel: string;
  headline: string;
  summary: string;
  metrics: RoleDashboardMetric[];
  needsAttention: RoleDashboardItem[];
  tools: RoleDashboardTool[];
  activity: RoleDashboardActivity[];
  access: DashboardAccess;
  emptyState: {
    title: string;
    detail: string;
    href: string;
    cta: string;
  };
  coherence: ReturnType<typeof buildDashboardCoherence>;
  clarity: RoleDashboardClarity;
};

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not scheduled";
}

function profileCompleteness(profile: {
  legalName?: string | null;
  phone?: string | null;
  currentAddress?: string | null;
  rentalHistory?: string | null;
  employmentSummary?: string | null;
  applicantSignature?: string | null;
  householdMembers?: unknown[];
  incomeSources?: unknown[];
} | null | undefined) {
  if (!profile) return 0;
  const fields = [
    profile.legalName,
    profile.phone,
    profile.currentAddress,
    profile.rentalHistory,
    profile.employmentSummary,
    profile.applicantSignature,
    profile.householdMembers?.length ? "household" : null,
    profile.incomeSources?.length ? "income" : null
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

const moduleGoals: Record<DashboardModule, string> = {
  applicant: "Find homes, keep your renter packet ready, and move applications forward without repeating paperwork.",
  tenant: "Manage your current home: rent, lease, maintenance, notices, inspections, documents, and landlord messages.",
  landlord: "Keep rentals moving: reply to renters, review applications, fix listing gaps, manage tenants, and resolve repairs.",
  inspector: "Complete assigned inspections, submit findings, and keep failed or reinspection work from stalling.",
  vendor: "Accept assigned work, post field updates, submit estimates or invoices, and keep payout-ready jobs moving.",
  admin: "Protect platform operations: approve access, monitor workflow health, resolve data issues, and review security events."
};

const moduleFocus: Record<DashboardModule, string> = {
  applicant: "Renter journey",
  tenant: "Resident operations",
  landlord: "Portfolio command center",
  inspector: "Inspection queue",
  vendor: "Field service queue",
  admin: "Platform control room"
};

function buildRoleClarity(model: Omit<RoleDashboardModel, "coherence" | "clarity">, coherence: ReturnType<typeof buildDashboardCoherence>): RoleDashboardClarity {
  const urgent = model.needsAttention.find((item) => item.tone === "urgent");
  const nextAction = urgent ?? model.needsAttention[0];
  const followUpActions = [
    ...model.needsAttention.filter((item) => item.href !== nextAction?.href).slice(0, 2).map((item) => ({
      title: item.title,
      detail: item.detail,
      href: item.href
    })),
    ...model.tools.slice(0, 3).map((tool) => ({
      title: tool.title,
      detail: tool.detail,
      href: tool.href
    }))
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href && candidate.title === item.title) === index).slice(0, 3);

  return {
    roleGoal: moduleGoals[model.primaryModule],
    currentFocus: moduleFocus[model.primaryModule],
    nextActionTitle: nextAction?.title ?? model.emptyState.title,
    nextActionDetail: nextAction?.detail ?? model.emptyState.detail,
    nextActionHref: nextAction?.href ?? coherence.nextActionHref ?? model.emptyState.href,
    nextActionCta: nextAction?.cta ?? model.emptyState.cta,
    followUpActions
  };
}

function finishModel(model: Omit<RoleDashboardModel, "coherence" | "clarity">): RoleDashboardModel {
  const coherence = buildDashboardCoherence({
    tasks: model.needsAttention,
    tools: model.tools,
    metrics: model.metrics
  });
  return {
    ...model,
    coherence,
    clarity: buildRoleClarity(model, coherence)
  };
}

function accessTools(access: DashboardAccess): RoleDashboardTool[] {
  const tools: RoleDashboardTool[] = [];
  if (access.modules.includes("applicant")) tools.push({ title: "Applicant dashboard", detail: "Profile, saved homes, applications, documents, and landlord messages.", href: "/applicant", icon: "UserRound", module: "applicant" });
  if (access.modules.includes("tenant")) tools.push({ title: "Resident dashboard", detail: "Rent, lease, maintenance, notices, documents, and move-in activity.", href: "/tenant", icon: "Home", module: "tenant" });
  if (access.modules.includes("landlord")) tools.push({ title: "Landlord console", detail: "Properties, units, listings, applications, messages, tenants, leases, and maintenance.", href: "/landlord", icon: "Building2", module: "landlord" });
  if (access.modules.includes("inspector")) tools.push({ title: "Inspector queue", detail: "Assigned inspections, failed items, reports due, and reinspection work.", href: "/inspector", icon: "ClipboardCheck", module: "inspector" });
  if (access.modules.includes("vendor")) tools.push({ title: "Vendor portal", detail: "Assigned jobs, field updates, invoices, payouts, and service records.", href: "/vendor", icon: "Wrench", module: "vendor" });
  if (access.modules.includes("admin")) tools.push({ title: "Admin operations", detail: "Users, access requests, system health, reporting, security, and workflow problems.", href: "/admin", icon: "ShieldCheck", module: "admin" });
  return tools;
}

async function buildApplicantDashboard(user: SessionPayload, access: DashboardAccess) {
  const applicationWhere: Prisma.ApplicationWhereInput = { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] };
  const [profile, activeApplications, savedHomes, unreadMessages, documentRequests, recentApplications] = await Promise.all([
    prisma.applicantProfile.findUnique({ where: { userId: user.userId }, include: { householdMembers: true, incomeSources: true } }),
    prisma.application.count({ where: { ...applicationWhere, status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.favoriteRental.count({ where: { userId: user.userId } }),
    prisma.messageThread.count({ where: { application: applicationWhere, messages: { some: { senderId: { not: user.userId }, isInternal: false, readByApplicantAt: null } } } }),
    prisma.documentRequest.count({ where: { application: applicationWhere, status: { in: ["REQUESTED", "REJECTED"] } } }),
    prisma.application.findMany({ where: applicationWhere, include: { unit: { include: { property: true } }, documentRequests: true }, orderBy: { updatedAt: "desc" }, take: 4 })
  ]);
  const completeness = profileCompleteness(profile);
  const needsAttention: RoleDashboardItem[] = [
    completeness < 100 ? { title: "Complete reusable renter profile", detail: `${completeness}% complete. Add identity, household, income, rental history, and signature details once for faster applications.`, href: "/applicant/profile", cta: "Complete profile", tone: "urgent" } : null,
    documentRequests > 0 ? { title: "Document requests are waiting", detail: `${documentRequests} requested or rejected document${documentRequests === 1 ? "" : "s"} need applicant action.`, href: "/applicant/documents", cta: "Upload documents", tone: "urgent" } : null,
    unreadMessages > 0 ? { title: "Landlord messages need a reply", detail: `${unreadMessages} unread applicant message thread${unreadMessages === 1 ? "" : "s"} are waiting.`, href: "/applicant/inbox", cta: "Open messages" } : null,
    activeApplications === 0 ? { title: "Start with available homes", detail: "No active application is in progress. Search the marketplace and apply with your reusable packet.", href: "/marketplace", cta: "Search homes", tone: "success" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "applicant",
    accountLabel: moduleLabels.applicant,
    headline: "Your housing journey dashboard",
    summary: "A renter-first dashboard for profile readiness, reusable applications, saved homes, documents, landlord messages, and move-in planning.",
    metrics: [
      { label: "Profile completion", value: `${completeness}%`, detail: "Reusable renter packet readiness", href: "/applicant/profile", icon: "UserRound", tone: completeness < 70 ? "amber" : "green" },
      { label: "Active applications", value: activeApplications, detail: "Started, submitted, or under review", href: "/applicant/applications", icon: "ClipboardList", tone: "blue" },
      { label: "Saved homes", value: savedHomes, detail: "Favorites and shortlist records", href: "/applicant/favorites", icon: "Heart", tone: "slate" },
      { label: "Unread messages", value: unreadMessages, detail: "Landlord or application conversations", href: "/applicant/inbox", icon: "MessageSquare", tone: unreadMessages ? "amber" : "green" }
    ],
    needsAttention,
    tools: [
      { title: "Search homes", detail: "Find available rentals and save your shortlist.", href: "/marketplace", icon: "Search", module: "applicant" },
      { title: "Complete profile", detail: "Reuse identity, household, income, vehicle, voucher, and signature information.", href: "/applicant/profile", icon: "UserRound", module: "applicant" },
      { title: "Applications", detail: "Track status, document requests, messages, and lease steps.", href: "/applicant/applications", icon: "ClipboardList", module: "applicant" },
      { title: "Documents", detail: "Upload, review, and reuse files across applications.", href: "/applicant/documents", icon: "FileText", module: "applicant" },
      { title: "Messages", detail: "Reply to landlords and marketplace staff.", href: "/applicant/inbox", icon: "MessageSquare", module: "applicant" },
      ...accessTools(access).filter((tool) => tool.module !== "applicant")
    ],
    activity: recentApplications.map((application) => ({
      title: `${application.unit.property.name} #${application.unit.unitNumber}`,
      detail: `${label(application.status)} application updated ${dateLabel(application.updatedAt)}`,
      href: `/applicant/applications/${application.id}`,
      tone: application.status === "SUBMITTED" ? "blue" : "slate"
    })),
    access,
    emptyState: { title: "Start by searching available homes", detail: "Use the marketplace to save homes, start an application, upload requested documents, and begin conversations with rental teams.", href: "/marketplace", cta: "Search rentals" }
  });
}

async function buildTenantDashboard(user: SessionPayload, access: DashboardAccess) {
  const activeOccupancies = await prisma.occupancy.findMany({
    where: { userId: user.userId, status: { in: activeOccupancyStatuses() } },
    include: { unit: { include: { property: true } }, leasePacket: true },
    orderBy: { updatedAt: "desc" },
    take: 4
  });
  const unitIds = activeOccupancies.map((occupancy) => occupancy.unitId);
  if (unitIds.length === 0) {
    return finishModel({
      name: user.name,
      role: user.role,
      primaryModule: "tenant",
      accountLabel: moduleLabels.tenant,
      headline: "Your resident dashboard",
      summary: "A resident portal for rent, lease records, maintenance, notices, inspections, documents, and landlord messages once an active tenancy is connected.",
      metrics: [
        { label: "Active homes", value: 0, detail: "No current occupancy record", href: "/tenant", icon: "Home", tone: "slate" },
        { label: "Open maintenance", value: 0, detail: "Repair requests still open", href: "/tenant/maintenance", icon: "Wrench", tone: "green" },
        { label: "Upcoming items", value: 0, detail: "Payments, inspections, and notices", href: "/tenant/calendar", icon: "CalendarDays", tone: "slate" },
        { label: "Documents", value: 0, detail: "Lease, uploads, and resident files", href: "/tenant/documents", icon: "FileText", tone: "slate" }
      ],
      needsAttention: [],
      tools: [
        { title: "Search homes", detail: "Find available rentals if you are still looking for housing.", href: "/marketplace", icon: "Search", module: "tenant" },
        { title: "Applications", detail: "Review earlier applications and move-in records.", href: "/applicant/applications", icon: "ClipboardList", module: "tenant" },
        { title: "Documents", detail: "Open resident documents once a tenancy is connected.", href: "/tenant/documents", icon: "FileText", module: "tenant" },
        { title: "Messages", detail: "Open landlord and maintenance conversations.", href: "/tenant/inbox", icon: "MessageSquare", module: "tenant" },
        ...accessTools(access).filter((tool) => tool.module !== "tenant")
      ],
      activity: [],
      access,
      emptyState: { title: "No active tenancy is connected", detail: "When a lease or move-in record is connected, this dashboard will organize rent, maintenance, inspections, notices, documents, and messages.", href: "/marketplace", cta: "Search rentals" }
    });
  }

  const [openMaintenance, upcomingPayments, unreadMessages, upcomingInspections, notices, documents] = await Promise.all([
    prisma.maintenanceRequest.count({ where: { requesterId: user.userId, status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.tenantPayment.count({ where: { userId: user.userId, unitId: { in: unitIds }, status: { in: ["PLANNED", "SUBMITTED"] } } }),
    prisma.messageThread.count({ where: { maintenanceRequest: { requesterId: user.userId }, messages: { some: { senderId: { not: user.userId }, isInternal: false, readByApplicantAt: null } } } }),
    prisma.inspection.count({ where: { unitId: { in: unitIds }, status: { in: ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] } } }),
    prisma.formalNotice.count({ where: { OR: [{ recipientUserId: user.userId }, { unitId: { in: unitIds } }], status: { in: ["READY", "SENT"] } } }),
    prisma.document.count({ where: { OR: [{ uploadedById: user.userId }, { unitId: { in: unitIds } }] } })
  ]);
  const primary = activeOccupancies[0];
  const needsAttention: RoleDashboardItem[] = [
    upcomingPayments > 0 ? { title: "Rent or payment item is open", detail: `${upcomingPayments} planned or submitted tenant payment${upcomingPayments === 1 ? "" : "s"} need review.`, href: "/tenant/payments", cta: "Open payments", tone: "urgent" } : null,
    notices > 0 ? { title: "Formal notice waiting", detail: `${notices} notice${notices === 1 ? "" : "s"} are ready or sent.`, href: "/tenant/notices", cta: "Review notices", tone: "urgent" } : null,
    upcomingInspections > 0 ? { title: "Inspection scheduled", detail: `${upcomingInspections} upcoming inspection${upcomingInspections === 1 ? "" : "s"} are tied to your unit.`, href: "/tenant/inspections", cta: "View schedule" } : null,
    openMaintenance > 0 ? { title: "Maintenance request active", detail: `${openMaintenance} open repair request${openMaintenance === 1 ? "" : "s"} are in progress.`, href: "/tenant/maintenance", cta: "Track request" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "tenant",
    accountLabel: moduleLabels.tenant,
    headline: "Your resident dashboard",
    summary: `${primary.unit.property.name} #${primary.unit.unitNumber} is your active rental workspace for lease, rent, maintenance, notices, inspections, documents, and messages.`,
    metrics: [
      { label: "Active homes", value: activeOccupancies.length, detail: "Current occupancy records", href: "/tenant", icon: "Home", tone: "green" },
      { label: "Open maintenance", value: openMaintenance, detail: "Repair requests still open", href: "/tenant/maintenance", icon: "Wrench", tone: openMaintenance ? "amber" : "green" },
      { label: "Upcoming items", value: upcomingPayments + upcomingInspections + notices, detail: "Payments, inspections, and notices", href: "/tenant/calendar", icon: "CalendarDays", tone: upcomingPayments + notices ? "amber" : "slate" },
      { label: "Documents", value: documents, detail: "Lease, uploads, and resident files", href: "/tenant/documents", icon: "FileText", tone: "blue" }
    ],
    needsAttention,
    tools: [
      { title: "Pay rent", detail: "Review planned rent, deposits, and tenant payment history.", href: "/tenant/payments", icon: "DollarSign", module: "tenant" },
      { title: "Submit maintenance", detail: "Create or track repair requests with access notes.", href: "/tenant/maintenance", icon: "Wrench", module: "tenant" },
      { title: "View lease", detail: "Open lease packets, signatures, and resident documents.", href: "/tenant/leases", icon: "FileSignature", module: "tenant" },
      { title: "Messages", detail: "Open landlord and maintenance conversations.", href: "/tenant/inbox", icon: "MessageSquare", module: "tenant" },
      { title: "Notices", detail: "Review formal notices and entry notifications.", href: "/tenant/notices", icon: "Megaphone", module: "tenant" },
      ...accessTools(access).filter((tool) => tool.module !== "tenant")
    ],
    activity: activeOccupancies.map((occupancy) => ({
      title: `${occupancy.unit.property.name} #${occupancy.unit.unitNumber}`,
      detail: `${label(occupancy.status)} occupancy updated ${dateLabel(occupancy.updatedAt)}`,
      href: "/tenant",
      tone: "green"
    })),
    access,
    emptyState: { title: "No active tenancy is connected", detail: "When a lease or move-in record is connected, this dashboard will organize rent, maintenance, inspections, notices, documents, and messages.", href: "/marketplace", cta: "Search rentals" }
  });
}

async function buildLandlordDashboard(user: SessionPayload, access: DashboardAccess) {
  const unitScope: Prisma.UnitWhereInput = {
    OR: [
      { property: { ownerId: user.userId, isArchived: false } },
      { propertyManagerUserId: user.userId, property: { isArchived: false } }
    ]
  };
  const [unitCount, activeListings, vacantUnits, pendingApplications, unreadMessages, openMaintenance, draftListings, leasePackets] = await Promise.all([
    prisma.unit.count({ where: { ...unitScope, NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { ...unitScope, marketingStatus: "ACTIVE", NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { ...unitScope, status: "AVAILABLE" } }),
    prisma.application.count({ where: { unit: unitScope, status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.messageThread.count({ where: { OR: [{ application: { unit: unitScope } }, { maintenanceRequest: { unit: unitScope } }], messages: { some: { senderId: { not: user.userId }, isInternal: false, readByStaffAt: null } } } }),
    prisma.maintenanceRequest.count({ where: { unit: unitScope, status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.unit.count({ where: { ...unitScope, marketingStatus: { in: ["DRAFT", "PAUSED"] }, NOT: { status: "ARCHIVED" } } }),
    prisma.leasePacket.count({ where: { application: { unit: unitScope }, status: { in: ["DRAFT", "READY_FOR_REVIEW", "SENT_FOR_SIGNATURE"] } } })
  ]);
  const needsAttention: RoleDashboardItem[] = [
    unreadMessages > 0 ? { title: "Unread renter or applicant messages", detail: `${unreadMessages} thread${unreadMessages === 1 ? "" : "s"} need a landlord response.`, href: "/landlord/inbox", cta: "Reply", tone: "urgent" } : null,
    pendingApplications > 0 ? { title: "Applications waiting in pipeline", detail: `${pendingApplications} application${pendingApplications === 1 ? "" : "s"} are started, submitted, or under review.`, href: "/landlord/applications", cta: "Review", tone: "urgent" } : null,
    vacantUnits > 0 ? { title: "Vacant units need attention", detail: `${vacantUnits} available unit${vacantUnits === 1 ? "" : "s"} need listing, lead, or application follow-up.`, href: "/landlord/rentals", cta: "Manage units" } : null,
    draftListings > 0 ? { title: "Draft or paused listings", detail: `${draftListings} listing${draftListings === 1 ? "" : "s"} are not public.`, href: "/landlord/rentals", cta: "Fix listings" } : null,
    leasePackets > 0 ? { title: "Lease/signature packets open", detail: `${leasePackets} lease packet${leasePackets === 1 ? "" : "s"} need preparation or signatures.`, href: "/landlord/leases", cta: "Open leases" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "landlord",
    accountLabel: moduleLabels.landlord,
    headline: "Landlord operating dashboard",
    summary: "Properties, units, listings, applications, messages, tenant directory, lease packets, maintenance, inspections, and reports are prioritized by what needs action.",
    metrics: [
      { label: "Active listings", value: activeListings, detail: `${unitCount} total non-archived units`, href: "/landlord/rentals", icon: "Home", tone: "blue" },
      { label: "Vacant units", value: vacantUnits, detail: "Available units needing follow-up", href: "/landlord/rentals", icon: "Building2", tone: vacantUnits ? "amber" : "green" },
      { label: "Pending applications", value: pendingApplications, detail: "Started, submitted, or under review", href: "/landlord/applications", icon: "ClipboardList", tone: pendingApplications ? "amber" : "green" },
      { label: "Open maintenance", value: openMaintenance, detail: "Active repair requests", href: "/landlord/maintenance", icon: "Wrench", tone: openMaintenance ? "amber" : "green" }
    ],
    needsAttention,
    tools: [
      { title: "Tenant search", detail: "Search applicants, leads, and tenants authorized for your rentals.", href: "/landlord/tenants", icon: "Users", module: "landlord" },
      { title: "Review applications", detail: "Open application packet, share status, documents, messages, and review stage.", href: "/landlord/applications", icon: "ClipboardList", module: "landlord" },
      { title: "Manage rentals", detail: "Properties, units, listing health, vacancies, and public marketplace state.", href: "/landlord/rentals", icon: "Home", module: "landlord" },
      { title: "Maintenance", detail: "Repair queues, vendor assignments, SLA signals, and invoices.", href: "/landlord/maintenance", icon: "Wrench", module: "landlord" },
      { title: "Reports", detail: "Occupancy, delinquency, cash flow, funnel, maintenance, vendor, and inspection exports.", href: "/landlord/reports", icon: "BarChart3", module: "landlord" },
      ...accessTools(access).filter((tool) => tool.module !== "landlord")
    ],
    activity: [],
    access,
    emptyState: { title: "Add your first property to begin", detail: "Once rentals exist, leads, applications, tenants, maintenance, lease packets, and reports will fill this dashboard.", href: "/landlord/rentals/new", cta: "Add rental" }
  });
}

async function buildInspectorDashboard(user: SessionPayload, access: DashboardAccess) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const where: Prisma.InspectionWhereInput = user.role === UserRole.ADMIN ? {} : { assignedToId: user.userId };
  const [todayCount, upcoming, reportsDue, failed, recent] = await Promise.all([
    prisma.inspection.count({ where: { ...where, scheduledFor: { gte: today, lt: tomorrow }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    prisma.inspection.count({ where: { ...where, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    prisma.inspection.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.inspection.count({ where: { ...where, status: { in: ["FAILED", "NEEDS_REINSPECTION"] } } }),
    prisma.inspection.findMany({ where, include: { unit: { include: { property: true } } }, orderBy: [{ scheduledFor: "asc" }, { updatedAt: "desc" }], take: 5 })
  ]);
  const needsAttention: RoleDashboardItem[] = [
    todayCount > 0 ? { title: "Inspections scheduled today", detail: `${todayCount} assigned inspection${todayCount === 1 ? "" : "s"} are due today.`, href: "/inspector", cta: "Start inspection", tone: "urgent" } : null,
    reportsDue > 0 ? { title: "Inspection reports need completion", detail: `${reportsDue} in-progress inspection${reportsDue === 1 ? "" : "s"} need findings or report completion.`, href: "/inspector", cta: "Submit findings", tone: "urgent" } : null,
    failed > 0 ? { title: "Failed or reinspection queue", detail: `${failed} inspection${failed === 1 ? "" : "s"} need follow-up.`, href: "/inspector", cta: "Review queue" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "inspector",
    accountLabel: moduleLabels.inspector,
    headline: "Inspection workflow dashboard",
    summary: "Assigned inspections, today's schedule, report completion, failed inspections, and reinspection follow-up in one focused field dashboard.",
    metrics: [
      { label: "Today", value: todayCount, detail: "Scheduled or in progress today", href: "/inspector", icon: "CalendarDays", tone: todayCount ? "amber" : "green" },
      { label: "Upcoming", value: upcoming, detail: "Assigned scheduled inspections", href: "/inspector", icon: "ClipboardCheck", tone: "blue" },
      { label: "Reports due", value: reportsDue, detail: "In-progress reports", href: "/inspector", icon: "FileText", tone: reportsDue ? "amber" : "green" },
      { label: "Reinspections", value: failed, detail: "Failed or needs reinspection", href: "/inspector", icon: "AlertTriangle", tone: failed ? "red" : "green" }
    ],
    needsAttention,
    tools: [
      { title: "Today's inspections", detail: "Open assigned inspections due today.", href: "/inspector", icon: "CalendarDays", module: "inspector" },
      { title: "Submit findings", detail: "Update findings, notes, result summary, and status.", href: "/inspector", icon: "FileText", module: "inspector" },
      { title: "Reinspection queue", detail: "Review failed inspections and follow-up requirements.", href: "/inspector", icon: "ClipboardCheck", module: "inspector" },
      ...accessTools(access).filter((tool) => tool.module !== "inspector")
    ],
    activity: recent.map((inspection) => ({
      title: `${inspection.unit.property.name} #${inspection.unit.unitNumber}`,
      detail: `${label(inspection.status)} - ${dateLabel(inspection.scheduledFor)}`,
      href: "/inspector",
      tone: inspection.status === "FAILED" || inspection.status === "NEEDS_REINSPECTION" ? "red" : "blue"
    })),
    access,
    emptyState: { title: "No inspections are assigned right now", detail: "You are clear for now. New assignments, failed inspections, and reports due are listed here when they are connected to your account.", href: "/dashboard", cta: "Back to dashboard" }
  });
}

async function buildVendorDashboard(user: SessionPayload, access: DashboardAccess) {
  const portal = await getVendorPortal(user.userId);
  const needsAttention: RoleDashboardItem[] = [
    portal.metrics.waitingAcceptance > 0 ? { title: "Jobs waiting on vendor acceptance", detail: `${portal.metrics.waitingAcceptance} assigned job${portal.metrics.waitingAcceptance === 1 ? "" : "s"} are waiting for vendor action.`, href: "/vendor/jobs", cta: "Accept job", tone: "urgent" } : null,
    portal.metrics.slaBreaches > 0 ? { title: "SLA tracking needs update", detail: `${portal.metrics.slaBreaches} work order${portal.metrics.slaBreaches === 1 ? "" : "s"} are past expected response time.`, href: "/vendor/jobs", cta: "Update status", tone: "urgent" } : null,
    portal.metrics.pendingInvoiceAmount > 0 ? { title: "Invoice draft or submission pending", detail: `${formatCurrency(portal.metrics.pendingInvoiceAmount)} is in draft/submitted vendor invoice workflow.`, href: "/vendor/invoices", cta: "Open invoices" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "vendor",
    accountLabel: moduleLabels.vendor,
    headline: "Vendor field operations dashboard",
    summary: "Assigned work orders, acceptance, SLA tracking, field updates, invoices, payouts, service records, and contacts are scoped to your vendor account.",
    metrics: [
      { label: "Assigned jobs", value: portal.metrics.openJobs, detail: "Open maintenance work orders", href: "/vendor/jobs", icon: "Wrench", tone: portal.metrics.openJobs ? "amber" : "green" },
      { label: "Waiting acceptance", value: portal.metrics.waitingAcceptance, detail: "Jobs waiting on vendor", href: "/vendor/jobs", icon: "ClipboardList", tone: portal.metrics.waitingAcceptance ? "amber" : "green" },
      { label: "Invoices", value: portal.metrics.invoiceCount, detail: `${formatCurrency(portal.metrics.pendingInvoiceAmount)} pending`, href: "/vendor/invoices", icon: "DollarSign", tone: "blue" },
      { label: "Payout eligible", value: portal.metrics.payoutEligibleInvoices, detail: "Approved invoices not yet paid out", href: "/vendor/invoices", icon: "BadgeDollarSign", tone: portal.metrics.payoutEligibleInvoices ? "green" : "slate" }
    ],
    needsAttention,
    tools: [
      { title: "Assigned work", detail: "View jobs, update status, add notes, and upload field photos.", href: "/vendor/jobs", icon: "Wrench", module: "vendor" },
      { title: "Submit invoice", detail: "Create and track vendor invoices connected to jobs.", href: "/vendor/invoices", icon: "DollarSign", module: "vendor" },
      { title: "Contacts", detail: "View property owner and service relationship context.", href: "/vendor/contacts", icon: "Users", module: "vendor" },
      ...accessTools(access).filter((tool) => tool.module !== "vendor")
    ],
    activity: portal.jobs.slice(0, 5).map((job) => ({
      title: job.subject,
      detail: `${label(job.status)} - ${job.unit ? `${job.unit.property.name} #${job.unit.unitNumber}` : "No unit linked"}`,
      href: "/vendor/jobs",
      tone: job.status === "WAITING_ON_VENDOR" ? "amber" : "slate"
    })),
    access,
    emptyState: { title: "No assigned jobs are waiting", detail: "You are clear for now. New work orders, invoices, and field updates are listed here when a landlord connects work to your vendor account.", href: "/vendor/jobs", cta: "Open jobs" }
  });
}

async function buildAdminDashboard(user: SessionPayload, access: DashboardAccess) {
  const [activeUsers, accessRequests, securityEvents, activeApplications, openMaintenance, inspections, documents, ledgerEntries, recentRequests] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.accountAccessRequest.count({ where: { status: "PENDING" } }),
    prisma.securityEvent.count(),
    prisma.application.count({ where: { status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.inspection.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] } } }),
    prisma.documentRequest.count({ where: { status: { in: ["REQUESTED", "REJECTED"] } } }),
    prisma.ledgerEntry.count(),
    prisma.accountAccessRequest.findMany({ where: { status: "PENDING" }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" }, take: 5 })
  ]);
  const needsAttention: RoleDashboardItem[] = [
    accessRequests > 0 ? { title: "Access requests pending", detail: `${accessRequests} account access request${accessRequests === 1 ? "" : "s"} need review.`, href: "/admin/users", cta: "Review access", tone: "urgent" } : null,
    securityEvents > 0 ? { title: "Security events recorded", detail: `${securityEvents} security event${securityEvents === 1 ? "" : "s"} are available for audit review.`, href: "/admin/security", cta: "Open security" } : null,
    activeApplications > 0 ? { title: "Application workload active", detail: `${activeApplications} application${activeApplications === 1 ? "" : "s"} are started, submitted, or under review.`, href: "/admin/applications", cta: "Review pipeline" } : null,
    openMaintenance > 0 ? { title: "Maintenance workload active", detail: `${openMaintenance} repair request${openMaintenance === 1 ? "" : "s"} are open.`, href: "/admin/maintenance", cta: "Coordinate repairs" } : null
  ].filter((item): item is RoleDashboardItem => Boolean(item));

  return finishModel({
    name: user.name,
    role: user.role,
    primaryModule: "admin",
    accountLabel: moduleLabels.admin,
    headline: "Platform operations dashboard",
    summary: "System-wide access requests, workflow health, applications, maintenance, inspections, documents, security, ledgers, analytics, and data quality signals.",
    metrics: [
      { label: "Active users", value: activeUsers, detail: "Enabled user accounts", href: "/admin/users", icon: "Users", tone: "blue" },
      { label: "Access requests", value: accessRequests, detail: "Pending permission reviews", href: "/admin/users", icon: "ShieldCheck", tone: accessRequests ? "amber" : "green" },
      { label: "Open workflow", value: activeApplications + openMaintenance + inspections + documents, detail: "Applications, repairs, inspections, docs", href: "/admin/operations", icon: "Activity", tone: "amber" },
      { label: "Ledger records", value: ledgerEntries, detail: "Payment and ledger activity", href: "/admin/ledger", icon: "DollarSign", tone: "green" }
    ],
    needsAttention,
    tools: [
      { title: "Access requests", detail: "Approve or decline expanded account access.", href: "/admin/users", icon: "ShieldCheck", module: "admin" },
      { title: "Users", detail: "Manage accounts, roles, sessions, and access state.", href: "/admin/users", icon: "Users", module: "admin" },
      { title: "Reports", detail: "Export analytics for occupancy, delinquency, cash flow, funnel, maintenance, and vendors.", href: "/admin/reports", icon: "BarChart3", module: "admin" },
      { title: "System health", detail: "Security, audit logs, integrations, backups, and operational intelligence.", href: "/admin/system", icon: "Database", module: "admin" },
      { title: "Operations", detail: "Workflow readiness, data quality, queue health, and alerts.", href: "/admin/operations", icon: "Activity", module: "admin" },
      ...accessTools(access).filter((tool) => tool.module !== "admin")
    ],
    activity: recentRequests.map((request) => ({
      title: `${request.user.name || request.user.email} requested ${label(request.type)}`,
      detail: `${request.organization || "No organization"} - ${dateLabel(request.createdAt)}`,
      href: "/admin/users",
      tone: "amber"
    })),
    access,
    emptyState: { title: "No urgent platform issues detected", detail: "Access requests, security events, blocked workflows, and queue exceptions are clear right now. Use operations for deeper review.", href: "/admin/operations", cta: "Open operations" }
  });
}

export async function buildDashboardForModule(user: SessionPayload, module: DashboardModule): Promise<RoleDashboardModel> {
  const access = await getUserDashboardAccess(user);
  if (module === "admin") return buildAdminDashboard(user, access);
  if (module === "landlord") return buildLandlordDashboard(user, access);
  if (module === "inspector") return buildInspectorDashboard(user, access);
  if (module === "vendor") return buildVendorDashboard(user, access);
  if (module === "tenant") return buildTenantDashboard(user, access);
  return buildApplicantDashboard(user, access);
}

export async function buildDashboardForUser(user: SessionPayload): Promise<RoleDashboardModel> {
  const access = await getUserDashboardAccess(user);
  if (user.role === UserRole.ADMIN || access.primaryModule === "admin") return buildAdminDashboard(user, access);
  if (access.primaryModule === "landlord") return buildLandlordDashboard(user, access);
  if (access.primaryModule === "inspector") return buildInspectorDashboard(user, access);
  if (access.primaryModule === "vendor") return buildVendorDashboard(user, access);
  if (user.role === UserRole.TENANT || access.primaryModule === "tenant") return buildTenantDashboard(user, access);
  return buildApplicantDashboard(user, access);
}
