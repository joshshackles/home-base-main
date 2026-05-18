export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkhorseDashboard, dashboardIcons } from "@/components/dashboard/WorkhorseDashboard";

export default async function LandlordDashboardPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const scope = { property: { ownerId: user.userId, isArchived: false } };

  const [propertyCount, unitCount, availableCount, leadCount, applicationCount, maintenanceCount, inboxCount, accessRequests] = await Promise.all([
    prisma.property.count({ where: { ownerId: user.userId, isArchived: false } }),
    prisma.unit.count({ where: { ...scope, NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { ...scope, status: "AVAILABLE" } }),
    prisma.lead.count({ where: { unit: scope } }),
    prisma.application.count({ where: { unit: scope, status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.maintenanceRequest.count({ where: { unit: scope, status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.messageThread.count({ where: { OR: [{ maintenanceRequest: { unit: scope } }, { application: { unit: scope } }] } }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } })
  ]);

  const tasks = [
    propertyCount === 0 ? { title: "Create your first rental home", detail: "For a single-family rental, add the home and listing in one step.", href: "/landlord/homes/new", cta: "Add Home", tone: "urgent" as const } : null,
    availableCount === 0 ? { title: "List an available unit", detail: "Available units automatically appear in the public rental directory.", href: "/landlord/units/new", cta: "Create", tone: "urgent" as const } : null,
    leadCount > 0 ? { title: "Review rental leads", detail: `${leadCount} prospect lead${leadCount === 1 ? "" : "s"} are tied to your units.`, href: "/landlord/leads", cta: "Leads" } : null,
    applicationCount > 0 ? { title: "Move applications forward", detail: `${applicationCount} active application${applicationCount === 1 ? "" : "s"} need review or follow-up.`, href: "/landlord/applications", cta: "Applications" } : null,
    maintenanceCount > 0 ? { title: "Coordinate maintenance", detail: `${maintenanceCount} open maintenance request${maintenanceCount === 1 ? "" : "s"} need status, assignment, or messaging.`, href: "/landlord/maintenance", cta: "Repairs", tone: "urgent" as const } : null
  ].filter((task): task is NonNullable<typeof task> => Boolean(task));

  return (
    <WorkhorseDashboard
      name={user.name}
      accountLabel="Applicant + landlord"
      headline="Your property workbench"
      summary="The dashboard keeps the renter foundation, then adds landlord tools for listings, leads, tenant records, leases, ledger activity, messaging, and repairs."
      metrics={[
        { label: "Properties", value: propertyCount, href: "/landlord/properties", detail: "Assigned portfolio", icon: dashboardIcons.homes },
        { label: "Units", value: unitCount, href: "/landlord/units", detail: `${availableCount} public listings`, icon: dashboardIcons.homes },
        { label: "Leads", value: leadCount, href: "/landlord/leads", detail: "Prospects and inquiries", icon: dashboardIcons.inbox },
        { label: "Maintenance", value: maintenanceCount, href: "/landlord/maintenance", detail: `${inboxCount} message threads`, icon: dashboardIcons.maintenance }
      ]}
      tasks={tasks}
      tools={[
        { title: "Home and unit operations", detail: "Add single-family homes, create multi-unit properties, mark availability, and open tenant records.", href: "/landlord/units", icon: dashboardIcons.homes },
        { title: "Leads and applications", detail: "Review prospects, notes, applications, documents, and next steps.", href: "/landlord/applications", icon: dashboardIcons.applications },
        { title: "Maintenance queue", detail: "Assign repairs, message tenants, and track completion.", href: "/landlord/maintenance", icon: dashboardIcons.maintenance },
        { title: "Messages", detail: "Keep application, lease, and repair conversations in one place.", href: "/landlord/inbox", icon: dashboardIcons.inbox },
        { title: "Payments", detail: "Connect Stripe, accept online ledger payments, and reconcile tenant charges.", href: "/landlord/payments", icon: dashboardIcons.work }
      ]}
      accessRequests={accessRequests}
    />
  );
}
