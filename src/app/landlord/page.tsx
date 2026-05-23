export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Home,
  Inbox,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Users
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const activeApplicationStatuses = ["STARTED", "SUBMITTED", "UNDER_REVIEW"] as const;
const openMaintenanceStatuses = ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] as const;
const activeTaskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] as const;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function timeAgo(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function statusTone(status: string) {
  if (["NEW", "SUBMITTED", "WAITING_ON_STAFF", "BLOCKED", "DRAFT"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (["UNDER_REVIEW", "IN_PROGRESS", "APPLICATION_PENDING", "LEAD_ACTIVITY"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (["AVAILABLE", "ACTIVE", "APPROVED", "OCCUPIED"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (["PAUSED", "UNAVAILABLE", "WAITING"].includes(status)) return "border-slate-200 bg-slate-100 text-slate-800";
  return "border-slate-200 bg-white text-slate-800";
}

export default async function LandlordDashboardPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const unitScope = { property: { ownerId: user.userId, isArchived: false } };
  const propertyScope = { ownerId: user.userId, isArchived: false };

  const [
    properties,
    units,
    newLeads,
    recentApplications,
    recentThreads,
    unreadThreadCount,
    openTasks,
    maintenanceRequests,
    leaseTaskCount,
    accessRequests
  ] = await Promise.all([
    prisma.property.findMany({
      where: propertyScope,
      include: {
        units: {
          where: { NOT: { status: "ARCHIVED" } },
          include: {
            photos: { select: { id: true }, take: 1 },
            leads: { where: { status: "NEW" }, select: { id: true } },
            applications: { where: { status: { in: [...activeApplicationStatuses] } }, select: { id: true, status: true } },
            maintenanceRequests: { where: { status: { in: [...openMaintenanceStatuses] } }, select: { id: true } }
          },
          orderBy: { unitNumber: "asc" }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.unit.findMany({
      where: { ...unitScope, NOT: { status: "ARCHIVED" } },
      include: {
        property: true,
        photos: { select: { id: true }, take: 1 },
        leads: { where: { status: "NEW" }, select: { id: true } },
        applications: { where: { status: { in: [...activeApplicationStatuses] } }, select: { id: true, status: true } },
        maintenanceRequests: { where: { status: { in: [...openMaintenanceStatuses] } }, select: { id: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100
    }),
    prisma.lead.findMany({
      where: { unit: unitScope, status: "NEW" },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.application.findMany({
      where: { unit: unitScope, status: { in: [...activeApplicationStatuses] } },
      include: {
        unit: { include: { property: true } },
        applicationDetail: true,
        messageThreads: { select: { id: true, status: true, lastMessageAt: true }, orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 1 },
        notes: { select: { id: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6
    }),
    prisma.messageThread.findMany({
      where: {
        OR: [
          { application: { unit: unitScope } },
          { maintenanceRequest: { unit: unitScope } }
        ]
      },
      include: {
        application: { include: { unit: { include: { property: true } } } },
        maintenanceRequest: { include: { unit: { include: { property: true } } } },
        messages: { include: { sender: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 5
    }),
    prisma.messageThread.count({
      where: {
        OR: [
          { application: { unit: unitScope } },
          { maintenanceRequest: { unit: unitScope } }
        ],
        messages: { some: { senderId: { not: user.userId }, isInternal: false, readByStaffAt: null } }
      }
    }),
    prisma.taskItem.findMany({
      where: {
        OR: [
          { createdById: user.userId },
          { assignedToId: user.userId },
          { unit: unitScope },
          { property: propertyScope }
        ],
        status: { in: [...activeTaskStatuses] }
      },
      include: { unit: { include: { property: true } }, application: true },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.maintenanceRequest.findMany({
      where: { unit: unitScope, status: { in: [...openMaintenanceStatuses] } },
      include: { unit: { include: { property: true } } },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 4
    }),
    prisma.leasePacket.count({
      where: { application: { unit: unitScope }, status: { in: ["DRAFT", "READY_FOR_REVIEW", "SENT_FOR_SIGNATURE"] } }
    }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } })
  ]);

  const unitCount = units.length;
  const vacantUnits = units.filter((unit) => unit.status === "AVAILABLE");
  const occupiedUnits = units.filter((unit) => unit.status === "OCCUPIED");
  const draftListings = units.filter((unit) => unit.marketingStatus === "DRAFT" || unit.marketingStatus === "PAUSED");
  const incompleteUnits = units.filter((unit) => !unit.marketingHeadline || !unit.description || unit.photos.length === 0 || !unit.leaseTermsNote);
  const activeApplications = recentApplications.length;
  const totalNewLeads = properties.reduce((sum, property) => sum + property.units.reduce((unitSum, unit) => unitSum + unit.leads.length, 0), 0);
  const totalOpenApplications = properties.reduce((sum, property) => sum + property.units.reduce((unitSum, unit) => unitSum + unit.applications.length, 0), 0);
  const totalOpenMaintenance = properties.reduce((sum, property) => sum + property.units.reduce((unitSum, unit) => unitSum + unit.maintenanceRequests.length, 0), 0);
  const attentionCount = totalNewLeads + totalOpenApplications + unreadThreadCount + incompleteUnits.length + leaseTaskCount + openTasks.length;
  const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits.length / unitCount) * 100) : 0;
  const vacancyRate = unitCount > 0 ? Math.round((vacantUnits.length / unitCount) * 100) : 0;

  const unitsNeedingAction = units
    .filter((unit) => unit.status === "AVAILABLE" || unit.marketingStatus !== "ACTIVE" || !unit.marketingHeadline || !unit.description || unit.photos.length === 0 || unit.applications.length > 0 || unit.leads.length > 0 || unit.maintenanceRequests.length > 0)
    .slice(0, 7);

  const propertyHealth = properties.slice(0, 5).map((property) => {
    const available = property.units.filter((unit) => unit.status === "AVAILABLE").length;
    const occupied = property.units.filter((unit) => unit.status === "OCCUPIED").length;
    const action = property.units.reduce((sum, unit) => sum + unit.leads.length + unit.applications.length + unit.maintenanceRequests.length + (unit.marketingStatus !== "ACTIVE" || unit.photos.length === 0 ? 1 : 0), 0);
    return { property, available, occupied, action };
  });

  const pipeline = [
    { label: "Started", count: recentApplications.filter((application) => application.status === "STARTED").length, href: "/landlord/applications" },
    { label: "Submitted", count: recentApplications.filter((application) => application.status === "SUBMITTED").length, href: "/landlord/applications" },
    { label: "Under review", count: recentApplications.filter((application) => application.status === "UNDER_REVIEW").length, href: "/landlord/applications" },
    { label: "Lease tasks", count: leaseTaskCount, href: "/landlord/leases" }
  ];

  const isNewLandlord = properties.length === 0 || unitCount === 0;

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Landlord operating console</p>
              <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user.name || "landlord"}.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Today you have {attentionCount} item{attentionCount === 1 ? "" : "s"} needing attention across applicant questions, applications, listing health, leases, tasks, and maintenance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton href="/landlord/inbox" icon={<MessageSquare size={16} />}>Reply to messages</ActionButton>
              <ActionButton href="/landlord/applications" icon={<ClipboardList size={16} />}>Review applications</ActionButton>
              <ActionButton href="/landlord/rentals/new" icon={<Plus size={16} />} primary>Add rental</ActionButton>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Needs attention" value={attentionCount} detail={`${unreadThreadCount} unread message threads`} href="#needs-attention" icon={<AlertTriangle size={18} />} tone="amber" />
            <MetricCard title="Applications" value={totalOpenApplications} detail={`${activeApplications} recently active`} href="/landlord/applications" icon={<ClipboardList size={18} />} tone="blue" />
            <MetricCard title="Vacancy" value={`${vacancyRate}%`} detail={`${vacantUnits.length} of ${unitCount} units available`} href="/landlord/rentals" icon={<Home size={18} />} tone="slate" />
            <MetricCard title="Occupancy" value={`${occupancyRate}%`} detail={`${occupiedUnits.length} occupied units`} href="/landlord/tenants" icon={<Users size={18} />} tone="green" />
            <MetricCard title="Listing work" value={incompleteUnits.length + draftListings.length} detail={`${draftListings.length} draft or paused`} href="/landlord/rentals" icon={<Building2 size={18} />} tone="rose" />
          </div>
        </section>

        {isNewLandlord ? (
          <section className="mt-4 rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-blue-950">Set up your first rental workspace</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">Start with a property or unit, add pricing and photos, then publish it to the marketplace so leads and applications land here.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton href="/landlord/rentals/new" icon={<Plus size={16} />} primary>Add rental</ActionButton>
                <ActionButton href="/landlord/rentals" icon={<Home size={16} />}>View rentals</ActionButton>
              </div>
            </div>
          </section>
        ) : null}

        <section id="needs-attention" className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <Panel title="Needs attention" detail="Highest-value work first: messages, applicant questions, waiting applications, listing gaps, and lease tasks." actionHref="/landlord/tasks" actionLabel="All tasks">
            <div className="grid gap-3">
              {newLeads.slice(0, 3).map((lead) => (
                <AttentionRow key={lead.id} icon={<Inbox size={17} />} title={`${lead.name} asked about ${lead.unit.property.name} #${lead.unit.unitNumber}`} detail={lead.message || "New marketplace lead with no message."} meta={timeAgo(lead.createdAt)} href={`/landlord/inbox?thread=lead_${lead.id}`} cta="Reply" tone="amber" />
              ))}
              {recentApplications.slice(0, 3).map((application) => (
                <AttentionRow key={application.id} icon={<ClipboardList size={17} />} title={`${application.applicantName} is ${label(application.status)}`} detail={`${application.unit.property.name} #${application.unit.unitNumber} - ${application.applicationDetail?.signedAt ? "packet signed" : "signature still needed"}`} meta={timeAgo(application.updatedAt)} href={`/landlord/applications/${application.id}`} cta="Review" tone={application.status === "SUBMITTED" ? "blue" : "slate"} />
              ))}
              {incompleteUnits.slice(0, 3).map((unit) => (
                <AttentionRow key={unit.id} icon={<ShieldAlert size={17} />} title={`${unit.property.name} #${unit.unitNumber} listing needs work`} detail={missingListingCopy(unit)} meta={label(unit.marketingStatus)} href={`/landlord/rentals/${unit.id}/edit`} cta="Fix listing" tone="rose" />
              ))}
              {newLeads.length === 0 && recentApplications.length === 0 && incompleteUnits.length === 0 ? (
                <EmptyState title="No urgent landlord work" detail="You are clear for now. New messages, submitted applications, listing issues, lease tasks, and maintenance items are summarized here when they need action." />
              ) : null}
            </div>
          </Panel>

          <Panel title="Recent messages and questions" detail="Threads are linked to the relevant application, repair, property, or unit." actionHref="/landlord/inbox" actionLabel="Open inbox">
            <div className="space-y-3">
              {recentThreads.length === 0 ? <EmptyState title="No message threads yet" detail="Applicant and maintenance conversations are listed here after renters or tenants write in." /> : recentThreads.map((thread) => {
                const last = thread.messages[0];
                const relatedUnit = thread.application?.unit ?? thread.maintenanceRequest?.unit;
                const unread = last && last.senderId !== user.userId && !last.readByStaffAt;
                return (
                  <Link key={thread.id} href={`/landlord/inbox?thread=${thread.id}`} className={`block rounded-2xl border p-4 transition hover:bg-white ${unread ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{thread.subject}</p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{relatedUnit ? `${relatedUnit.property.name} #${relatedUnit.unitNumber}` : "General conversation"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${unread ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>{unread ? "Unread" : label(thread.status)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{last?.body || "No messages yet."}</p>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel title="Applications pipeline" detail="Applicants, packet status, message context, and next review action in one list." actionHref="/landlord/applications" actionLabel="All applications">
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              {pipeline.map((stage) => (
                <Link key={stage.label} href={stage.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                  <p className="text-2xl font-black text-slate-950">{stage.count}</p>
                  <p className="text-xs font-black uppercase text-slate-500">{stage.label}</p>
                </Link>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {recentApplications.length === 0 ? <EmptyState title="No active applications" detail="No renter applications are active right now. New packets are listed here with unit, signature, document, and message context." /> : recentApplications.map((application) => (
                <Link key={application.id} href={`/landlord/applications/${application.id}`} className="grid gap-3 border-b border-slate-100 bg-white p-4 last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{application.applicantName}</p>
                      <Badge status={application.status} />
                      {application.applicationDetail?.signedAt ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800">Authorized packet</span> : <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase text-amber-900">Needs signature</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{application.unit.property.name} #{application.unit.unitNumber} - {application.applicantEmail}</p>
                    <p className="mt-1 text-xs text-slate-500">{application.messageThreads[0] ? `${label(application.messageThreads[0].status)} message thread` : "No message thread yet"} - {application.notes.length} notes</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Open packet <ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Quick actions" detail="Daily landlord shortcuts without hunting through navigation.">
            <div className="grid gap-2">
              <QuickAction href="/landlord/rentals/new" icon={<Plus size={18} />} title="Add rental or unit" detail="Create house, apartment, duplex, or mobile home listing." />
              <QuickAction href="/landlord/rentals" icon={<Search size={18} />} title="Find a unit" detail="Open rentals, edit listing details, check public status." />
              <QuickAction href="/landlord/leads" icon={<Inbox size={18} />} title="Reply to applicant question" detail={`${totalNewLeads} new lead${totalNewLeads === 1 ? "" : "s"} waiting.`} />
              <QuickAction href="/landlord/tenants" icon={<Users size={18} />} title="Open tenant records" detail="See renter details, unit, lease, packet, and income." />
              <QuickAction href="/landlord/reports" icon={<BarChart3 size={18} />} title="Portfolio reports" detail="Occupancy, funnel, cash flow, maintenance, vendors." />
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <Panel title="Property and unit health" detail="Vacancy, listing status, applications, lead activity, and missing information." actionHref="/landlord/rentals" actionLabel="Manage rentals">
            <div className="grid gap-3">
              {propertyHealth.length === 0 ? <EmptyState title="No properties yet" detail="Add the first rental and HomeBase will organize units under the property automatically." /> : propertyHealth.map(({ property, available, occupied, action }) => (
                <div key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{property.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{property.addressLine}, {property.city}, {property.state}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${action > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{action} actions</span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-700">
                    <span className="rounded-xl bg-white p-2">{property.units.length}<br />units</span>
                    <span className="rounded-xl bg-white p-2">{available}<br />vacant</span>
                    <span className="rounded-xl bg-white p-2">{occupied}<br />occupied</span>
                    <span className="rounded-xl bg-white p-2">{property.units.filter((unit) => unit.marketingStatus === "ACTIVE").length}<br />public</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Units needing action" detail="Draft, vacant, incomplete, active-lead, application, and maintenance signals." actionHref="/landlord/units" actionLabel="All units">
            <div className="space-y-2">
              {unitsNeedingAction.length === 0 ? <EmptyState title="Unit health looks good" detail="Listings, vacancies, applications, leads, and repair items are clear right now." /> : unitsNeedingAction.map((unit) => (
                <Link key={unit.id} href={`/landlord/rentals/${unit.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{unit.property.name} #{unit.unitNumber}</p>
                      <p className="mt-1 truncate text-xs text-slate-600">{formatCurrency(unit.rentAmount)} - {unit.bedrooms} bd / {unit.bathrooms} ba</p>
                    </div>
                    <Badge status={unit.marketingStatus} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">{missingListingCopy(unit)}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Tasks, leases, and documents" detail="Upcoming operational work connected to units and applications." actionHref="/landlord/tasks" actionLabel="Task queue">
            <div className="space-y-2">
              {openTasks.length === 0 ? <EmptyState title="No open landlord tasks" detail="Lease, document, collection, move-in, and follow-up tasks are clear right now." /> : openTasks.map((task) => (
                <Link key={task.id} href="/landlord/tasks" className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-black text-slate-950">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{task.unit ? `${task.unit.property.name} #${task.unit.unitNumber}` : task.application?.applicantName || "General landlord task"}</p>
                  </div>
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(task.status)}`}>{label(task.priority)}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Maintenance snapshot" detail="Open work orders with property context and priority." actionHref="/landlord/maintenance" actionLabel="Maintenance">
            <div className="space-y-2">
              {maintenanceRequests.length === 0 ? <EmptyState title="No open maintenance" detail="Open repair requests are listed here with unit, status, and next step." /> : maintenanceRequests.map((request) => (
                <Link key={request.id} href="/landlord/maintenance" className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-black text-slate-950">{request.subject}</p>
                    <p className="mt-1 text-xs text-slate-600">{request.unit ? `${request.unit.property.name} #${request.unit.unitNumber}` : "No unit linked"} - {timeAgo(request.updatedAt)}</p>
                  </div>
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(request.status)}`}>{label(request.priority)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        {accessRequests.length > 0 ? (
          <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Account access</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {accessRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="font-black text-slate-950">{label(request.type)}</p>
                  <p className="mt-1 text-xs text-slate-600">{label(request.status)} - {request.createdAt.toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function missingListingCopy(unit: {
  marketingStatus: string;
  marketingHeadline: string | null;
  description: string | null;
  leaseTermsNote: string | null;
  photos: Array<{ id: string }>;
  leads: Array<{ id: string }>;
  applications: Array<{ id: string }>;
  maintenanceRequests: Array<{ id: string }>;
}) {
  const issues = [
    unit.marketingStatus !== "ACTIVE" ? `${label(unit.marketingStatus)} listing` : null,
    !unit.marketingHeadline ? "missing headline" : null,
    !unit.description ? "missing description" : null,
    unit.photos.length === 0 ? "no photo" : null,
    !unit.leaseTermsNote ? "lease terms missing" : null,
    unit.leads.length > 0 ? `${unit.leads.length} new lead${unit.leads.length === 1 ? "" : "s"}` : null,
    unit.applications.length > 0 ? `${unit.applications.length} active application${unit.applications.length === 1 ? "" : "s"}` : null,
    unit.maintenanceRequests.length > 0 ? `${unit.maintenanceRequests.length} repair${unit.maintenanceRequests.length === 1 ? "" : "s"}` : null
  ].filter(Boolean);
  return issues.length ? issues.join(" / ") : "No obvious issues.";
}

function ActionButton({ href, icon, children, primary = false }: { href: string; icon: ReactNode; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}>
      {icon}
      {children}
    </Link>
  );
}

function MetricCard({ title, value, detail, href, icon, tone }: { title: string; value: string | number; detail: string; href: string; icon: ReactNode; tone: "amber" | "blue" | "green" | "rose" | "slate" }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
    slate: "bg-slate-50 text-slate-900 border-slate-200"
  }[tone];
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</span>
        <ArrowRight size={16} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-75">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </Link>
  );
}

function Panel({ title, detail, children, actionHref, actionLabel }: { title: string; detail: string; children: ReactNode; actionHref?: string; actionLabel?: string }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        {actionHref && actionLabel ? <Link href={actionHref} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50">{actionLabel}</Link> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AttentionRow({ icon, title, detail, meta, href, cta, tone }: { icon: ReactNode; title: string; detail: string; meta: string; href: string; cta: string; tone: "amber" | "blue" | "rose" | "slate" }) {
  const iconTone = {
    amber: "bg-amber-100 text-amber-900",
    blue: "bg-blue-100 text-blue-900",
    rose: "bg-rose-100 text-rose-900",
    slate: "bg-slate-100 text-slate-900"
  }[tone];
  return (
    <Link href={href} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate font-black text-slate-950">{title}</span>
        <span className="mt-1 block line-clamp-2 text-sm leading-6 text-slate-600">{detail}</span>
        <span className="mt-1 block text-xs font-bold text-slate-500">{meta}</span>
      </span>
      <span className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">{cta}</span>
    </Link>
  );
}

function QuickAction({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <Link href={href} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
      <span>
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">{detail}</span>
      </span>
    </Link>
  );
}

function Badge({ status }: { status: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusTone(status)}`}>{label(status)}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={26} />
      <p className="mt-3 font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
