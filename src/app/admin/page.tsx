export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ledgerTotals } from "@/lib/ledger-queries";
import { formatCurrency } from "@/lib/format";
import { APP_VERSION } from "@/lib/app-version";
import { WorkhorseDashboard, dashboardIcons } from "@/components/dashboard/WorkhorseDashboard";

export default async function AdminPage() {
  const [
    propertyCount,
    unitCount,
    availableCount,
    userCount,
    leadCount,
    applicationCount,
    documentCount,
    leaseCount,
    notificationCount,
    auditCount,
    securityEventCount,
    inspectionCount,
    maintenanceCount,
    inboxCount,
    accessRequestCount,
    taskCount,
    accessRequests,
    ledgerBalance
  ] = await Promise.all([
    prisma.property.count({ where: { isArchived: false } }),
    prisma.unit.count({ where: { NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { status: "AVAILABLE", property: { isArchived: false } } }),
    prisma.user.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.application.count({ where: { status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.document.count(),
    prisma.leasePacket.count(),
    prisma.signatureNotification.count({ where: { status: "QUEUED" } }),
    prisma.auditLog.count(),
    prisma.securityEvent.count(),
    prisma.inspection.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.messageThread.count({ where: { status: { not: "CLOSED" } } }),
    prisma.accountAccessRequest.count({ where: { status: "PENDING" } }),
    prisma.taskItem.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] } } }),
    prisma.accountAccessRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
      take: 8
    }),
    ledgerTotals().then((totals) => totals.balance)
  ]);

  const tasks = [
    accessRequestCount > 0 ? { title: "Review account access requests", detail: `${accessRequestCount} user${accessRequestCount === 1 ? "" : "s"} requested expanded dashboard access.`, href: "/admin/users", cta: "Access", tone: "urgent" as const } : null,
    leadCount > 0 ? { title: "Work new leads", detail: `${leadCount} new marketplace lead${leadCount === 1 ? "" : "s"} are waiting for follow-up.`, href: "/admin/leads", cta: "Leads" } : null,
    applicationCount > 0 ? { title: "Review applications", detail: `${applicationCount} active application${applicationCount === 1 ? "" : "s"} are in progress or under review.`, href: "/admin/applications", cta: "Applications" } : null,
    maintenanceCount > 0 ? { title: "Move repairs forward", detail: `${maintenanceCount} maintenance request${maintenanceCount === 1 ? "" : "s"} need coordination.`, href: "/admin/maintenance", cta: "Repairs", tone: "urgent" as const } : null,
    taskCount > 0 ? { title: "Clear operational tasks", detail: `${taskCount} task${taskCount === 1 ? "" : "s"} are open across leasing, maintenance, documents, and financial workflows.`, href: "/admin/tasks", cta: "Tasks" } : null,
    notificationCount > 0 ? { title: "Send queued notices", detail: `${notificationCount} signature notification${notificationCount === 1 ? "" : "s"} are queued.`, href: "/admin/notifications", cta: "Notices" } : null
  ].filter((task): task is NonNullable<typeof task> => Boolean(task));

  return (
    <WorkhorseDashboard
      name="Admin"
      accountLabel="System operator"
      headline="HomeBase command dashboard"
      summary="One dashboard model for every user: applicant tools at the foundation, then operational modules for listings, applications, inspections, maintenance, ledger, messaging, security, and account access."
      metrics={[
        { label: "Available listings", value: availableCount, href: "/marketplace", detail: `${unitCount} total active units`, icon: dashboardIcons.homes },
        { label: "Active work", value: applicationCount + leadCount + maintenanceCount + taskCount, href: "/admin/tasks", detail: "Leads, applications, repairs, tasks", icon: dashboardIcons.work },
        { label: "Ledger balance", value: formatCurrency(ledgerBalance), href: "/admin/ledger", detail: "Open charges less payments", icon: dashboardIcons.inbox },
        { label: "Access requests", value: accessRequestCount, href: "/admin/users", detail: `${userCount} total user accounts`, icon: dashboardIcons.security }
      ]}
      tasks={tasks}
      tools={[
        { title: "Rental marketplace inventory", detail: `${propertyCount} property groups, ${unitCount} rentals, public availability, and listing quality.`, href: "/admin/rentals", icon: dashboardIcons.homes },
        { title: "Applicant module", detail: "Open the base dashboard every account receives: profile, applications, favorites, and home tools.", href: "/applicant", icon: dashboardIcons.applications },
        { title: "Landlord module", detail: "Use the owner/property-manager dashboard for listings, leads, tenant records, and repairs.", href: "/landlord", icon: dashboardIcons.homes },
        { title: "People and access", detail: "Users, account types, password controls, access requests, and staff setup.", href: "/admin/users", icon: dashboardIcons.security },
        { title: "Application pipeline", detail: "Leads, documents, applications, lease packets, signatures, and notices.", href: "/admin/applications", icon: dashboardIcons.applications },
        { title: "Tasks and work orders", detail: `${taskCount} open operational tasks for leasing, repairs, documents, move-ins, and follow-up.`, href: "/admin/tasks", icon: dashboardIcons.work },
        { title: "Field operations", detail: `${inspectionCount} inspections, ${maintenanceCount} repairs, and ${inboxCount} open conversations.`, href: "/admin/maintenance", icon: dashboardIcons.maintenance },
        { title: "Ledger and documents", detail: `${formatCurrency(ledgerBalance)} ledger balance, ${documentCount} documents, ${leaseCount} lease packets.`, href: "/admin/ledger", icon: dashboardIcons.inbox },
        { title: "Reports and analytics", detail: "Financial, occupancy, leasing, maintenance, and communication reports with CSV/JSON exports.", href: "/admin/reports", icon: dashboardIcons.applications },
        { title: "Branding studio", detail: "Public identity, logo mark, homepage copy, color system, and launch toggles.", href: "/admin/branding", icon: dashboardIcons.work },
        { title: "Analytics hub", detail: "Portfolio KPIs, workflow load, security posture, financial exposure, and snapshots.", href: "/admin/analytics", icon: dashboardIcons.applications },
        { title: "Operational intelligence", detail: "Readiness checks, alert center, queue monitor, automation scaffolds, and health snapshots.", href: "/admin/operations", icon: dashboardIcons.security },
        { title: "Backup and recovery", detail: "Downloadable JSON backups, recovery imports, checksums, and restore manifests.", href: "/admin/backups", icon: dashboardIcons.security },
        { title: "System health and data", detail: `Version ${APP_VERSION}, import/export tools, ${auditCount} audit events, ${securityEventCount} security events.`, href: "/admin/system", icon: dashboardIcons.security }
      ]}
      accessRequests={[]}
      adminAccessQueue={accessRequests.map((request) => ({
        id: request.id,
        type: request.type,
        status: request.status,
        organization: request.organization,
        reason: request.reason,
        createdAt: request.createdAt,
        requester: request.user.name || request.user.email
      }))}
      showAccessBuilder={false}
    />
  );
}
