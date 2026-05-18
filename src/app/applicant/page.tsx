export const dynamic = "force-dynamic";

import { ApplicationStatus, type Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { WorkhorseDashboard, dashboardIcons } from "@/components/dashboard/WorkhorseDashboard";

function baseAccountLabel(role: string) {
  if (role === "ADMIN") return "Applicant base + admin";
  if (role === "LANDLORD") return "Applicant base + landlord";
  if (role === "INSPECTOR") return "Applicant base + inspector";
  if (role === "TENANT") return "Tenant + applicant";
  return "Applicant";
}

export default async function ApplicantDashboardPage() {
  const user = await requireUser("/applicant");
  const applicationWhere: Prisma.ApplicationWhereInput = { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] };

  const [profile, applications, submittedCount, favoritesCount, utilitiesCount, payrollCount, plannedPayments, openTaskCount, accessRequests] = await Promise.all([
    prisma.applicantProfile.findUnique({
      where: { userId: user.userId },
      include: { householdMembers: true, incomeSources: true }
    }),
    prisma.application.findMany({
      where: applicationWhere,
      include: { unit: { include: { property: true } }, documentRequests: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.application.count({ where: { ...applicationWhere, status: ApplicationStatus.SUBMITTED } }),
    prisma.favoriteRental.count({ where: { userId: user.userId } }),
    prisma.utilityAccount.count({ where: { userId: user.userId } }),
    prisma.payrollReminder.count({ where: { userId: user.userId } }),
    prisma.tenantPayment.findMany({ where: { userId: user.userId, status: { in: ["PLANNED", "SUBMITTED"] } }, select: { amount: true } }),
    prisma.taskItem.count({ where: { OR: [{ assignedToId: user.userId }, { createdById: user.userId }, { application: applicationWhere }, { maintenanceRequest: { requesterId: user.userId } }], status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] } } }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } })
  ]);

  const activeApplications = applications.filter((application) => !(["APPROVED", "DENIED", "WITHDRAWN"] as string[]).includes(application.status)).length;
  const missingDocuments = applications.reduce((total, application) => total + application.documentRequests.filter((request) => (["REQUESTED", "REJECTED"] as string[]).includes(request.status)).length, 0);
  const plannedPaymentTotal = plannedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const profileSteps = [
    Boolean(profile),
    (profile?.householdMembers.length ?? 0) > 0,
    (profile?.incomeSources.length ?? 0) > 0,
    Boolean(profile?.maxRent || profile?.desiredBedrooms || profile?.desiredMoveInDate)
  ].filter(Boolean).length;
  const approvedAccessTypes = new Set(accessRequests.filter((request) => request.status === "APPROVED").map((request) => request.type));
  const canOpenLandlordModule = user.role === "ADMIN" || user.role === "LANDLORD" || approvedAccessTypes.has("LANDLORD") || approvedAccessTypes.has("PROPERTY_MANAGER");
  const canOpenAdminModule = user.role === "ADMIN";

  const tasks = [
    missingDocuments > 0 ? { title: "Upload requested documents", detail: `${missingDocuments} document request${missingDocuments === 1 ? "" : "s"} need attention across recent applications.`, href: "/applicant/applications", cta: "Documents", tone: "urgent" as const } : null,
    profileSteps < 4 ? { title: "Strengthen renter profile", detail: `${profileSteps}/4 profile readiness areas are complete. Add household, income, rental goals, and bio details.`, href: "/applicant/profile", cta: "Profile" } : null,
    favoritesCount > 0 ? { title: "Compare saved rentals", detail: `${favoritesCount} saved rental${favoritesCount === 1 ? "" : "s"} are waiting in your favorites list.`, href: "/applicant/favorites", cta: "Favorites" } : null,
    plannedPaymentTotal > 0 ? { title: "Review planned payments", detail: `${formatCurrency(plannedPaymentTotal)} is currently planned or submitted in your tenant tools.`, href: "/applicant/home-tools", cta: "Payments", tone: "success" as const } : null,
    openTaskCount > 0 ? { title: "Review assigned tasks", detail: `${openTaskCount} housing task${openTaskCount === 1 ? "" : "s"} are open for documents, move-in, lease, or maintenance follow-up.`, href: "/applicant/tasks", cta: "Tasks" } : null
  ].filter((task): task is NonNullable<typeof task> => Boolean(task));

  const tools = [
    { title: "Renter profile", detail: "Household, income, rental goals, references, voucher, pets, accessibility, and bio.", href: "/applicant/profile", icon: dashboardIcons.applications },
    { title: "Available rentals", detail: "Search the public directory, save matches, and contact potential landlords.", href: "/marketplace", icon: dashboardIcons.homes },
    { title: "Applications", detail: "Track application status, document requests, lease packets, and inspections.", href: "/applicant/applications", icon: dashboardIcons.inbox },
    { title: "Home tasks", detail: "Track assigned move-in, lease, document, maintenance, and follow-up tasks.", href: "/applicant/tasks", icon: dashboardIcons.work },
    { title: "Home tools", detail: "Utilities, payroll reminders, payment planning, and maintenance scheduling.", href: "/applicant/home-tools", icon: dashboardIcons.maintenance },
    canOpenLandlordModule ? { title: "Landlord module", detail: "Open listings, leads, tenant records, maintenance, ledger, and landlord messages.", href: "/landlord", icon: dashboardIcons.homes } : null,
    canOpenAdminModule ? { title: "Admin module", detail: "Review access requests, users, all records, system health, and cross-module work.", href: "/admin", icon: dashboardIcons.security } : null
  ].filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  return (
    <WorkhorseDashboard
      name={user.name}
      accountLabel={baseAccountLabel(user.role)}
      headline={`Welcome${user.name ? `, ${user.name}` : ""}`}
      summary="This is your HomeBase workbench: build a renter profile, track applications, save rentals, manage home responsibilities, and request new access when your role expands."
      metrics={[
        { label: "Applications", value: applications.length, href: "/applicant/applications", detail: `${activeApplications} active`, icon: dashboardIcons.applications },
        { label: "Saved rentals", value: favoritesCount, href: "/applicant/favorites", detail: "Favorites and landlord messages", icon: dashboardIcons.homes },
        { label: "Home tools", value: utilitiesCount + payrollCount, href: "/applicant/home-tools", detail: `${utilitiesCount} utilities - ${payrollCount} payroll reminders`, icon: dashboardIcons.work },
        { label: "Tasks", value: openTaskCount, href: "/applicant/tasks", detail: "Assigned housing work", icon: dashboardIcons.work },
        { label: "Planned payments", value: formatCurrency(plannedPaymentTotal), href: "/applicant/home-tools", detail: `${submittedCount} submitted applications`, icon: dashboardIcons.inbox }
      ]}
      tasks={tasks}
      tools={tools}
      accessRequests={accessRequests}
    />
  );
}
