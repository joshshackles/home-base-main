import { ApplicationStatus, type Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { WorkhorseDashboard, dashboardIcons } from "@/components/dashboard/WorkhorseDashboard";

export default async function ApplicantDashboardPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant");
  const applicationWhere: Prisma.ApplicationWhereInput = { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] };

  const [profile, applications, submittedCount, favoritesCount, utilitiesCount, payrollCount, plannedPayments, accessRequests] = await Promise.all([
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
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } })
  ]);

  const activeApplications = applications.filter((application) => !["APPROVED", "DENIED", "WITHDRAWN"].includes(application.status)).length;
  const missingDocuments = applications.reduce((total, application) => total + application.documentRequests.filter((request) => ["REQUESTED", "REJECTED"].includes(request.status)).length, 0);
  const plannedPaymentTotal = plannedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const profileSteps = [
    Boolean(profile),
    (profile?.householdMembers.length ?? 0) > 0,
    (profile?.incomeSources.length ?? 0) > 0,
    Boolean(profile?.maxRent || profile?.desiredBedrooms || profile?.desiredMoveInDate)
  ].filter(Boolean).length;

  const tasks = [
    missingDocuments > 0 ? { title: "Upload requested documents", detail: `${missingDocuments} document request${missingDocuments === 1 ? "" : "s"} need attention across recent applications.`, href: "/applicant/applications", cta: "Documents", tone: "urgent" as const } : null,
    profileSteps < 4 ? { title: "Strengthen renter profile", detail: `${profileSteps}/4 profile readiness areas are complete. Add household, income, rental goals, and bio details.`, href: "/applicant/profile", cta: "Profile" } : null,
    favoritesCount > 0 ? { title: "Compare saved rentals", detail: `${favoritesCount} saved rental${favoritesCount === 1 ? "" : "s"} are waiting in your favorites list.`, href: "/applicant/favorites", cta: "Favorites" } : null,
    plannedPaymentTotal > 0 ? { title: "Review planned payments", detail: `${formatCurrency(plannedPaymentTotal)} is currently planned or submitted in your tenant tools.`, href: "/applicant/home-tools", cta: "Payments", tone: "success" as const } : null
  ].filter((task): task is NonNullable<typeof task> => Boolean(task));

  return (
    <WorkhorseDashboard
      name={user.name}
      accountLabel={user.role === "TENANT" ? "Tenant + applicant" : "Applicant"}
      headline={`Welcome${user.name ? `, ${user.name}` : ""}`}
      summary="This is your HomeBase workbench: build a renter profile, track applications, save rentals, manage home responsibilities, and request new access when your role expands."
      metrics={[
        { label: "Applications", value: applications.length, href: "/applicant/applications", detail: `${activeApplications} active`, icon: dashboardIcons.applications },
        { label: "Saved rentals", value: favoritesCount, href: "/applicant/favorites", detail: "Favorites and landlord messages", icon: dashboardIcons.homes },
        { label: "Home tools", value: utilitiesCount + payrollCount, href: "/applicant/home-tools", detail: `${utilitiesCount} utilities - ${payrollCount} payroll reminders`, icon: dashboardIcons.work },
        { label: "Planned payments", value: formatCurrency(plannedPaymentTotal), href: "/applicant/home-tools", detail: `${submittedCount} submitted applications`, icon: dashboardIcons.inbox }
      ]}
      tasks={tasks}
      tools={[
        { title: "Renter profile", detail: "Household, income, rental goals, references, voucher, pets, accessibility, and bio.", href: "/applicant/profile", icon: dashboardIcons.applications },
        { title: "Available rentals", detail: "Search the public directory, save matches, and contact potential landlords.", href: "/marketplace", icon: dashboardIcons.homes },
        { title: "Applications", detail: "Track application status, document requests, lease packets, and inspections.", href: "/applicant/applications", icon: dashboardIcons.inbox },
        { title: "Home tools", detail: "Utilities, payroll reminders, payment planning, and maintenance scheduling.", href: "/applicant/home-tools", icon: dashboardIcons.maintenance }
      ]}
      accessRequests={accessRequests}
    />
  );
}
