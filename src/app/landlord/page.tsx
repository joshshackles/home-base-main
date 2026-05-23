export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Home,
  Inbox,
  MessageSquare,
  Plus,
  Search,
  Users,
  Wrench
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const activeApplicationStatuses = ["STARTED", "SUBMITTED", "UNDER_REVIEW"] as const;
const openMaintenanceStatuses = ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] as const;

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
  if (["NEW", "SUBMITTED", "DRAFT", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (["STARTED", "UNDER_REVIEW", "IN_PROGRESS", "PENDING"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (["AVAILABLE", "ACTIVE", "APPROVED", "OCCUPIED"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (["PAUSED", "UNAVAILABLE"].includes(status)) return "border-slate-200 bg-slate-100 text-slate-800";
  return "border-slate-200 bg-white text-slate-800";
}

export default async function LandlordDashboardPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const unitScope: Prisma.UnitWhereInput = { property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } };
  const propertyScope: Prisma.PropertyWhereInput = { ownerId: user.userId, isArchived: false };

  const [
    properties,
    units,
    newLeads,
    recentApplications,
    recentThreads,
    unreadThreadCount,
    maintenanceRequests,
    leaseTaskCount,
    chargeTotals,
    paymentTotals,
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
      where: unitScope,
      include: {
        property: true,
        photos: { select: { id: true }, take: 1 },
        leads: { where: { status: "NEW" }, select: { id: true } },
        applications: { where: { status: { in: [...activeApplicationStatuses] } }, select: { id: true, status: true } },
        maintenanceRequests: { where: { status: { in: [...openMaintenanceStatuses] } }, select: { id: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12
    }),
    prisma.lead.findMany({
      where: { unit: unitScope, status: "NEW" },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.application.findMany({
      where: { unit: unitScope, status: { in: [...activeApplicationStatuses] } },
      include: {
        unit: { include: { property: true } },
        applicationDetail: true,
        messageThreads: { select: { id: true, status: true, lastMessageAt: true }, orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 1 }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 4
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
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 4
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
    prisma.maintenanceRequest.findMany({
      where: { unit: unitScope, status: { in: [...openMaintenanceStatuses] } },
      include: { unit: { include: { property: true } } },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 4
    }),
    prisma.leasePacket.count({
      where: { application: { unit: unitScope }, status: { in: ["DRAFT", "READY_FOR_REVIEW", "SENT_FOR_SIGNATURE"] } }
    }),
    prisma.ledgerEntry.aggregate({
      where: { unit: unitScope, status: "POSTED", type: { in: ["CHARGE", "ADJUSTMENT"] } },
      _sum: { amount: true }
    }),
    prisma.ledgerEntry.aggregate({
      where: { unit: unitScope, status: "POSTED", type: { in: ["PAYMENT", "CREDIT"] } },
      _sum: { amount: true }
    }),
    prisma.accountAccessRequest.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" }, take: 3 })
  ]);

  const allUnits = properties.flatMap((property) => property.units);
  const unitCount = allUnits.length;
  const vacantUnits = allUnits.filter((unit) => unit.status === "AVAILABLE");
  const occupiedUnits = allUnits.filter((unit) => unit.status === "OCCUPIED");
  const draftListings = allUnits.filter((unit) => unit.marketingStatus === "DRAFT" || unit.marketingStatus === "PAUSED");
  const incompleteUnits = allUnits.filter((unit) => !unit.marketingHeadline || !unit.description || unit.photos.length === 0 || !unit.leaseTermsNote);
  const totalNewLeads = allUnits.reduce((sum, unit) => sum + unit.leads.length, 0);
  const totalOpenApplications = allUnits.reduce((sum, unit) => sum + unit.applications.length, 0);
  const totalOpenMaintenance = allUnits.reduce((sum, unit) => sum + unit.maintenanceRequests.length, 0);
  const chargeAmount = chargeTotals._sum.amount ?? 0;
  const receivedAmount = paymentTotals._sum.amount ?? 0;
  const outstandingAmount = Math.max(0, chargeAmount - receivedAmount);
  const attentionCount = totalNewLeads + totalOpenApplications + unreadThreadCount + totalOpenMaintenance + incompleteUnits.length + leaseTaskCount;
  const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits.length / unitCount) * 100) : 0;
  const isNewLandlord = properties.length === 0 || unitCount === 0;

  const todayItems = [
    unreadThreadCount > 0 ? { title: "Reply to messages", detail: `${unreadThreadCount} unread conversation${unreadThreadCount === 1 ? "" : "s"} need a response.`, href: "/landlord/inbox", cta: "Open messages", icon: <MessageSquare size={18} />, tone: "amber" as const } : null,
    totalOpenApplications > 0 ? { title: "Review applications", detail: `${totalOpenApplications} application${totalOpenApplications === 1 ? "" : "s"} are started, submitted, or under review.`, href: "/landlord/applications", cta: "Review", icon: <ClipboardList size={18} />, tone: "blue" as const } : null,
    totalNewLeads > 0 ? { title: "Follow up with leads", detail: `${totalNewLeads} new lead${totalNewLeads === 1 ? "" : "s"} are waiting on your rentals.`, href: "/landlord/inbox", cta: "Reply", icon: <Inbox size={18} />, tone: "amber" as const } : null,
    totalOpenMaintenance > 0 ? { title: "Check maintenance", detail: `${totalOpenMaintenance} repair request${totalOpenMaintenance === 1 ? "" : "s"} are open.`, href: "/landlord/maintenance", cta: "View repairs", icon: <Wrench size={18} />, tone: "rose" as const } : null,
    incompleteUnits.length > 0 ? { title: "Finish listing details", detail: `${incompleteUnits.length} rental${incompleteUnits.length === 1 ? "" : "s"} need photos, lease terms, headline, or description.`, href: "/landlord/rentals", cta: "Fix listings", icon: <AlertTriangle size={18} />, tone: "amber" as const } : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Landlord home</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user.name || "landlord"}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Your rentals, messages, applications, maintenance, and payments are organized around what needs your attention today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton href="/landlord/rentals/new" icon={<Plus size={16} />} primary>Add rental</ActionButton>
              <ActionButton href="/landlord/inbox" icon={<MessageSquare size={16} />}>Messages</ActionButton>
              <ActionButton href="/landlord/property-management" icon={<Building2 size={16} />}>Property Management</ActionButton>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Needs attention" value={attentionCount} detail="Messages, leads, applications, repairs, listing work" href="#today" icon={<AlertTriangle size={18} />} tone="amber" />
            <MetricCard title="Rentals" value={unitCount} detail={`${vacantUnits.length} vacant / ${occupiedUnits.length} occupied`} href="#rentals" icon={<Home size={18} />} tone="blue" />
            <MetricCard title="Occupancy" value={`${occupancyRate}%`} detail={`${draftListings.length} draft or paused listings`} href="/landlord/rentals" icon={<Users size={18} />} tone="green" />
            <MetricCard title="Payments" value={formatCurrency(outstandingAmount)} detail={`${formatCurrency(receivedAmount)} received`} href="/landlord/payments" icon={<DollarSign size={18} />} tone={outstandingAmount > 0 ? "rose" : "slate"} />
          </div>
        </section>

        {isNewLandlord ? (
          <section className="mt-4 rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-blue-950">Set up your first rental</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">Add the home or unit, include rent and photos, then publish when you are ready to receive leads and applications.</p>
              </div>
              <ActionButton href="/landlord/rentals/new" icon={<Plus size={16} />} primary>Add rental</ActionButton>
            </div>
          </section>
        ) : null}

        <section id="today" className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Today" detail="Start here. These are the things most likely to need your response.">
            <div className="grid gap-3">
              {todayItems.length === 0 ? (
                <EmptyState title="No urgent landlord work" detail="Messages, applications, listing health, payment issues, and maintenance are clear right now." />
              ) : todayItems.slice(0, 5).map((item) => (
                <ActionRow key={item.title} {...item} />
              ))}
            </div>
          </Panel>

          <Panel title="Quick actions" detail="Common tasks without searching through menus.">
            <div className="grid gap-2">
              <QuickAction href="/landlord/rentals/new" icon={<Plus size={18} />} title="Add rental" detail="Create a new rental listing or unit." />
              <QuickAction href="/landlord/rentals" icon={<Search size={18} />} title="Edit listings" detail="Update photos, rent, availability, or public status." />
              <QuickAction href="/landlord/applications" icon={<ClipboardList size={18} />} title="Review applications" detail="Open active application packets." />
              <QuickAction href="/landlord/payments" icon={<DollarSign size={18} />} title="Open payments" detail="Review rent, balances, and payment setup." />
            </div>
          </Panel>
        </section>

        <section id="rentals" className="mt-4">
          <Panel title="My rentals" detail="A simple view of each rental, public status, leasing activity, and repair needs." actionHref="/landlord/rentals" actionLabel="Manage rentals">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {units.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No rentals yet" detail="Add your first rental to start tracking listings, applications, residents, maintenance, and payments." /></div>
              ) : units.slice(0, 6).map((unit) => (
                <RentalCard key={unit.id} unit={unit} />
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Leads and applications" detail="Prospects and active application packets for your rentals." actionHref="/landlord/applications" actionLabel="All applications">
            <div className="space-y-3">
              {newLeads.slice(0, 2).map((lead) => (
                <ActionRow key={lead.id} icon={<Inbox size={18} />} title={`${lead.name} asked about ${lead.unit.property.name} #${lead.unit.unitNumber}`} detail={lead.message || "New marketplace lead with no message."} href={`/landlord/inbox?thread=lead_${lead.id}`} cta="Reply" tone="amber" />
              ))}
              {recentApplications.slice(0, 3).map((application) => (
                <ActionRow key={application.id} icon={<ClipboardList size={18} />} title={`${application.applicantName} is ${label(application.status)}`} detail={`${application.unit.property.name} #${application.unit.unitNumber} / ${application.applicationDetail?.signedAt ? "sharing authorized" : "signature still needed"}`} href={`/landlord/applications/${application.id}`} cta="Review" tone="blue" />
              ))}
              {newLeads.length === 0 && recentApplications.length === 0 ? <EmptyState title="No active leads or applications" detail="New renter questions and application packets are listed here when they arrive." /> : null}
            </div>
          </Panel>

          <Panel title="Messages" detail="Recent conversations tied to applications, renters, and repairs." actionHref="/landlord/inbox" actionLabel="Open inbox">
            <div className="space-y-3">
              {recentThreads.length === 0 ? <EmptyState title="No message threads yet" detail="Applicant and maintenance conversations are listed here after renters or tenants write in." /> : recentThreads.map((thread) => {
                const last = thread.messages[0];
                const relatedUnit = thread.application?.unit ?? thread.maintenanceRequest?.unit;
                return (
                  <Link key={thread.id} href={`/landlord/inbox?thread=${thread.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{thread.subject}</p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{relatedUnit ? `${relatedUnit.property.name} #${relatedUnit.unitNumber}` : "General conversation"}</p>
                      </div>
                      <Badge status={thread.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{last?.body || "No messages yet."}</p>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Maintenance" detail="Open repair requests and next repair follow-up." actionHref="/landlord/maintenance" actionLabel="Maintenance">
            <div className="space-y-3">
              {maintenanceRequests.length === 0 ? <EmptyState title="No open maintenance" detail="Open repair requests are listed here with unit, priority, and status." /> : maintenanceRequests.map((request) => (
                <ActionRow key={request.id} icon={<Wrench size={18} />} title={request.subject} detail={`${request.unit ? `${request.unit.property.name} #${request.unit.unitNumber}` : "No unit linked"} / ${label(request.priority)} / updated ${timeAgo(request.updatedAt)}`} href="/landlord/maintenance" cta="Open" tone="rose" />
              ))}
            </div>
          </Panel>

          <Panel title="Payments snapshot" detail="A plain-English view of payment activity. Detailed ledger tools stay in Payments.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FinanceTile label="Received" value={formatCurrency(receivedAmount)} detail="Posted payments and credits" />
              <FinanceTile label="Outstanding" value={formatCurrency(outstandingAmount)} detail="Posted charges minus payments" warning={outstandingAmount > 0} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton href="/landlord/payments" icon={<DollarSign size={16} />} primary>Open payments</ActionButton>
              <ActionButton href="/landlord/ledger" icon={<Building2 size={16} />}>Account history</ActionButton>
            </div>
          </Panel>
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Need portfolio-grade tools?</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Open Property Management Console for inventory, leasing pipelines, residents, maintenance operations, financials, documents, reports, and advanced controls.</p>
            </div>
            <ActionButton href="/landlord/property-management" icon={<Building2 size={16} />}>Open console</ActionButton>
          </div>
        </section>

        {accessRequests.length > 0 ? (
          <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Account access</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {accessRequests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="font-black text-slate-950">{label(request.type)}</p>
                  <p className="mt-1 text-xs text-slate-600">{label(request.status)} / {request.createdAt.toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
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

function ActionRow({ icon, title, detail, href, cta, tone }: { icon: ReactNode; title: string; detail: string; href: string; cta: string; tone: "amber" | "blue" | "rose" | "slate" }) {
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

function RentalCard({ unit }: { unit: {
  id: string;
  unitNumber: string;
  status: string;
  marketingStatus: string;
  marketingHeadline: string | null;
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  property: { name: string; city: string; state: string };
  photos: Array<{ id: string }>;
  leads: Array<{ id: string }>;
  applications: Array<{ id: string; status: string }>;
  maintenanceRequests: Array<{ id: string }>;
} }) {
  const issueCount = unit.leads.length + unit.applications.length + unit.maintenanceRequests.length + (unit.marketingStatus !== "ACTIVE" || unit.photos.length === 0 ? 1 : 0);
  return (
    <Link href={`/landlord/rentals/${unit.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-950">{unit.property.name} #{unit.unitNumber}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{unit.property.city}, {unit.property.state}</p>
        </div>
        <Badge status={unit.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">{unit.marketingHeadline || "Add a listing headline before publishing."}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
        <span className="rounded-xl bg-white p-2">{formatCurrency(unit.rentAmount)}<br />rent</span>
        <span className="rounded-xl bg-white p-2">{unit.bedrooms} / {unit.bathrooms}<br />bed/bath</span>
        <span className="rounded-xl bg-white p-2">{issueCount}<br />actions</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge status={unit.marketingStatus} />
        {unit.photos.length === 0 ? <Badge status="No Photo" /> : null}
        {unit.leads.length > 0 ? <Badge status={`${unit.leads.length} Lead${unit.leads.length === 1 ? "" : "s"}`} /> : null}
      </div>
    </Link>
  );
}

function FinanceTile({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warning ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </div>
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
