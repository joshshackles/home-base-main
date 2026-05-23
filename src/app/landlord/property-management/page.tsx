export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileSignature,
  FileText,
  Inbox,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const activeApplicationStatuses = ["STARTED", "SUBMITTED", "UNDER_REVIEW"] as const;
const openMaintenanceStatuses = ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] as const;
const activeInspectionStatuses = ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] as const;
const openLeasePacketStatuses = ["DRAFT", "READY_FOR_REVIEW", "SENT_FOR_SIGNATURE"] as const;
const openTaskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING"] as const;

function metricTone(count: number) {
  return count > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default async function PropertyManagementConsolePage() {
  const user = await requireRole(["LANDLORD"], "/landlord/property-management");
  const unitScope: Prisma.UnitWhereInput = {
    OR: [
      { property: { ownerId: user.userId, isArchived: false } },
      { propertyManagerUserId: user.userId, property: { isArchived: false } }
    ],
    NOT: { status: "ARCHIVED" }
  };
  const propertyScope: Prisma.PropertyWhereInput = {
    OR: [
      { ownerId: user.userId, isArchived: false },
      { units: { some: { propertyManagerUserId: user.userId, NOT: { status: "ARCHIVED" } } } }
    ]
  };
  const taskScope: Prisma.TaskItemWhereInput = {
    OR: [{ unit: unitScope }, { property: propertyScope }, { application: { unit: unitScope } }, { maintenanceRequest: { unit: unitScope } }, { leasePacket: { application: { unit: unitScope } } }]
  };

  const [
    propertyCount,
    unitCount,
    occupiedUnits,
    vacantUnits,
    activeListings,
    draftListings,
    applications,
    leads,
    maintenance,
    inspections,
    leasePackets,
    documentRequests,
    openTasks,
    chargeTotals,
    paymentTotals,
    recentUnits,
    recentApplications,
    recentMaintenance
  ] = await Promise.all([
    prisma.property.count({ where: propertyScope }),
    prisma.unit.count({ where: unitScope }),
    prisma.unit.count({ where: { ...unitScope, status: "OCCUPIED" } }),
    prisma.unit.count({ where: { ...unitScope, status: "AVAILABLE" } }),
    prisma.unit.count({ where: { ...unitScope, marketingStatus: "ACTIVE" } }),
    prisma.unit.count({ where: { ...unitScope, marketingStatus: { in: ["DRAFT", "PAUSED"] } } }),
    prisma.application.count({ where: { unit: unitScope, status: { in: [...activeApplicationStatuses] } } }),
    prisma.lead.count({ where: { unit: unitScope, status: { in: ["NEW", "CONTACTED"] } } }),
    prisma.maintenanceRequest.count({ where: { unit: unitScope, status: { in: [...openMaintenanceStatuses] } } }),
    prisma.inspection.count({ where: { unit: unitScope, status: { in: [...activeInspectionStatuses] } } }),
    prisma.leasePacket.count({ where: { application: { unit: unitScope }, status: { in: [...openLeasePacketStatuses] } } }),
    prisma.documentRequest.count({ where: { application: { unit: unitScope }, status: { in: ["REQUESTED", "REJECTED"] } } }),
    prisma.taskItem.count({ where: { ...taskScope, status: { in: [...openTaskStatuses] } } }),
    prisma.ledgerEntry.aggregate({ where: { unit: unitScope, status: "POSTED", type: "CHARGE" }, _sum: { amount: true } }),
    prisma.ledgerEntry.aggregate({ where: { unit: unitScope, status: "POSTED", type: { in: ["PAYMENT", "CREDIT"] } }, _sum: { amount: true } }),
    prisma.unit.findMany({
      where: unitScope,
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      include: {
        property: { select: { name: true, city: true, state: true } },
        _count: {
          select: {
            leads: { where: { status: { in: ["NEW", "CONTACTED"] } } },
            applications: { where: { status: { in: [...activeApplicationStatuses] } } },
            maintenanceRequests: { where: { status: { in: [...openMaintenanceStatuses] } } }
          }
        }
      }
    }),
    prisma.application.findMany({
      where: { unit: unitScope, status: { in: [...activeApplicationStatuses] } },
      orderBy: [{ updatedAt: "desc" }],
      take: 4,
      include: { unit: { include: { property: { select: { name: true } } } } }
    }),
    prisma.maintenanceRequest.findMany({
      where: { unit: unitScope, status: { in: [...openMaintenanceStatuses] } },
      orderBy: [{ updatedAt: "desc" }],
      take: 4,
      include: { unit: { include: { property: { select: { name: true } } } } }
    })
  ]);

  const occupancyRate = percent(occupiedUnits, unitCount);
  const totalCharges = chargeTotals._sum.amount ?? 0;
  const totalPayments = paymentTotals._sum.amount ?? 0;
  const outstandingBalance = Math.max(totalCharges - totalPayments, 0);
  const exceptionCount = vacantUnits + draftListings + applications + leads + maintenance + inspections + leasePackets + documentRequests + openTasks;

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Property management mode</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Portfolio Operations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Professional-grade command center for inventory, leasing, residents, maintenance, financials, documents, compliance signals, and portfolio exceptions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConsoleButton href="/landlord/inventory" primary>Open Inventory</ConsoleButton>
            <ConsoleButton href="/landlord/applications">Review Applications</ConsoleButton>
            <ConsoleButton href="/landlord/reports">Open Reports</ConsoleButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Portfolio" value={unitCount} detail={`${propertyCount} properties`} icon={<Building2 size={18} />} href="/landlord/inventory" />
          <MetricCard label="Occupancy" value={`${occupancyRate}%`} detail={`${occupiedUnits} occupied / ${vacantUnits} vacant`} icon={<Users size={18} />} href="/landlord/inventory?view=vacant" tone={metricTone(vacantUnits)} />
          <MetricCard label="Marketing" value={activeListings} detail={`${draftListings} draft or paused`} icon={<BarChart3 size={18} />} href="/landlord/inventory?view=listed" tone={metricTone(draftListings)} />
          <MetricCard label="Leasing" value={applications + leads} detail={`${applications} applications / ${leads} leads`} icon={<ClipboardList size={18} />} href="/landlord/applications" tone={metricTone(applications + leads)} />
          <MetricCard label="Operations" value={maintenance + inspections} detail={`${maintenance} repairs / ${inspections} inspections`} icon={<Wrench size={18} />} href="/landlord/maintenance" tone={metricTone(maintenance + inspections)} />
          <MetricCard label="Receivable" value={formatCurrency(outstandingBalance)} detail={`${formatCurrency(totalPayments)} collected`} icon={<DollarSign size={18} />} href="/landlord/payments" tone={metricTone(outstandingBalance)} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <Panel title="Command queues" detail={`${exceptionCount} portfolio signal${exceptionCount === 1 ? "" : "s"} currently need visibility across leasing, operations, documents, and financials.`}>
          <div className="grid gap-3 md:grid-cols-2">
            <QueueLink href="/landlord/inventory?view=vacant" icon={<Building2 size={18} />} title="Vacant inventory" detail="Units that need pricing, turnover, listing, or leasing follow-up." count={vacantUnits} />
            <QueueLink href="/landlord/inventory?view=unlisted" icon={<AlertTriangle size={18} />} title="Listing readiness" detail="Draft or paused listings that are not actively marketing." count={draftListings} />
            <QueueLink href="/landlord/inbox" icon={<Inbox size={18} />} title="Lead and message triage" detail="New prospects and conversations that need staff attention." count={leads} />
            <QueueLink href="/landlord/applications" icon={<ClipboardList size={18} />} title="Application review" detail="Applications that are started, submitted, or under review." count={applications} />
            <QueueLink href="/landlord/maintenance" icon={<Wrench size={18} />} title="Maintenance operations" detail="Open work orders, assignments, estimates, and repair follow-up." count={maintenance} />
            <QueueLink href="/landlord/inspections" icon={<ShieldCheck size={18} />} title="Inspection queue" detail="Scheduled, active, or reinspection work that needs coordination." count={inspections} />
            <QueueLink href="/landlord/documents" icon={<FileSignature size={18} />} title="Lease and signature queue" detail="Lease packets waiting on review, approval, or signatures." count={leasePackets} />
            <QueueLink href="/landlord/documents" icon={<FileText size={18} />} title="Document requests" detail="Requested or rejected documents that need upload, review, or follow-up." count={documentRequests} />
            <QueueLink href="/landlord/tasks" icon={<CalendarDays size={18} />} title="Open task load" detail="Assigned operational tasks that are not yet complete." count={openTasks} />
            <QueueLink href="/landlord/payments" icon={<DollarSign size={18} />} title="Financial review" detail="Open receivables, payments, deposits, adjustments, and exports." count={outstandingBalance} label={formatCurrency(outstandingBalance)} />
          </div>
        </Panel>

        <Panel title="Professional workflows" detail="Use these modules when the work needs portfolio-level controls rather than a single-rental task list.">
          <div className="grid gap-2">
            <WorkflowLink href="/landlord/inventory" title="Inventory Console" detail="Properties, buildings, units, occupancy, marketing state, balances, and workspace links." icon={<Building2 size={17} />} />
            <WorkflowLink href="/landlord/tenants" title="Resident Operations" detail="Households, tenants, lease dates, document requests, balances, and conversations." icon={<Users size={17} />} />
            <WorkflowLink href="/landlord/documents" title="Documents & Leases" detail="Lease packets, sharing, signature queue, templates, and audit state." icon={<FileText size={17} />} />
            <WorkflowLink href="/landlord/reports" title="Reports & Analytics" detail="Occupancy, leasing funnel, maintenance cost, delinquency, cash flow, and exports." icon={<BarChart3 size={17} />} />
            <WorkflowLink href="/landlord/team" title="Team & Vendors" detail="Staff assignment, vendor workflows, field work, invoices, and approvals." icon={<Wrench size={17} />} />
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Portfolio snapshot" detail="Current operating state by unit, listing, and occupancy.">
          <div className="grid gap-3">
            {recentUnits.length > 0 ? recentUnits.map((unit) => (
              <SnapshotRow
                key={unit.id}
                href={`/landlord/units/${unit.id}/workspace`}
                title={`${unit.property.name} #${unit.unitNumber}`}
                detail={`${unit.property.city}, ${unit.property.state}`}
                badge={unit.status.replaceAll("_", " ")}
                meta={`${unit._count.leads} leads • ${unit._count.applications} applications • ${unit._count.maintenanceRequests} repairs`}
              />
            )) : <EmptyState title="No inventory yet" detail="Add your first property and unit to start managing portfolio operations from this console." href="/landlord/properties/new" action="Add property" />}
          </div>
        </Panel>

        <Panel title="Leasing activity" detail="Applications and prospects moving through the leasing funnel.">
          <div className="grid gap-3">
            {recentApplications.length > 0 ? recentApplications.map((application) => (
              <SnapshotRow
                key={application.id}
                href={`/landlord/applications/${application.id}`}
                title={application.applicantName}
                detail={`${application.unit.property.name} #${application.unit.unitNumber}`}
                badge={application.status.replaceAll("_", " ")}
                meta={`Updated ${formatDate(application.updatedAt)}`}
              />
            )) : <EmptyState title="No active applications" detail="Applications that are started, submitted, or under review will appear here when renters apply." href="/landlord/applications" action="Open applications" />}
          </div>
        </Panel>

        <Panel title="Maintenance focus" detail="Open repair work and operational follow-up.">
          <div className="grid gap-3">
            {recentMaintenance.length > 0 ? recentMaintenance.map((request) => (
              <SnapshotRow
                key={request.id}
                href={`/landlord/maintenance/${request.id}`}
                title={request.subject}
                detail={request.unit ? `${request.unit.property.name} #${request.unit.unitNumber}` : "Portfolio maintenance request"}
                badge={request.status.replaceAll("_", " ")}
                meta={`${request.priority.toLowerCase()} priority • Updated ${formatDate(request.updatedAt)}`}
              />
            )) : <EmptyState title="No open maintenance" detail="Open work orders, tenant requests, and vendor follow-up will show here when attention is needed." href="/landlord/maintenance" action="Open maintenance" />}
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <DollarSign size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">Financial operations</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Portfolio-level rent, payment, deposit, ledger, and export controls stay in the professional console.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Posted charges" value={formatCurrency(totalCharges)} />
            <MiniMetric label="Payments and credits" value={formatCurrency(totalPayments)} />
            <MiniMetric label="Open receivable" value={formatCurrency(outstandingBalance)} warn={outstandingBalance > 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ConsoleButton href="/landlord/payments" primary>Open Payments</ConsoleButton>
            <ConsoleButton href="/landlord/reports">Financial Reports</ConsoleButton>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Mode strategy</h2>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6">
                Simple Landlord mode stays focused on daily owner tasks. Property Management mode is the professional operating layer for larger portfolios, team workflows, leasing queues, maintenance coordination, documents, reporting, and financial controls. Existing landlord routes remain available in both modes.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ConsoleButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}

function MetricCard({ label, value, detail, href, icon, tone = "border-slate-200 bg-slate-50 text-slate-900" }: { label: string; value: string | number; detail: string; href: string; icon: React.ReactNode; tone?: string }) {
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</span>
        <ArrowRight size={16} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </Link>
  );
}

function Panel({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function QueueLink({ href, icon, title, detail, count, label }: { href: string; icon: React.ReactNode; title: string; detail: string; count: number; label?: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${count > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{label ?? count}</span>
      </div>
      <h3 className="mt-3 font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{detail}</p>
    </Link>
  );
}

function WorkflowLink({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-white">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">{icon}</span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{detail}</span>
      </span>
    </Link>
  );
}

function SnapshotRow({ href, title, detail, badge, meta }: { href: string; title: string; detail: string; badge: string; meta: string }) {
  return (
    <Link href={href} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white">
      <span className="min-w-0">
        <span className="block truncate font-black text-slate-950">{title}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-slate-600">{detail}</span>
        <span className="mt-2 block text-xs font-semibold text-slate-500">{meta}</span>
      </span>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm">{badge}</span>
    </Link>
  );
}

function MiniMetric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${warn ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700">
        {action}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
