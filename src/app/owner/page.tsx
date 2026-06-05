export const dynamic = "force-dynamic";

import Link from "next/link";
import { DocumentVisibility, LedgerEntryStatus, MaintenancePriority, MaintenanceRequestStatus, OwnerStatementStatus, UnitStatus, type Prisma } from "@prisma/client";
import { Banknote, BriefcaseBusiness, ClipboardCheck, FileText, Home, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

function formatCurrency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function OwnerWorkspacePage() {
  const { user } = await requireWorkspaceAccess("landlord", "/owner");

  const propertyScope: Prisma.PropertyWhereInput = { ownerId: user.userId, isArchived: false };
  const unitScope: Prisma.UnitWhereInput = { property: propertyScope, NOT: { status: UnitStatus.ARCHIVED } };
  const openMaintenanceStatuses = [MaintenanceRequestStatus.NEW, MaintenanceRequestStatus.IN_PROGRESS, MaintenanceRequestStatus.WAITING_ON_VENDOR, MaintenanceRequestStatus.WAITING_ON_TENANT];

  const [
    properties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    openMaintenance,
    urgentMaintenance,
    statements,
    collectedLedger,
    outstandingLedger,
    recentMaintenance,
    recentStatements,
    documentCount,
    unreadThreads
  ] = await Promise.all([
    prisma.property.findMany({ where: propertyScope, include: { units: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.unit.count({ where: unitScope }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.OCCUPIED } }),
    prisma.unit.count({ where: { ...unitScope, status: UnitStatus.AVAILABLE } }),
    prisma.maintenanceRequest.count({ where: { unit: unitScope, status: { in: openMaintenanceStatuses } } }),
    prisma.maintenanceRequest.count({ where: { unit: unitScope, status: { in: openMaintenanceStatuses }, priority: { in: [MaintenancePriority.HIGH, MaintenancePriority.URGENT] } } }),
    prisma.ownerStatement.findMany({ where: { ownerUserId: user.userId }, include: { unit: { include: { property: true } } }, orderBy: { periodEnd: "desc" }, take: 6 }),
    prisma.ledgerEntry.aggregate({ where: { unit: unitScope, status: LedgerEntryStatus.POSTED, OR: [{ paidAt: { not: null } }, { stripePaidAt: { not: null } }] }, _sum: { amount: true } }),
    prisma.ledgerEntry.aggregate({ where: { unit: unitScope, status: LedgerEntryStatus.POSTED, paidAt: null, stripePaidAt: null }, _sum: { amount: true } }),
    prisma.maintenanceRequest.findMany({
      where: { unit: unitScope, status: { in: openMaintenanceStatuses } },
      include: { unit: { include: { property: true } }, assignedTo: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 5
    }),
    prisma.ownerStatement.findMany({ where: { ownerUserId: user.userId }, include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.document.count({
      where: {
        OR: [
          { property: propertyScope },
          { unit: unitScope },
          { application: { unit: unitScope }, visibility: { in: [DocumentVisibility.LANDLORD, DocumentVisibility.SHARED] } }
        ]
      }
    }),
    prisma.messageThread.count({
      where: {
        OR: [{ application: { unit: unitScope } }, { maintenanceRequest: { unit: unitScope } }],
        messages: { some: { senderId: { not: user.userId }, isInternal: false, readByStaffAt: null } }
      }
    })
  ]);

  const collected = collectedLedger._sum.amount ?? 0;
  const outstanding = outstandingLedger._sum.amount ?? 0;
  const finalizedStatements = statements.filter((statement) => statement.status === OwnerStatementStatus.FINALIZED || statement.status === OwnerStatementStatus.EXPORTED).length;
  const occupancy = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const maintenanceSpend = statements.reduce((sum, statement) => sum + Math.max(0, statement.grossCharges - statement.collectedPayments), 0);

  return (
    <main className="space-y-5">
      <CommandCenterHeader
        eyebrow="Owner Workspace"
        title="Executive Portfolio View"
        description="A privacy-safe owner portal for property performance, statements, approvals, shared documents, recent activity, and manager communication."
        actionHref="/landlord/reports"
        actionLabel="Open reports"
        secondaryHref="/landlord/inbox"
        secondaryLabel="Message manager"
        icon={<BriefcaseBusiness className="text-blue-700" size={32} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CommandCenterMetric label="Occupancy" value={`${occupancy}%`} detail={`${occupiedUnits} of ${totalUnits} units`} href="#portfolio" icon={<Home size={20} />} tone={occupancy >= 90 ? "green" : occupancy > 0 ? "blue" : "slate"} />
        <CommandCenterMetric label="Collected" value={formatCurrency(collected)} detail="Paid ledger entries" href="#financials" icon={<Banknote size={20} />} tone="green" />
        <CommandCenterMetric label="Outstanding" value={formatCurrency(outstanding)} detail="Posted open balances" href="#financials" icon={<Banknote size={20} />} tone={outstanding ? "amber" : "green"} />
        <CommandCenterMetric label="Open maintenance" value={openMaintenance} detail={`${urgentMaintenance} urgent`} href="#approvals" icon={<Wrench size={20} />} tone={urgentMaintenance ? "rose" : openMaintenance ? "amber" : "green"} />
        <CommandCenterMetric label="Statements" value={finalizedStatements} detail={`${statements.length} recent statements`} href="#statements" icon={<FileText size={20} />} tone="blue" />
        <CommandCenterMetric label="Unread messages" value={unreadThreads} detail="Manager/workflow threads" href="#activity" icon={<MessageSquareText size={20} />} tone={unreadThreads ? "amber" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <CommandCenterPanel id="portfolio" title="Portfolio Overview" detail="Executive summaries keep owner context clear without exposing applicant screening reports, internal staff notes, or unrelated tenant documents.">
          {properties.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {properties.map((property) => {
                const units = property.units.filter((unit) => unit.status !== UnitStatus.ARCHIVED);
                const occupied = units.filter((unit) => unit.status === UnitStatus.OCCUPIED).length;
                return (
                  <div key={property.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{property.name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{property.addressLine}, {property.city}, {property.state}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <InfoCell label="Units" value={units.length} />
                      <InfoCell label="Occupied" value={occupied} />
                      <InfoCell label="Vacant" value={Math.max(0, units.length - occupied)} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No owner properties yet" detail="Assigned portfolio records will appear here once a property is connected to this owner account." actionLabel="Open inventory" href="/landlord/inventory" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="financials" title="Financial Summary" detail="Shows owner-safe summary figures first, with detailed ledger records available from landlord financial tools.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard title="Rent collected" value={formatCurrency(collected)} detail="Payments marked paid" />
            <InfoCard title="Open balances" value={formatCurrency(outstanding)} detail="Posted ledger balance signals" />
            <InfoCard title="Vacant units" value={vacantUnits} detail="Availability affects owner performance" />
            <InfoCard title="Maintenance reserve signal" value={formatCurrency(maintenanceSpend)} detail="Derived from recent statements" />
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CommandCenterPanel id="statements" title="Statements" detail="Recent owner statements with status, period, unit context, and download/export drilldowns where supported." actionHref="/landlord/payments" actionLabel="Manage statements">
          {recentStatements.length ? (
            <div className="space-y-3">
              {recentStatements.map((statement) => (
                <RecordRow
                  key={statement.id}
                  title={statement.unit ? `${statement.unit.property.name} · Unit ${statement.unit.unitNumber}` : "Portfolio statement"}
                  detail={`${formatDate(statement.periodStart)} to ${formatDate(statement.periodEnd)} · collected ${formatCurrency(statement.collectedPayments)} · outstanding ${formatCurrency(statement.outstandingBalance)}`}
                  status={label(statement.status)}
                  tone={statement.status === OwnerStatementStatus.DRAFT ? "amber" : "green"}
                  href="/landlord/payments"
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No statements generated yet" detail="Statements will appear here after they are generated from landlord financial tools." actionLabel="Open payments" href="/landlord/payments" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="approvals" title="Maintenance Approvals" detail="Owner-facing maintenance focuses on what needs attention, estimate context, and manager communication.">
          {recentMaintenance.length ? (
            <div className="space-y-3">
              {recentMaintenance.map((request) => (
                <RecordRow
                  key={request.id}
                  title={request.subject}
                  detail={`${request.unit?.property.name ?? "No property"} · Unit ${request.unit?.unitNumber ?? "not linked"} · assigned ${request.assignedTo?.name ?? request.assignedTo?.email ?? "not assigned"}`}
                  status={`${label(request.priority)} · ${label(request.status)}`}
                  tone={request.priority === MaintenancePriority.URGENT || request.priority === MaintenancePriority.HIGH ? "rose" : "amber"}
                  href="/landlord/maintenance"
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No maintenance approvals waiting" detail="Repair estimates, invoices, or urgent approvals will appear here when manager action is needed." actionLabel="Open maintenance" href="/landlord/maintenance" />
          )}
        </CommandCenterPanel>
      </section>

      <CommandCenterSurface>
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <RecordRow title="Shared documents" detail={`${documentCount} owner-safe document${documentCount === 1 ? "" : "s"} are connected to your portfolio records.`} status="Privacy-safe" tone="blue" href="/landlord/documents" />
          <RecordRow title="Recent activity" detail="Use activity and reports for manager-visible changes without exposing applicant PII or internal screening information." status="Available" tone="green" href="/landlord/reports" />
          <RecordRow title="Message manager" detail={`${unreadThreads} unread thread${unreadThreads === 1 ? "" : "s"} may need a response from your team.`} status={unreadThreads ? "Reply needed" : "Clear"} tone={unreadThreads ? "amber" : "slate"} href="/landlord/inbox" />
        </div>
      </CommandCenterSurface>
    </main>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function RecordRow({ title, detail, status, tone, href }: { title: string; detail: string; status: string; tone: "slate" | "blue" | "green" | "amber" | "rose"; href: string }) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700"
  }[tone];

  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${classes}`}>{status}</span>
      </div>
    </Link>
  );
}

function EmptyState({ title, detail, actionLabel, href }: { title: string; detail: string; actionLabel: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
      <Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
        {actionLabel}
      </Link>
    </div>
  );
}
