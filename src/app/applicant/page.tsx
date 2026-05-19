export const dynamic = "force-dynamic";

import Link from "next/link";
import type React from "react";
import {
  ApplicationStatus,
  FormalNoticeStatus,
  InspectionStatus,
  LeasePacketStatus,
  MaintenancePriority,
  MaintenanceRequestStatus,
  OccupancyStatus,
  ScheduleEventStatus,
  TenantPaymentStatus,
  type Prisma
} from "@prisma/client";
import { createMaintenanceRequest } from "@/app/workflow-actions";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { activeOccupancyStatuses, getTenantDashboardMode } from "@/lib/relationship-lifecycle";
import { WorkhorseDashboard, dashboardIcons } from "@/components/dashboard/WorkhorseDashboard";

function baseAccountLabel(role: string) {
  if (role === "ADMIN") return "Applicant base + admin";
  if (role === "LANDLORD") return "Applicant base + landlord";
  if (role === "INSPECTOR") return "Applicant base + inspector";
  if (role === "TENANT") return "Tenant + applicant";
  return "Applicant";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
}

function formatShortDateTime(date: Date | null | undefined) {
  return date ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not scheduled";
}

function isOpenMaintenanceStatus(status: MaintenanceRequestStatus) {
  return status !== MaintenanceRequestStatus.COMPLETED && status !== MaintenanceRequestStatus.CANCELLED;
}

function isUpcomingInspectionStatus(status: InspectionStatus) {
  return status === InspectionStatus.SCHEDULED || status === InspectionStatus.IN_PROGRESS || status === InspectionStatus.NEEDS_REINSPECTION;
}

function isUpcomingEventStatus(status: ScheduleEventStatus) {
  return status === ScheduleEventStatus.SCHEDULED || status === ScheduleEventStatus.CONFIRMED || status === ScheduleEventStatus.IN_PROGRESS;
}

function isAttentionNoticeStatus(status: FormalNoticeStatus) {
  return status === FormalNoticeStatus.SENT || status === FormalNoticeStatus.READY;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <span className="text-sm font-black text-slate-950">{title}</span>
      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{detail}</span>
    </Link>
  );
}

async function ApplicantSearchDashboard({ user, applicationWhere }: { user: Awaited<ReturnType<typeof requireUser>>; applicationWhere: Prisma.ApplicationWhereInput }) {
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
    prisma.tenantPayment.findMany({ where: { userId: user.userId, OR: [{ status: TenantPaymentStatus.PLANNED }, { status: TenantPaymentStatus.SUBMITTED }] }, select: { amount: true } }),
    prisma.taskItem.count({ where: { OR: [{ assignedToId: user.userId }, { createdById: user.userId }, { application: applicationWhere }, { maintenanceRequest: { requesterId: user.userId } }], status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] } } }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } })
  ]);

  const activeApplications = applications.filter((application) => application.status !== ApplicationStatus.APPROVED && application.status !== ApplicationStatus.DENIED && application.status !== ApplicationStatus.WITHDRAWN).length;
  const missingDocuments = applications.reduce((total, application) => total + application.documentRequests.filter((request) => request.status === "REQUESTED" || request.status === "REJECTED").length, 0);
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
    plannedPaymentTotal > 0 ? { title: "Review planned payments", detail: `${formatCurrency(plannedPaymentTotal)} is currently planned or submitted in your tenant tools.`, href: "/applicant/payments", cta: "Payments", tone: "success" as const } : null,
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
        { label: "Planned payments", value: formatCurrency(plannedPaymentTotal), href: "/applicant/payments", detail: `${submittedCount} submitted applications`, icon: dashboardIcons.inbox }
      ]}
      tasks={tasks}
      tools={tools}
      accessRequests={accessRequests}
    />
  );
}

async function TenantHomeDashboard({ user, applicationWhere }: { user: Awaited<ReturnType<typeof requireUser>>; applicationWhere: Prisma.ApplicationWhereInput }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeOccupancies = await prisma.occupancy.findMany({
    where: {
      userId: user.userId,
status: { in: activeOccupancyStatuses() }
    },
    include: { unit: { include: { property: true, currentApplication: true } }, application: true, leasePacket: { include: { template: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5
  });

  const legacyTenantUnits = activeOccupancies.length === 0 ? await prisma.unit.findMany({
    where: { tenantUserId: user.userId },
    include: { property: true, currentApplication: true },
    orderBy: { updatedAt: "desc" },
    take: 5
  }) : [];

  const tenantUnits = activeOccupancies.length > 0 ? activeOccupancies.map((occupancy) => occupancy.unit) : legacyTenantUnits;
  const tenantUnitIds = tenantUnits.map((unit) => unit.id);
  const applicationIds = [
    ...activeOccupancies.map((occupancy) => occupancy.applicationId).filter((id): id is string => Boolean(id)),
    ...tenantUnits.map((unit) => unit.currentApplicationId).filter((id): id is string => Boolean(id))
  ];
  const primaryOccupancy = activeOccupancies[0] ?? null;
  const primaryUnit = tenantUnits[0];
  if (!primaryUnit) return ApplicantSearchDashboard({ user, applicationWhere });

  const [leasePackets, upcomingPayments, recentPayments, maintenanceRequests, inspections, events, notices, documents, openTaskCount, applications] = await Promise.all([
    prisma.leasePacket.findMany({
      where: { application: { OR: [{ id: { in: applicationIds } }, applicationWhere] }, status: { in: [LeasePacketStatus.SENT_FOR_SIGNATURE, LeasePacketStatus.COMPLETED, LeasePacketStatus.APPROVED] } },
      include: { template: true, application: { include: { unit: { include: { property: true } } } }, signatureRequests: true },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.tenantPayment.findMany({
      where: { userId: user.userId, unitId: { in: tenantUnitIds }, OR: [{ status: TenantPaymentStatus.PLANNED }, { status: TenantPaymentStatus.SUBMITTED }] },
      include: { unit: { include: { property: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.tenantPayment.findMany({
      where: { userId: user.userId, unitId: { in: tenantUnitIds }, OR: [{ status: TenantPaymentStatus.CONFIRMED }, { status: TenantPaymentStatus.SUBMITTED }] },
      include: { unit: { include: { property: true } } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.maintenanceRequest.findMany({
      where: { OR: [{ requesterId: user.userId }, { unitId: { in: tenantUnitIds } }] },
      include: { unit: { include: { property: true } }, messageThreads: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.inspection.findMany({
      where: { unitId: { in: tenantUnitIds }, scheduledFor: { gte: today } },
      include: { unit: { include: { property: true } } },
      orderBy: { scheduledFor: "asc" },
      take: 4
    }),
    prisma.scheduleEvent.findMany({
      where: {
        startsAt: { gte: today },
        OR: [{ unitId: { in: tenantUnitIds } }, { participants: { some: { userId: user.userId } } }, { assignedToId: user.userId }]
      },
      include: { unit: { include: { property: true } }, participants: true },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    prisma.formalNotice.findMany({
      where: { OR: [{ recipientUserId: user.userId }, { unitId: { in: tenantUnitIds } }, { recipientEmail: user.email }], status: { in: [FormalNoticeStatus.READY, FormalNoticeStatus.SENT] } },
      include: { unit: { include: { property: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 4
    }),
    prisma.document.findMany({
      where: { OR: [{ uploadedById: user.userId }, { unitId: { in: tenantUnitIds } }, { application: applicationWhere }] },
      include: { unit: { include: { property: true } }, leasePacket: { include: { template: true } } },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.taskItem.count({ where: { OR: [{ assignedToId: user.userId }, { createdById: user.userId }, { unitId: { in: tenantUnitIds } }, { application: applicationWhere }], status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] } } }),
    prisma.application.findMany({ where: applicationWhere, include: { unit: { include: { property: true } }, documentRequests: true }, orderBy: { createdAt: "desc" }, take: 4 })
  ]);

  const activeLease = leasePackets.find((packet) => packet.status === LeasePacketStatus.COMPLETED) ?? leasePackets[0] ?? null;
  const rentAmount = activeLease?.monthlyRent ?? primaryUnit.rentAmount;
  const nextPayment = upcomingPayments[0];
  const openMaintenance = maintenanceRequests.filter((request) => isOpenMaintenanceStatus(request.status));
  const upcomingInspections = inspections.filter((inspection) => isUpcomingInspectionStatus(inspection.status));
  const upcomingEvents = events.filter((event) => isUpcomingEventStatus(event.status));
  const attentionNotices = notices.filter((notice) => isAttentionNoticeStatus(notice.status));
  const attentionSignatureCount = leasePackets.reduce((total, packet) => total + packet.signatureRequests.filter((request) => request.signerUserId === user.userId && request.status === "PENDING").length, 0);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-brand-200">Tenant home</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Your home dashboard</h1>
            <div className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-brand-100">{primaryOccupancy ? `${label(primaryOccupancy.status)} relationship` : "Legacy tenant assignment"}</div>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">Payments, maintenance, inspections, lease documents, notices, and messages are now surfaced on the first screen so tenants can act quickly and dig in when needed.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applicant/payments" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">Pay rent</Link>
            <Link href="/applicant/maintenance" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Request maintenance</Link>
            <Link href="/applicant/inbox" className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Message</Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="bg-gradient-to-br from-white to-brand-50/40">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-700">Current rental</p>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-black text-slate-950">{primaryUnit.property.name} {primaryUnit.unitNumber ? `#${primaryUnit.unitNumber}` : ""}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">{primaryUnit.property.addressLine}, {primaryUnit.property.city}, {primaryUnit.property.state} {primaryUnit.property.zip}</p>
              <p className="mt-3 text-sm text-slate-500">{label(primaryUnit.rentalType)} · {primaryUnit.bedrooms} bed · {primaryUnit.bathrooms} bath</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">Move-in {formatDate(primaryOccupancy?.moveInDate ?? activeLease?.leaseStartDate)} · Lease end {formatDate(primaryOccupancy?.leaseEndDate ?? activeLease?.leaseEndDate)}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 text-right shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Monthly rent</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{formatCurrency(rentAmount)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Lease {activeLease ? label(activeLease.status) : "not linked"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Next payment</p>
          {nextPayment ? (
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-950">{formatCurrency(nextPayment.amount)}</p>
              <p className="mt-2 text-sm font-bold text-slate-600">Due {formatDate(nextPayment.dueDate)} · {label(nextPayment.status)}</p>
              <Link href="/applicant/payments" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">View / pay</Link>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-2xl font-black text-emerald-700">No open payment</p>
              <p className="mt-2 text-sm text-slate-600">You do not have a planned or submitted payment currently showing.</p>
              <Link href="/applicant/payments" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Open payments</Link>
            </div>
          )}
        </Card>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/applicant/payments" title={`${upcomingPayments.length} upcoming payment${upcomingPayments.length === 1 ? "" : "s"}`} detail="Open charges, payment planning, and receipts." />
        <QuickLink href="/applicant/maintenance" title={`${openMaintenance.length} open maintenance`} detail="Track requests and submit a new repair." />
        <QuickLink href="/applicant/calendar" title={`${upcomingInspections.length + upcomingEvents.length} upcoming event${upcomingInspections.length + upcomingEvents.length === 1 ? "" : "s"}`} detail="Inspections, visits, and home milestones." />
        <QuickLink href="/applicant/documents" title={`${documents.length} recent document${documents.length === 1 ? "" : "s"}`} detail="Lease files, uploads, and records." />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Payments</h2>
            <Link href="/applicant/payments" className="text-sm font-black text-brand-700 hover:text-brand-900">Details</Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingPayments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-black text-slate-950">{formatCurrency(payment.amount)}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{label(payment.status)}</span></div>
                <p className="mt-1 text-xs font-semibold text-slate-500">Due {formatDate(payment.dueDate)}</p>
              </div>
            ))}
            {upcomingPayments.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">No upcoming payment is currently due.</p> : null}
          </div>
          <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">Recent payments</h3>
          <div className="mt-3 space-y-2">
            {recentPayments.map((payment) => <p key={payment.id} className="flex justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"><span>{formatDate(payment.submittedAt ?? payment.createdAt)}</span><strong>{formatCurrency(payment.amount)}</strong></p>)}
            {recentPayments.length === 0 ? <p className="text-sm text-slate-500">No prior payment records yet.</p> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Maintenance</h2>
            <Link href="/applicant/maintenance" className="text-sm font-black text-brand-700 hover:text-brand-900">All requests</Link>
          </div>
          <form action={createMaintenanceRequest} className="mt-5 rounded-2xl bg-slate-50 p-4">
            <input type="hidden" name="unitId" value={primaryUnit.id} />
            <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Quick request</label>
            <select name="priority" defaultValue={MaintenancePriority.NORMAL} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold">
              {Object.values(MaintenancePriority).map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
            </select>
            <input name="subject" required minLength={3} maxLength={140} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="What needs repair?" />
            <textarea name="description" required minLength={10} rows={3} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Describe the issue, location, and timing." />
            <textarea name="accessNotes" rows={2} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Access notes, pets, best time to enter." />
            <button className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Submit maintenance</button>
          </form>
          <div className="mt-5 space-y-3">
            {openMaintenance.slice(0, 3).map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-black text-slate-950">{request.subject}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{label(request.status)} · {label(request.priority)} · updated {formatDate(request.updatedAt)}</p>
              </div>
            ))}
            {openMaintenance.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">No open maintenance requests.</p> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Schedule</h2>
            <Link href="/applicant/calendar" className="text-sm font-black text-brand-700 hover:text-brand-900">Calendar</Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingInspections.slice(0, 2).map((inspection) => (
              <div key={inspection.id} className="rounded-2xl bg-amber-50 p-4">
                <p className="font-black text-amber-950">Inspection · {label(inspection.status)}</p>
                <p className="mt-1 text-xs font-semibold text-amber-800">{formatShortDateTime(inspection.scheduledFor)}</p>
              </div>
            ))}
            {upcomingEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-black text-slate-950">{event.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatShortDateTime(event.startsAt)} · {label(event.status)}</p>
              </div>
            ))}
            {upcomingInspections.length + upcomingEvents.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No upcoming inspections or visits.</p> : null}
          </div>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Needs attention</h2>
            <Link href="/applicant/tasks" className="text-sm font-black text-brand-700 hover:text-brand-900">Tasks</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-rose-50 p-4"><p className="text-3xl font-black text-rose-900">{attentionNotices.length}</p><p className="text-xs font-black uppercase tracking-wide text-rose-700">Notices</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><p className="text-3xl font-black text-amber-900">{attentionSignatureCount}</p><p className="text-xs font-black uppercase tracking-wide text-amber-700">Signatures</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-3xl font-black text-slate-950">{openTaskCount}</p><p className="text-xs font-black uppercase tracking-wide text-slate-500">Open tasks</p></div>
            <div className="rounded-2xl bg-brand-50 p-4"><p className="text-3xl font-black text-brand-900">{applications.length}</p><p className="text-xs font-black uppercase tracking-wide text-brand-700">Applications</p></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/applicant/notices" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Review notices</Link>
            <Link href="/applicant/leases" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Lease center</Link>
            <Link href="/applicant/documents" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Documents</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Documents & lease</h2>
            <Link href="/applicant/documents" className="text-sm font-black text-brand-700 hover:text-brand-900">Open files</Link>
          </div>
          <div className="mt-5 space-y-3">
            {activeLease ? (
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="font-black text-brand-950">{activeLease.template.name}</p>
                <p className="mt-1 text-xs font-semibold text-brand-800">{label(activeLease.status)} · {formatDate(activeLease.leaseStartDate)} to {formatDate(activeLease.leaseEndDate)}</p>
              </div>
            ) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No active lease packet is linked yet.</p>}
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                <div><p className="font-black text-slate-950">{document.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label(document.category)} · {formatDate(document.createdAt)}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{label(document.status)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}


async function FormerTenantDashboard({ user, applicationWhere }: { user: Awaited<ReturnType<typeof requireUser>>; applicationWhere: Prisma.ApplicationWhereInput }) {
  const formerOccupancies = await prisma.occupancy.findMany({
    where: { userId: user.userId, status: OccupancyStatus.FORMER },
    include: { unit: { include: { property: true } }, application: true, leasePacket: { include: { template: true } } },
    orderBy: [{ endedAt: "desc" }, { updatedAt: "desc" }],
    take: 5
  });
  const unitIds = formerOccupancies.map((occupancy) => occupancy.unitId);
  const applicationIds = formerOccupancies.map((occupancy) => occupancy.applicationId).filter((id): id is string => Boolean(id));
  const [recentPayments, documents, notices, applications] = await Promise.all([
    prisma.tenantPayment.findMany({
      where: { userId: user.userId, unitId: { in: unitIds } },
      include: { unit: { include: { property: true } } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 5
    }),
    prisma.document.findMany({
      where: { OR: [{ uploadedById: user.userId }, { unitId: { in: unitIds } }, { applicationId: { in: applicationIds } }] },
      include: { unit: { include: { property: true } }, leasePacket: { include: { template: true } } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.formalNotice.findMany({
      where: { OR: [{ recipientUserId: user.userId }, { recipientEmail: user.email }, { unitId: { in: unitIds } }] },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.application.findMany({ where: applicationWhere, include: { unit: { include: { property: true } } }, orderBy: { updatedAt: "desc" }, take: 5 })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">Former tenant home</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your rental history stays available.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Your active tenancy has ended, so new maintenance requests and active rent tools are hidden. You can still review prior payments, notices, lease files, documents, and applications.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/applicant/ledger" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">View payment history</Link>
          <Link href="/applicant/documents" className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-black text-white">View documents</Link>
          <Link href="/marketplace" className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-black text-white">Find another rental</Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-2xl font-black text-slate-950">Past homes</h2>
          <div className="mt-5 space-y-3">
            {formerOccupancies.length ? formerOccupancies.map((occupancy) => (
              <div key={occupancy.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-black text-slate-950">{occupancy.unit.property.name} {occupancy.unit.unitNumber ? `#${occupancy.unit.unitNumber}` : ""}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{occupancy.unit.property.addressLine}, {occupancy.unit.property.city}, {occupancy.unit.property.state}</p>
                <p className="mt-2 text-xs font-bold uppercase text-slate-500">Move-in {formatDate(occupancy.moveInDate ?? occupancy.leaseStartDate)} · Move-out {formatDate(occupancy.moveOutDate ?? occupancy.endedAt)}</p>
                {occupancy.notes ? <p className="mt-2 text-sm text-slate-600">{occupancy.notes}</p> : null}
              </div>
            )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No former tenancy records found yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-black text-slate-950">Final items</h2>
          <div className="mt-5 space-y-3 text-sm">
            <Link href="/applicant/ledger" className="block rounded-2xl bg-brand-50 p-4 font-black text-brand-900">Payment history and final balance</Link>
            <Link href="/applicant/documents" className="block rounded-2xl bg-slate-50 p-4 font-black text-slate-900">Lease, receipts, and shared files</Link>
            <Link href="/applicant/notices" className="block rounded-2xl bg-slate-50 p-4 font-black text-slate-900">Notices and move-out communication</Link>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-xl font-black text-slate-950">Recent payments</h2>
          <div className="mt-4 space-y-3">{recentPayments.length ? recentPayments.map((payment) => <div key={payment.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-black text-slate-950">{formatCurrency(payment.amount)}</p><p className="text-xs font-bold text-slate-500">{label(payment.status)} · {formatDate(payment.submittedAt ?? payment.dueDate)}</p></div>) : <p className="text-sm font-bold text-slate-500">No payments found.</p>}</div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-slate-950">Documents</h2>
          <div className="mt-4 space-y-3">{documents.length ? documents.map((document) => <div key={document.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-black text-slate-950">{document.title}</p><p className="text-xs font-bold text-slate-500">{label(document.category)} · {formatDate(document.createdAt)}</p></div>) : <p className="text-sm font-bold text-slate-500">No documents found.</p>}</div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-slate-950">Notices</h2>
          <div className="mt-4 space-y-3">{notices.length ? notices.map((notice) => <div key={notice.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-black text-slate-950">{notice.title}</p><p className="text-xs font-bold text-slate-500">{label(notice.status)} · {formatDate(notice.createdAt)}</p></div>) : <p className="text-sm font-bold text-slate-500">No notices found.</p>}</div>
        </Card>
      </section>

      {applications.length ? (
        <section className="mt-6">
          <Card>
            <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black text-slate-950">Applications</h2><Link href="/applicant/applications" className="text-sm font-black text-brand-700">Open applications</Link></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">{applications.map((application) => <div key={application.id} className="rounded-2xl border border-slate-100 p-4"><p className="font-black text-slate-950">{application.unit.property.name} {application.unit.unitNumber ? `#${application.unit.unitNumber}` : ""}</p><p className="mt-1 text-xs font-bold uppercase text-slate-500">{label(application.status)}</p></div>)}</div>
          </Card>
        </section>
      ) : null}
    </main>
  );
}

export default async function ApplicantDashboardPage() {
  const user = await requireUser("/applicant");
  const applicationWhere: Prisma.ApplicationWhereInput = { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] };
  const mode = await getTenantDashboardMode(user.userId, user.email);
  if (mode === "TENANT" || mode === "HYBRID") return TenantHomeDashboard({ user, applicationWhere });
  if (mode === "FORMER_TENANT") return FormerTenantDashboard({ user, applicationWhere });
  return ApplicantSearchDashboard({ user, applicationWhere });
}
