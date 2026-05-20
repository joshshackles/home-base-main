import { readFile } from "node:fs/promises";
import path from "node:path";
import { AccountAccessRequestStatus, AccountAccessType, AdminQueueJobStatus, ApplicationStatus, InspectionStatus, IntegrationConnectionStatus, IntegrationEventStatus, LeasePacketStatus, MaintenanceRequestStatus, MessageThreadStatus, MessageThreadType, RentalMarketingStatus, SignatureStatus, TaskItemStatus, UnitStatus, UserRole } from "@prisma/client";
import type { AdminAccessState } from "@/lib/admin/permissions";
import { getDeploymentReadinessChecks, getOperationalIntelligenceSummary } from "@/lib/admin-ops";
import { prisma } from "@/lib/prisma";

export type AdminSeverity = "critical" | "warning" | "info" | "success";

export type AdminCommandCenterIssue = {
  key: string;
  title: string;
  count: number;
  severity: AdminSeverity;
  detail: string;
  href: string;
  actionLabel: string;
};

export type AdminCommandCenterModel = {
  access: AdminAccessState;
  generatedAt: Date;
  metrics: {
    pendingAccessRequests: number;
    criticalSecurityAlerts: number;
    failedIntegrations: number;
    blockedWorkflows: number;
    dataQualityIssues: number;
    productionWarnings: number;
    sampleDataRecords: number;
    recentAuditActivity: number;
  };
  accessRequests: Array<{
    id: string;
    type: AccountAccessType;
    status: AccountAccessRequestStatus;
    organization: string | null;
    reason: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; email: string; role: UserRole };
  }>;
  dataQuality: AdminCommandCenterIssue[];
  failedIntegrations: AdminCommandCenterIssue[];
  blockedWorkflows: AdminCommandCenterIssue[];
  productionHealth: Awaited<ReturnType<typeof getDeploymentReadinessChecks>>;
  operationalAlerts: Array<{
    id: string;
    severity: string;
    status: string;
    source: string;
    title: string;
    message: string;
    actionHref: string | null;
    actionLabel: string | null;
    createdAt: Date;
  }>;
  sampleData: {
    payloadAvailable: boolean;
    payloadRecordCounts: Record<string, number>;
    databaseRecordCount: number;
    cleanupAvailable: boolean;
    detail: string;
  };
  securityAlerts: Array<{
    id: string;
    type: string;
    email: string | null;
    message: string;
    createdAt: Date;
  }>;
  elevatedUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    elevatedAccess: AccountAccessType[];
  }>;
  auditActivity: Array<{
    id: string;
    actorEmail: string | null;
    actorRole: UserRole | null;
    action: string;
    entityType: string;
    entityId: string | null;
    message: string;
    createdAt: Date;
  }>;
  quickActions: Array<{
    title: string;
    detail: string;
    href: string;
    superUserOnly?: boolean;
    disabled?: boolean;
  }>;
};

function severityForCount(count: number, warningAt = 1, criticalAt = 10): AdminSeverity {
  if (count >= criticalAt) return "critical";
  if (count >= warningAt) return "warning";
  return "success";
}

function issue(key: string, title: string, count: number, detail: string, href: string, actionLabel: string, warningAt = 1, criticalAt = 10): AdminCommandCenterIssue {
  return { key, title, count, detail, href, actionLabel, severity: severityForCount(count, warningAt, criticalAt) };
}

async function getSamplePayloadCounts() {
  const filePath = path.join(process.cwd(), "sample-data", "homebase-sample-6-users-each-10-homes.json");
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : {};
    const counts = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));
    return { payloadAvailable: true, payloadRecordCounts: counts };
  } catch {
    return { payloadAvailable: false, payloadRecordCounts: {} as Record<string, number> };
  }
}

async function getDataQualityIssues(): Promise<AdminCommandCenterIssue[]> {
  const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [
    activeUnitsMissingPhotos,
    activeUnitsMissingMarketing,
    zeroRentUnits,
    propertiesWithoutUnits,
    maintenanceWithoutUnit,
    applicantProfilesMissingBasics,
    staleDraftListings,
    landlordSetupIncomplete,
    generalThreadsWithoutContext
  ] = await Promise.all([
    prisma.unit.count({ where: { marketingStatus: RentalMarketingStatus.ACTIVE, property: { isArchived: false }, photos: { none: {} } } }),
    prisma.unit.count({ where: { marketingStatus: RentalMarketingStatus.ACTIVE, property: { isArchived: false }, OR: [{ marketingHeadline: null }, { description: null }, { availableOn: null }] } }),
    prisma.unit.count({ where: { rentAmount: { lte: 0 }, NOT: { status: UnitStatus.ARCHIVED } } }),
    prisma.property.count({ where: { isArchived: false, units: { none: {} } } }),
    prisma.maintenanceRequest.count({ where: { unitId: null } }),
    prisma.applicantProfile.count({ where: { OR: [{ phone: null }, { currentAddress: null }, { employmentSummary: null }] } }),
    prisma.unit.count({ where: { marketingStatus: RentalMarketingStatus.DRAFT, updatedAt: { lt: staleDate }, property: { isArchived: false } } }),
    prisma.user.count({ where: { role: UserRole.LANDLORD, isActive: true, properties: { none: { isArchived: false } } } }),
    prisma.messageThread.count({ where: { applicationId: null, maintenanceRequestId: null, type: { not: MessageThreadType.GENERAL } } })
  ]);

  return [
    issue("active-units-missing-photos", "Active listings missing photos", activeUnitsMissingPhotos, "Public listings need at least one photo or a polished empty image state.", "/admin/units", "Review units", 1, 20),
    issue("active-units-missing-marketing", "Active listings missing marketplace details", activeUnitsMissingMarketing, "Headline, description, and availability improve search quality and conversion.", "/admin/rentals", "Fix listings", 1, 25),
    issue("zero-rent-units", "Units with zero rent", zeroRentUnits, "Zero-rent units can create misleading marketplace and ledger experiences.", "/admin/units", "Review rent", 1, 10),
    issue("properties-without-units", "Properties without units", propertiesWithoutUnits, "Properties need at least one unit before they can be managed or listed.", "/admin/properties", "Review properties", 1, 10),
    issue("maintenance-without-unit", "Maintenance requests without a unit", maintenanceWithoutUnit, "Repair operations lose context when a request is not tied to a unit.", "/admin/maintenance", "Review repairs", 1, 5),
    issue("profiles-missing-basics", "Applicant profiles missing basics", applicantProfilesMissingBasics, "Missing contact, address, or employment summary weakens reusable applications.", "/admin/users", "Review users", 5, 50),
    issue("stale-draft-listings", "Stale draft listings", staleDraftListings, "Draft units older than 14 days should be completed, paused, or archived.", "/admin/rentals", "Review drafts", 1, 20),
    issue("landlords-without-properties", "Landlords without setup", landlordSetupIncomplete, "Active landlord accounts should have properties or a clear onboarding task.", "/admin/users", "Review landlords", 1, 10),
    issue("threads-without-context", "Message threads missing context", generalThreadsWithoutContext, "Non-general conversations should remain linked to an application or maintenance record.", "/admin/inbox", "Review inbox", 1, 10)
  ];
}

async function getFailedIntegrationIssues(): Promise<AdminCommandCenterIssue[]> {
  const [failedEvents, erroredConnections, failedQueueJobs, disabledConnections] = await Promise.all([
    prisma.integrationEvent.count({ where: { status: IntegrationEventStatus.FAILED } }),
    prisma.integrationConnection.count({ where: { status: IntegrationConnectionStatus.ERROR } }),
    prisma.adminQueueJob.count({ where: { status: { in: [AdminQueueJobStatus.FAILED, AdminQueueJobStatus.RETRYING] } } }),
    prisma.integrationConnection.count({ where: { status: IntegrationConnectionStatus.DISABLED } })
  ]);

  return [
    issue("failed-integration-events", "Failed integration events", failedEvents, "Webhook, sync, OAuth, or diagnostic events reported failure status.", "/admin/integrations", "Open integrations", 1, 10),
    issue("integration-connections-error", "Connections in error", erroredConnections, "Connected providers need token, webhook, or sync diagnostics.", "/admin/integrations", "Diagnose", 1, 5),
    issue("failed-queue-jobs", "Failed or retrying jobs", failedQueueJobs, "Background work requires review before automations can be trusted.", "/admin/operations", "Review queue", 1, 10),
    issue("disabled-connections", "Disabled integrations", disabledConnections, "Disabled connections may be intentional, but should be visible before launch.", "/admin/integrations", "Review disabled", 1, 10)
  ];
}

async function getBlockedWorkflowIssues(): Promise<AdminCommandCenterIssue[]> {
  const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldAccessDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const [
    applicationsWaitingReview,
    messagesWaitingStaff,
    unsignedLeasePackets,
    maintenanceStale,
    failedInspections,
    blockedTasks,
    activeListingsMissingPhotos,
    oldAccessRequests
  ] = await Promise.all([
    prisma.application.count({ where: { status: ApplicationStatus.SUBMITTED } }),
    prisma.messageThread.count({ where: { status: MessageThreadStatus.WAITING_ON_STAFF } }),
    prisma.leasePacket.count({ where: { status: LeasePacketStatus.SENT_FOR_SIGNATURE, signatureRequests: { some: { status: SignatureStatus.PENDING } } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: [MaintenanceRequestStatus.NEW, MaintenanceRequestStatus.IN_PROGRESS, MaintenanceRequestStatus.WAITING_ON_TENANT, MaintenanceRequestStatus.WAITING_ON_VENDOR] }, updatedAt: { lt: oldDate } } }),
    prisma.inspection.count({ where: { status: { in: [InspectionStatus.FAILED, InspectionStatus.NEEDS_REINSPECTION] } } }),
    prisma.taskItem.count({ where: { status: { in: [TaskItemStatus.BLOCKED, TaskItemStatus.WAITING] } } }),
    prisma.unit.count({ where: { marketingStatus: RentalMarketingStatus.ACTIVE, property: { isArchived: false }, photos: { none: {} } } }),
    prisma.accountAccessRequest.count({ where: { status: AccountAccessRequestStatus.PENDING, createdAt: { lt: oldAccessDate } } })
  ]);

  return [
    issue("applications-waiting-review", "Applications waiting for review", applicationsWaitingReview, "Submitted applications need landlord or admin decisions.", "/admin/applications", "Review applications", 1, 25),
    issue("messages-waiting-staff", "Messages waiting on staff", messagesWaitingStaff, "Applicants, tenants, landlords, or vendors are waiting for a platform-side response.", "/admin/inbox", "Open inbox", 1, 30),
    issue("unsigned-lease-packets", "Lease packets unsigned", unsignedLeasePackets, "Signature packets sent to renters or landlords have not been completed.", "/admin/leases", "Review leases", 1, 20),
    issue("stale-maintenance", "Maintenance stale over 7 days", maintenanceStale, "Open repair workflows should not sit unchanged for a week.", "/admin/maintenance", "Review repairs", 1, 15),
    issue("failed-inspections", "Failed inspections unresolved", failedInspections, "Failed or reinspection-needed records should have a scheduled next step.", "/admin/inspections", "Review inspections", 1, 10),
    issue("blocked-tasks", "Blocked or waiting tasks", blockedTasks, "Task queues are explicitly marked blocked or waiting.", "/admin/tasks", "Review tasks", 1, 20),
    issue("active-listings-without-photos", "Active listings without photos", activeListingsMissingPhotos, "Active listings should not rely on weak visual fallback states.", "/admin/rentals", "Fix listings", 1, 20),
    issue("old-access-requests", "Access requests pending over 3 days", oldAccessRequests, "Permission requests should not stay unresolved.", "/admin/users", "Review access", 1, 10)
  ];
}

export async function getAdminCommandCenterModel(access: AdminAccessState): Promise<AdminCommandCenterModel> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [ops, productionHealth, pendingAccessCount, accessRequests, dataQuality, failedIntegrations, blockedWorkflows, samplePayload, sampleDbCounts, securityAlerts, elevatedUsersRaw, auditActivity] = await Promise.all([
    getOperationalIntelligenceSummary(),
    getDeploymentReadinessChecks(),
    prisma.accountAccessRequest.count({ where: { status: AccountAccessRequestStatus.PENDING } }),
    prisma.accountAccessRequest.findMany({
      where: { status: AccountAccessRequestStatus.PENDING },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "asc" },
      take: 12
    }),
    getDataQualityIssues(),
    getFailedIntegrationIssues(),
    getBlockedWorkflowIssues(),
    getSamplePayloadCounts(),
    Promise.all([
      prisma.user.count({ where: { OR: [{ id: { startsWith: "sample-" } }, { email: { endsWith: "@example.test" } }] } }),
      prisma.property.count({ where: { id: { startsWith: "sample-" } } }),
      prisma.unit.count({ where: { id: { startsWith: "sample-" } } }),
      prisma.application.count({ where: { id: { startsWith: "sample-" } } })
    ]),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: access.isSuperUser ? 10 : 0 }),
    prisma.user.findMany({
      where: { OR: [{ role: UserRole.ADMIN }, { accountAccessRequests: { some: { status: AccountAccessRequestStatus.APPROVED, type: { in: [AccountAccessType.ADMIN, AccountAccessType.SUPER_USER] } } } }] },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountAccessRequests: { where: { status: AccountAccessRequestStatus.APPROVED, type: { in: [AccountAccessType.ADMIN, AccountAccessType.SUPER_USER] } }, select: { type: true } }
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      take: access.isSuperUser ? 20 : 0
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  const sampleDatabaseRecords = sampleDbCounts.reduce((total, count) => total + count, 0);
  const productionWarnings = productionHealth.filter((check) => !check.ok).length;
  const dataQualityIssues = dataQuality.reduce((total, item) => total + item.count, 0);
  const blockedWorkflowCount = blockedWorkflows.reduce((total, item) => total + item.count, 0);
  const failedIntegrationCount = failedIntegrations.reduce((total, item) => total + item.count, 0);
  const criticalSecurityAlerts = securityAlerts.filter((event) => event.createdAt >= sevenDaysAgo).length + ops.metrics.criticalAlertCount;

  return {
    access,
    generatedAt: new Date(),
    metrics: {
      pendingAccessRequests: pendingAccessCount,
      criticalSecurityAlerts,
      failedIntegrations: failedIntegrationCount,
      blockedWorkflows: blockedWorkflowCount,
      dataQualityIssues,
      productionWarnings,
      sampleDataRecords: sampleDatabaseRecords,
      recentAuditActivity: auditActivity.length
    },
    accessRequests,
    dataQuality,
    failedIntegrations,
    blockedWorkflows,
    productionHealth,
    operationalAlerts: ops.alerts.slice(0, 8),
    sampleData: {
      payloadAvailable: samplePayload.payloadAvailable,
      payloadRecordCounts: samplePayload.payloadRecordCounts,
      databaseRecordCount: sampleDatabaseRecords,
      cleanupAvailable: false,
      detail: sampleDatabaseRecords > 0
        ? "Sample-like records were detected by sample IDs or @example.test email addresses. Cleanup remains disabled until sample records are consistently tagged across every model."
        : "No sample-like records were detected in the database. The downloadable sample payload is available for staging and restore testing."
    },
    securityAlerts,
    elevatedUsers: elevatedUsersRaw.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      elevatedAccess: user.accountAccessRequests.map((request) => request.type)
    })),
    auditActivity,
    quickActions: [
      { title: "Review access requests", detail: "Approve or decline pending role and account access requests.", href: "/admin/users" },
      { title: "Open user management", detail: "Audit roles, active users, and elevated accounts.", href: "/admin/users" },
      { title: "Review data quality", detail: "Find missing listing, profile, maintenance, and workflow context.", href: "/admin/command-center#data-quality" },
      { title: "View audit logs", detail: "Inspect recent system, security, and administrative activity.", href: "/admin/audit", superUserOnly: true },
      { title: "Manage sample data", detail: "Download the sample payload and review cleanup safety status.", href: "/admin/system", superUserOnly: true },
      { title: "Open system health", detail: "Capture production readiness and environment health checks.", href: "/admin/operations" },
      { title: "Review blocked workflows", detail: "Find stuck applications, leases, inspections, repairs, and messages.", href: "/admin/command-center#blocked-workflows" },
      { title: "View security alerts", detail: "Review recent security events and elevated users.", href: "/admin/security", superUserOnly: true },
      { title: "Open reports", detail: "Review reporting and analytics exports.", href: "/admin/reports" }
    ]
  };
}
