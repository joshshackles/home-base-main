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
const dashboardTabs = ["overview", "units", "tenants", "financials", "maintenance", "documents", "activity"] as const;
type DashboardTab = typeof dashboardTabs[number];

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

export default async function LandlordDashboardPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const activeTab = dashboardTabs.includes(searchParams?.tab as DashboardTab) ? searchParams?.tab as DashboardTab : "overview";
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
  const featuredProperty = properties[0] ?? null;
  const featuredPropertyUnits = featuredProperty?.units.length ?? unitCount;
  const propertyLabel = featuredProperty ? featuredProperty.name : "Your rental portfolio";
  const propertyAddress = featuredProperty ? `${featuredProperty.addressLine}, ${featuredProperty.city}, ${featuredProperty.state} ${featuredProperty.zip}` : "Add a property to start tracking performance.";
  const urgentMaintenance = maintenanceRequests.filter((request) => request.priority === "URGENT" || request.priority === "HIGH").length;
  const pendingApplications = recentApplications.filter((application) => application.status === "SUBMITTED" || application.status === "UNDER_REVIEW").length;
  const maintenanceUnits = allUnits.filter((unit) => unit.maintenanceRequests.length > 0).length;

  const todayItems = [
    unreadThreadCount > 0 ? { title: "Reply to messages", detail: `${unreadThreadCount} unread conversation${unreadThreadCount === 1 ? "" : "s"} need a response.`, href: "/landlord/inbox", cta: "Open messages", icon: <MessageSquare size={18} />, tone: "amber" as const } : null,
    totalOpenApplications > 0 ? { title: "Review applications", detail: `${totalOpenApplications} application${totalOpenApplications === 1 ? "" : "s"} are started, submitted, or under review.`, href: "/landlord/applications", cta: "Review", icon: <ClipboardList size={18} />, tone: "blue" as const } : null,
    totalNewLeads > 0 ? { title: "Follow up with leads", detail: `${totalNewLeads} new lead${totalNewLeads === 1 ? "" : "s"} are waiting on your rentals.`, href: "/landlord/inbox", cta: "Reply", icon: <Inbox size={18} />, tone: "amber" as const } : null,
    totalOpenMaintenance > 0 ? { title: "Check maintenance", detail: `${totalOpenMaintenance} repair request${totalOpenMaintenance === 1 ? "" : "s"} are open.`, href: "/landlord/maintenance", cta: "View repairs", icon: <Wrench size={18} />, tone: "rose" as const } : null,
    incompleteUnits.length > 0 ? { title: "Finish listing details", detail: `${incompleteUnits.length} rental${incompleteUnits.length === 1 ? "" : "s"} need photos, lease terms, headline, or description.`, href: "/landlord/rentals", cta: "Fix listings", icon: <AlertTriangle size={18} />, tone: "amber" as const } : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <main id="main-content" className="min-h-screen bg-[#f7faff]">
      <div className="mx-auto max-w-[1520px] px-3 py-4 sm:px-5 lg:px-6">
        <section className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <PropertyPhoto />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Property dashboard</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{propertyLabel}</h1>
                <p className="mt-1 truncate text-sm font-semibold text-slate-600">{propertyAddress}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton href="/landlord/inventory" icon={<Building2 size={16} />}>All properties</ActionButton>
              <ActionButton href="/landlord/rentals/new" icon={<Plus size={16} />} primary>Quick action</ActionButton>
              <Link href="#today" className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" aria-label="Open tasks and alerts">
                <AlertTriangle size={17} />
                {attentionCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">{attentionCount}</span> : null}
              </Link>
            </div>
          </div>

          <DashboardTabs activeTab={activeTab} />

          <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:grid-cols-2 xl:grid-cols-6">
            <CommandMetric title="Occupancy" value={`${occupancyRate}%`} detail={`${occupiedUnits.length} of ${unitCount} units`} href="/landlord/inventory?view=occupied" tone="green" icon={<Users size={18} />} />
            <CommandMetric title="Rent collected" value={formatCurrency(receivedAmount)} detail="Posted payments" href="/landlord/payments" tone="green" icon={<DollarSign size={18} />} />
            <CommandMetric title="Rent outstanding" value={formatCurrency(outstandingAmount)} detail="Current posted balance" href="/landlord/payments" tone={outstandingAmount > 0 ? "rose" : "slate"} icon={<DollarSign size={18} />} />
            <CommandMetric title="Open maintenance" value={totalOpenMaintenance} detail={`${urgentMaintenance} urgent`} href="/landlord/maintenance" tone={totalOpenMaintenance > 0 ? "amber" : "slate"} icon={<Wrench size={18} />} />
            <CommandMetric title="Pending applications" value={pendingApplications || totalOpenApplications} detail={`${totalOpenApplications} active packets`} href="/landlord/applications" tone="blue" icon={<ClipboardList size={18} />} />
            <CommandMetric title="Lease tasks" value={leaseTaskCount} detail="Signature or review work" href="/landlord/leases" tone={leaseTaskCount > 0 ? "blue" : "slate"} icon={<Home size={18} />} />
          </div>

          <CommandCenterTabContent
            activeTab={activeTab}
            occupiedUnits={occupiedUnits.length}
            vacantUnits={vacantUnits.length}
            maintenanceUnits={maintenanceUnits}
            totalUnits={featuredPropertyUnits || unitCount}
            units={units}
            applications={recentApplications}
            maintenanceRequests={maintenanceRequests}
            threads={recentThreads}
            tasks={todayItems}
            receivedAmount={receivedAmount}
            outstandingAmount={outstandingAmount}
            leaseTaskCount={leaseTaskCount}
          />
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

        {activeTab === "overview" ? <><section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
        ) : null}</> : null}
      </div>
    </main>
  );
}

function PropertyPhoto() {
  return (
    <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-blue-100 via-white to-emerald-100 shadow-sm">
      <Building2 className="text-blue-700" size={30} />
    </div>
  );
}

function DashboardTabs({ activeTab }: { activeTab: DashboardTab }) {
  const tabs = [
    ["overview", "Overview"],
    ["units", "Units"],
    ["tenants", "Tenants"],
    ["financials", "Financials"],
    ["maintenance", "Maintenance"],
    ["documents", "Documents"],
    ["activity", "Activity"]
  ] satisfies Array<[DashboardTab, string]>;
  return (
    <nav className="overflow-x-auto border-b border-slate-200 px-4" aria-label="Landlord command center sections">
      <div className="flex min-w-max gap-6">
        {tabs.map(([id, tab]) => (
          <Link key={id} href={id === "overview" ? "/landlord" : `/landlord?tab=${id}`} className={`border-b-2 px-1 py-3 text-sm font-black ${activeTab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}>
            {tab}
          </Link>
        ))}
      </div>
    </nav>
  );
}

type DashboardTask = { title: string; detail: string; href: string; cta: string; icon: ReactNode; tone: "amber" | "blue" | "rose" | "slate" };
type DashboardUnit = {
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
};

function CommandCenterTabContent({
  activeTab,
  occupiedUnits,
  vacantUnits,
  maintenanceUnits,
  totalUnits,
  units,
  applications,
  maintenanceRequests,
  threads,
  tasks,
  receivedAmount,
  outstandingAmount,
  leaseTaskCount
}: {
  activeTab: DashboardTab;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  totalUnits: number;
  units: DashboardUnit[];
  applications: ActivityApplication[];
  maintenanceRequests: ActivityMaintenance[];
  threads: ActivityThread[];
  tasks: DashboardTask[];
  receivedAmount: number;
  outstandingAmount: number;
  leaseTaskCount: number;
}) {
  if (activeTab === "units") {
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Units" detail="Manage occupancy, rent, listing status, open work, and each unit workspace from one command-center view." actionHref="/landlord/inventory" actionLabel="Open full unit manager" />
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Rent</th>
                  <th className="px-4 py-3">Open work</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.slice(0, 8).map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4"><p className="font-black text-slate-950">{unit.property.name} #{unit.unitNumber}</p><p className="text-xs font-semibold text-slate-500">{unit.property.city}, {unit.property.state}</p></td>
                    <td className="px-4 py-4 text-slate-600">{unit.bedrooms} Bed / {unit.bathrooms} Bath</td>
                    <td className="px-4 py-4"><Badge status={unit.status} /></td>
                    <td className="px-4 py-4"><Badge status={unit.marketingStatus} /></td>
                    <td className="px-4 py-4 font-black text-slate-950">{formatCurrency(unit.rentAmount)}</td>
                    <td className="px-4 py-4 text-slate-600">{unit.leads.length} leads / {unit.applications.length} apps / {unit.maintenanceRequests.length} repairs</td>
                    <td className="px-4 py-4 text-right"><Link href={`/landlord/units/${unit.id}/workspace`} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 lg:hidden">
            {units.slice(0, 8).map((unit) => <RentalCard key={unit.id} unit={unit} />)}
          </div>
          {units.length === 0 ? <div className="p-4"><EmptyState title="No units yet" detail="Add your first unit to start managing listings, applicants, residents, payments, and work orders." /></div> : null}
        </div>
      </div>
    );
  }

  if (activeTab === "tenants") {
    const occupied = units.filter((unit) => unit.status === "OCCUPIED");
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Tenants" detail="Resident status, lease context, balances, messages, and move-out work start here." actionHref="/landlord/residents" actionLabel="Open residents" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SummaryPanel title="Occupied units" value={occupied.length} detail={`${vacantUnits} vacant units remain available.`} />
          <SummaryPanel title="Lease tasks" value={leaseTaskCount} detail="Drafts, review packets, and signatures." />
          <SummaryPanel title="Resident messages" value={threads.length} detail="Recent resident or applicant conversations." />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {occupied.slice(0, 6).map((unit) => <RentalCard key={unit.id} unit={unit} />)}
          {occupied.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No occupied units yet" detail="Approved applicants and assigned residents will appear here once a unit is occupied." /></div> : null}
        </div>
      </div>
    );
  }

  if (activeTab === "financials") {
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Financials" detail="A landlord-friendly rent and balance snapshot, with detailed ledger tools one click away." actionHref="/landlord/payments" actionLabel="Open payments" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FinanceTile label="Received" value={formatCurrency(receivedAmount)} detail="Posted payments and credits" />
          <FinanceTile label="Outstanding" value={formatCurrency(outstandingAmount)} detail="Posted charges minus payments" warning={outstandingAmount > 0} />
          <SummaryPanel title="Units tracked" value={totalUnits} detail="Rent roll and unit balances feed this view." />
        </div>
      </div>
    );
  }

  if (activeTab === "maintenance") {
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Maintenance" detail="Open repairs, urgent follow-up, tenant communication, and work-order action." actionHref="/landlord/maintenance" actionLabel="Open maintenance" />
        <div className="mt-4 grid gap-3">
          {maintenanceRequests.length === 0 ? <EmptyState title="No open maintenance" detail="Open tenant requests and assigned repair work will appear here." /> : maintenanceRequests.map((request) => (
            <ActionRow key={request.id} icon={<Wrench size={18} />} title={request.subject} detail={`${request.unit ? `${request.unit.property.name} #${request.unit.unitNumber}` : "No unit linked"} / ${label(request.priority)} / updated ${timeAgo(request.updatedAt)}`} href="/landlord/maintenance" cta="Open" tone="rose" />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "documents") {
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Documents" detail="Leases, notices, application files, inspection reports, invoices, and property documents stay connected to the right record." actionHref="/landlord/documents" actionLabel="Open documents" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SummaryPanel title="Lease packets" value={leaseTaskCount} detail="Draft, review, and signature work." />
          <SummaryPanel title="Application files" value={applications.length} detail="Recent active application packets." />
          <SummaryPanel title="Maintenance files" value={maintenanceRequests.length} detail="Open repair records that may include media." />
        </div>
      </div>
    );
  }

  if (activeTab === "activity") {
    return (
      <div className="bg-slate-50/70 p-4">
        <FocusHeader title="Activity" detail="A chronological view of applications, messages, maintenance, lease work, and operational changes." actionHref="/landlord/timeline" actionLabel="Open timeline" />
        <div className="mt-4">
          <RecentActivityPanel applications={applications} maintenanceRequests={maintenanceRequests} threads={threads} />
        </div>
      </div>
    );
  }

  return (
    <div id="today" className="grid gap-4 bg-slate-50/70 p-4 xl:grid-cols-[1.05fr_1fr_1fr]">
      <UnitStatusPanel occupied={occupiedUnits} vacant={vacantUnits} maintenance={maintenanceUnits} total={totalUnits} />
      <RecentActivityPanel applications={applications} maintenanceRequests={maintenanceRequests} threads={threads} />
      <TasksPanel items={tasks} />
    </div>
  );
}

function FocusHeader({ title, detail, actionHref, actionLabel }: { title: string; detail: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{detail}</p>
      </div>
      <Link href={actionHref} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">{actionLabel}</Link>
    </div>
  );
}

function SummaryPanel({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function CommandMetric({ title, value, detail, href, icon, tone }: { title: string; value: string | number; detail: string; href: string; icon: ReactNode; tone: "amber" | "blue" | "green" | "rose" | "slate" }) {
  const toneClass = {
    amber: "text-amber-900",
    blue: "text-blue-900",
    green: "text-emerald-900",
    rose: "text-rose-900",
    slate: "text-slate-900"
  }[tone];
  const iconClass = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-50 text-slate-700"
  }[tone];

  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-500">{title}</p>
          <p className={`mt-1 truncate text-2xl font-black ${toneClass}`}>{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span>
      </div>
    </Link>
  );
}

function UnitStatusPanel({ occupied, vacant, maintenance, total }: { occupied: number; vacant: number; maintenance: number; total: number }) {
  const safeTotal = Math.max(total, occupied + vacant + maintenance, 1);
  const occupiedPct = Math.round((occupied / safeTotal) * 100);
  const vacantPct = Math.round((vacant / safeTotal) * 100);
  const maintenancePct = Math.round((maintenance / safeTotal) * 100);
  const donutStyle = {
    background: `conic-gradient(#22c55e 0 ${occupiedPct}%, #93c5fd ${occupiedPct}% ${occupiedPct + vacantPct}%, #f59e0b ${occupiedPct + vacantPct}% ${occupiedPct + vacantPct + maintenancePct}%, #e2e8f0 ${occupiedPct + vacantPct + maintenancePct}% 100%)`
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black text-slate-950">Unit status</h2>
        <Link href="/landlord/inventory" className="text-xs font-black text-blue-700 hover:text-blue-900">View all units</Link>
      </div>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_1fr]">
        <div className="relative mx-auto h-36 w-36 rounded-full" style={donutStyle}>
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-3xl font-black text-slate-950">{safeTotal === 1 && total === 0 ? 0 : total}</span>
            <span className="text-[11px] font-bold uppercase text-slate-500">Total units</span>
          </div>
        </div>
        <div className="grid gap-3 text-sm">
          <LegendDot color="bg-emerald-500" label="Occupied" value={`${occupied} (${occupiedPct}%)`} />
          <LegendDot color="bg-blue-300" label="Vacant" value={`${vacant} (${vacantPct}%)`} />
          <LegendDot color="bg-amber-500" label="Maintenance" value={`${maintenance} (${maintenancePct}%)`} />
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label: dotLabel, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-semibold text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{dotLabel}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

type ActivityApplication = {
  id: string;
  applicantName: string;
  status: string;
  updatedAt: Date;
  unit: { unitNumber: string; property: { name: string } };
};

type ActivityMaintenance = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: Date;
  unit: { unitNumber: string; property: { name: string } } | null;
};

type ActivityThread = {
  id: string;
  subject: string;
  lastMessageAt: Date | null;
};

function RecentActivityPanel({ applications, maintenanceRequests, threads }: { applications: ActivityApplication[]; maintenanceRequests: ActivityMaintenance[]; threads: ActivityThread[] }) {
  const rows = [
    ...applications.slice(0, 2).map((application) => ({
      id: `app-${application.id}`,
      icon: <ClipboardList size={15} />,
      title: `Application ${label(application.status).toLowerCase()}`,
      detail: `${application.applicantName} / ${application.unit.property.name} #${application.unit.unitNumber}`,
      time: application.updatedAt,
      href: `/landlord/applications/${application.id}`,
      tone: "blue" as const
    })),
    ...maintenanceRequests.slice(0, 2).map((request) => ({
      id: `maintenance-${request.id}`,
      icon: <Wrench size={15} />,
      title: `Maintenance ${label(request.status).toLowerCase()}`,
      detail: request.unit ? `${request.subject} / ${request.unit.property.name} #${request.unit.unitNumber}` : request.subject,
      time: request.updatedAt,
      href: "/landlord/maintenance",
      tone: "green" as const
    })),
    ...threads.slice(0, 2).map((thread) => ({
      id: `thread-${thread.id}`,
      icon: <MessageSquare size={15} />,
      title: "Message received",
      detail: thread.subject,
      time: thread.lastMessageAt ?? new Date(),
      href: `/landlord/inbox?thread=${thread.id}`,
      tone: "amber" as const
    }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black text-slate-950">Recent activity</h2>
        <Link href="/landlord/timeline" className="text-xs font-black text-blue-700 hover:text-blue-900">View activity</Link>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.length === 0 ? <EmptyState title="No recent activity yet" detail="Applications, repairs, messages, payments, and document updates will appear here." /> : rows.map((row) => (
          <Link key={row.id} href={row.href} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-white">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.tone === "blue" ? "bg-blue-50 text-blue-700" : row.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{row.title}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{row.detail}</span>
            </span>
            <span className="text-xs font-bold text-slate-500">{timeAgo(row.time)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TasksPanel({ items }: { items: Array<{ title: string; detail: string; href: string; cta: string; icon: ReactNode; tone: "amber" | "blue" | "rose" | "slate" }> }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black text-slate-950">Tasks and alerts</h2>
        <Link href="#today" className="text-xs font-black text-blue-700 hover:text-blue-900">Review all</Link>
      </div>
      <div className="mt-4 grid gap-2">
        {items.length === 0 ? <EmptyState title="No open alerts" detail="Urgent maintenance, missing application items, unread messages, and listing gaps are clear." /> : items.slice(0, 4).map((item) => (
          <Link key={item.title} href={item.href} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 hover:bg-white">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tone === "rose" ? "bg-rose-50 text-rose-700" : item.tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{item.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
              <span className="mt-0.5 block line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
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
