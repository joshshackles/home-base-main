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
  UtilityAccountStatus,
  type Prisma
} from "@prisma/client";
import { createMaintenanceRequest } from "@/app/workflow-actions";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { activeOccupancyStatuses, getTenantDashboardMode } from "@/lib/relationship-lifecycle";

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

function CompletionBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function JourneyStep({ eyebrow, title, detail, href, cta, complete = false, urgent = false }: { eyebrow: string; title: string; detail: string; href: string; cta: string; complete?: boolean; urgent?: boolean }) {
  const tone = urgent ? "border-rose-200 bg-rose-50" : complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white";
  const badgeTone = urgent ? "bg-rose-100 text-rose-800" : complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600";
  return (
    <Link href={href} className={`flex min-h-[168px] flex-col rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${badgeTone}`}>{complete ? "Ready" : urgent ? "Action" : "Next"}</span>
      </div>
      <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{detail}</p>
      <span className="mt-auto pt-4 text-sm font-black text-brand-700">{cta}</span>
    </Link>
  );
}

function SnapshotTile({ label, value, detail, href }: { label: string; value: string | number; detail: string; href: string }) {
  return (
    <Link href={href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
    </Link>
  );
}

async function ApplicantSearchDashboard({ user, applicationWhere }: { user: Awaited<ReturnType<typeof requireUser>>; applicationWhere: Prisma.ApplicationWhereInput }) {
  const [profile, applications, submittedCount, favorites, savedSearchCount, utilitiesCount, payrollCount, plannedPayments, openTaskCount, accessRequests, reusableDocumentCount, messageThreadCount] = await Promise.all([
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
    prisma.favoriteRental.findMany({ where: { userId: user.userId }, include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.favoriteRental.count({ where: { userId: user.userId } }),
    prisma.utilityAccount.count({ where: { userId: user.userId } }),
    prisma.payrollReminder.count({ where: { userId: user.userId } }),
    prisma.tenantPayment.findMany({ where: { userId: user.userId, OR: [{ status: TenantPaymentStatus.PLANNED }, { status: TenantPaymentStatus.SUBMITTED }] }, select: { amount: true } }),
    prisma.taskItem.count({ where: { OR: [{ assignedToId: user.userId }, { createdById: user.userId }, { application: applicationWhere }, { maintenanceRequest: { requesterId: user.userId } }], status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] } } }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } }),
    prisma.document.count({ where: { OR: [{ uploadedById: user.userId }, { application: applicationWhere }] } }),
    prisma.messageThread.count({ where: { OR: [{ createdById: user.userId }, { application: applicationWhere }] } })
  ]);

  const activeApplications = applications.filter((application) => application.status !== ApplicationStatus.APPROVED && application.status !== ApplicationStatus.DENIED && application.status !== ApplicationStatus.WITHDRAWN).length;
  const missingDocuments = applications.reduce((total, application) => total + application.documentRequests.filter((request) => request.status === "REQUESTED" || request.status === "REJECTED").length, 0);
  const plannedPaymentTotal = plannedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const profileAreas = [
    { label: "Identity", complete: Boolean(profile?.legalName && profile?.phone) },
    { label: "Household", complete: Boolean(profile?.householdSize || (profile?.householdMembers.length ?? 0) > 0) },
    { label: "Income", complete: (profile?.incomeSources.length ?? 0) > 0 || Boolean(profile?.employmentSummary) },
    { label: "Rental goals", complete: Boolean(profile?.maxRent || profile?.desiredBedrooms || profile?.desiredMoveInDate) },
    { label: "References", complete: Boolean(profile?.landlordReferences || profile?.rentalHistory) },
    { label: "Renter story", complete: Boolean(profile?.renterBio || profile?.pets || profile?.accessibilityNeeds) }
  ];
  const completedProfileAreas = profileAreas.filter((area) => area.complete).length;
  const profilePercent = Math.round((completedProfileAreas / profileAreas.length) * 100);
  const approvedAccessTypes = new Set(accessRequests.filter((request) => request.status === "APPROVED").map((request) => request.type));
  const canOpenLandlordModule = user.role === "ADMIN" || user.role === "LANDLORD" || approvedAccessTypes.has("LANDLORD") || approvedAccessTypes.has("PROPERTY_MANAGER");
  const canOpenAdminModule = user.role === "ADMIN";

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-brand-200">{baseAccountLabel(user.role)}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">Your guided housing journey</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Move from profile readiness to saved searches, reusable application packets, move-in planning, rent setup, utilities, maintenance, documents, and messages without losing the thread.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applicant/profile" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">Complete profile</Link>
            <Link href="/marketplace" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Search homes</Link>
            <Link href="/applicant/inbox" className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Messages</Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-700">Profile completeness</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">{profilePercent}% ready</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{completedProfileAreas}/{profileAreas.length} renter packet areas are filled in. A stronger profile can be reused across every application.</p>
            </div>
            <Link href="/applicant/profile" className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Edit</Link>
          </div>
          <div className="mt-5">
            <CompletionBar value={profilePercent} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {profileAreas.map((area) => (
                <div key={area.label} className={`rounded-2xl px-3 py-2 text-sm font-bold ${area.complete ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}`}>{area.complete ? "Done" : "Needs info"}: {area.label}</div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <SnapshotTile label="Saved searches" value={savedSearchCount} detail="Compare favorite homes, notes, and landlord conversations." href="/applicant/favorites" />
          <SnapshotTile label="Applications" value={applications.length} detail={`${activeApplications} active, ${submittedCount} submitted.`} href="/applicant/applications" />
          <SnapshotTile label="Reusable packet" value={reusableDocumentCount} detail={`${missingDocuments} requested document${missingDocuments === 1 ? "" : "s"} still need attention.`} href="/applicant/documents" />
          <SnapshotTile label="Messages" value={messageThreadCount} detail="Application, landlord, maintenance, and staff conversations." href="/applicant/inbox" />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <JourneyStep eyebrow="Step 1" title="Build your renter profile" detail={`${profilePercent}% complete across identity, household, income, goals, references, and renter story.`} href="/applicant/profile" cta="Open profile" complete={profilePercent === 100} />
        <JourneyStep eyebrow="Step 2" title="Save and compare homes" detail={savedSearchCount > 0 ? `${savedSearchCount} saved rental${savedSearchCount === 1 ? "" : "s"} are ready for comparison.` : "Start a saved search from the marketplace and keep your shortlist in one place."} href={savedSearchCount > 0 ? "/applicant/favorites" : "/marketplace"} cta={savedSearchCount > 0 ? "Compare saved homes" : "Search rentals"} complete={savedSearchCount > 0} />
        <JourneyStep eyebrow="Step 3" title="Reuse your application packet" detail={reusableDocumentCount > 0 ? `${reusableDocumentCount} uploaded file${reusableDocumentCount === 1 ? "" : "s"} can support current or future applications.` : "Upload IDs, income, references, and supporting files once, then reuse them as teams request documents."} href="/applicant/documents" cta="Open document hub" complete={reusableDocumentCount > 0 && missingDocuments === 0} urgent={missingDocuments > 0} />
        <JourneyStep eyebrow="Step 4" title="Follow application decisions" detail={applications.length > 0 ? `${activeApplications} active application${activeApplications === 1 ? "" : "s"} are moving through review, documents, lease, and inspection.` : "When you apply, each application becomes a tracked workflow with requests and messages."} href="/applicant/applications" cta="Track applications" complete={applications.length > 0} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Move-in readiness</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Plan the handoff before lease day.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Tasks, utilities, payments, maintenance preferences, documents, and messages become the tenant checklist once a home is approved.</p>
            </div>
            <Link href="/applicant/tasks" className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700">Checklist</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QuickLink href="/applicant/tasks" title={`${openTaskCount} open checklist item${openTaskCount === 1 ? "" : "s"}`} detail="Move-in, document, inspection, lease, and follow-up work." />
            <QuickLink href="/applicant/home-tools" title={`${utilitiesCount} utility account${utilitiesCount === 1 ? "" : "s"}`} detail="Electric, gas, water, internet, payroll reminders, and setup notes." />
            <QuickLink href="/applicant/payments" title={formatCurrency(plannedPaymentTotal)} detail="Planned rent, deposits, and tenant-side payment prep." />
            <QuickLink href="/applicant/maintenance" title="Maintenance preferences" detail="Keep repair requests and access notes ready for tenant mode." />
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-black text-slate-950">Recent journey activity</h2>
          <div className="mt-5 space-y-3">
            {applications.slice(0, 3).map((application) => (
              <Link key={application.id} href={`/applicant/applications/${application.id}`} className="block rounded-2xl border border-slate-100 p-4 hover:bg-slate-50">
                <p className="font-black text-slate-950">{application.unit.property.name} {application.unit.unitNumber ? `#${application.unit.unitNumber}` : ""}</p>
                <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label(application.status)} - updated {formatDate(application.updatedAt)}</p>
              </Link>
            ))}
            {favorites.slice(0, 2).map((favorite) => (
              <Link key={favorite.id} href={`/marketplace/${favorite.unitId}`} className="block rounded-2xl bg-brand-50 p-4 hover:bg-brand-100">
                <p className="font-black text-brand-950">Saved: {favorite.unit.property.name} {favorite.unit.unitNumber ? `#${favorite.unit.unitNumber}` : ""}</p>
                <p className="mt-1 text-xs font-bold text-brand-800">{formatCurrency(favorite.unit.rentAmount)} - {favorite.unit.bedrooms} bed</p>
              </Link>
            ))}
            {applications.length === 0 && favorites.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No saved rentals or applications yet. Start with the marketplace or your profile.</p> : null}
          </div>
        </Card>
      </section>

      {(canOpenLandlordModule || canOpenAdminModule) ? (
        <section className="mt-6 flex flex-wrap gap-3">
          {canOpenLandlordModule ? <Link href="/landlord" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">Open landlord module</Link> : null}
          {canOpenAdminModule ? <Link href="/admin" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">Open admin module</Link> : null}
        </section>
      ) : null}
    </main>
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

  const [leasePackets, upcomingPayments, recentPayments, maintenanceRequests, inspections, events, notices, documents, openTaskCount, applications, utilityAccounts, messageThreads] = await Promise.all([
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
    prisma.application.findMany({ where: applicationWhere, include: { unit: { include: { property: true } }, documentRequests: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.utilityAccount.findMany({ where: { userId: user.userId, OR: [{ unitId: { in: tenantUnitIds } }, { application: applicationWhere }, { unitId: null, applicationId: null }] }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.messageThread.findMany({
      where: { OR: [{ createdById: user.userId }, { application: applicationWhere }, { maintenanceRequest: { unitId: { in: tenantUnitIds } } }] },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 4
    })
  ]);

  const activeLease = leasePackets.find((packet) => packet.status === LeasePacketStatus.COMPLETED) ?? leasePackets[0] ?? null;
  const rentAmount = activeLease?.monthlyRent ?? primaryUnit.rentAmount;
  const nextPayment = upcomingPayments[0];
  const openMaintenance = maintenanceRequests.filter((request) => isOpenMaintenanceStatus(request.status));
  const upcomingInspections = inspections.filter((inspection) => isUpcomingInspectionStatus(inspection.status));
  const upcomingEvents = events.filter((event) => isUpcomingEventStatus(event.status));
  const attentionNotices = notices.filter((notice) => isAttentionNoticeStatus(notice.status));
  const attentionSignatureCount = leasePackets.reduce((total, packet) => total + packet.signatureRequests.filter((request) => request.signerUserId === user.userId && request.status === "PENDING").length, 0);
  const utilitiesReadyCount = utilityAccounts.filter((account) => account.status === UtilityAccountStatus.ACTIVE).length;
  const moveInChecklistComplete = [Boolean(primaryOccupancy?.moveInDate ?? activeLease?.leaseStartDate), activeLease?.status === LeasePacketStatus.COMPLETED, utilityAccounts.length > 0, upcomingPayments.length > 0 || recentPayments.length > 0, documents.length > 0, messageThreads.length > 0].filter(Boolean).length;
  const moveInChecklistPercent = Math.round((moveInChecklistComplete / 6) * 100);

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

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-700">Move-in checklist</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-950">{moveInChecklistPercent}% aligned</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{moveInChecklistComplete}/6 essentials are connected: move-in date, signed lease, utilities, rent calendar, documents, and messages.</p>
            </div>
            <Link href="/applicant/tasks" className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Tasks</Link>
          </div>
          <div className="mt-5"><CompletionBar value={moveInChecklistPercent} /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/applicant/leases" className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800 hover:bg-slate-100">Lease: {activeLease ? label(activeLease.status) : "not linked"}</Link>
            <Link href="/applicant/home-tools" className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800 hover:bg-slate-100">Utilities: {utilitiesReadyCount}/{utilityAccounts.length} active</Link>
            <Link href="/applicant/payments" className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800 hover:bg-slate-100">Rent calendar: {upcomingPayments.length} upcoming</Link>
            <Link href="/applicant/inbox" className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800 hover:bg-slate-100">Messages: {messageThreads.length} threads</Link>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <JourneyStep eyebrow="Rent calendar" title={nextPayment ? `${formatCurrency(nextPayment.amount)} due ${formatDate(nextPayment.dueDate)}` : "No open rent due"} detail="Review upcoming rent, submitted payments, receipts, and payment planning from one calendar view." href="/applicant/payments" cta="Open payments" complete={!nextPayment} urgent={Boolean(nextPayment)} />
          <JourneyStep eyebrow="Utilities" title={`${utilitiesReadyCount}/${utilityAccounts.length} utilities active`} detail={utilityAccounts.length > 0 ? "Track providers, account setup, due days, average bills, and autopay notes." : "Add electric, gas, water, internet, or other home services as move-in tasks."} href="/applicant/home-tools" cta="Manage utilities" complete={utilityAccounts.length > 0 && utilitiesReadyCount === utilityAccounts.length} />
          <JourneyStep eyebrow="Maintenance" title={`${openMaintenance.length} open request${openMaintenance.length === 1 ? "" : "s"}`} detail="Submit repairs, share access notes, and follow status updates without leaving tenant home." href="/applicant/maintenance" cta="Maintenance center" complete={openMaintenance.length === 0} urgent={openMaintenance.some((request) => request.priority === MaintenancePriority.URGENT)} />
          <JourneyStep eyebrow="Documents & messages" title={`${documents.length} files - ${messageThreads.length} threads`} detail="Lease packets, notices, uploads, receipts, landlord conversations, and maintenance messages stay attached to the rental journey." href="/applicant/documents" cta="Open documents" complete={documents.length > 0 && messageThreads.length > 0} />
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
