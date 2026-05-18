export const dynamic = "force-dynamic";

import Link from "next/link";
import { LedgerEntryStatus, LedgerEntryType, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerAttentionLabel, ledgerBalance, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { ledgerAttentionWhere, ledgerOperationsSnapshot } from "@/lib/ledger-queries";
import { LedgerAmount, LedgerMetricGrid, LedgerQuickLinks, LedgerStatusPill, LedgerTypePill } from "@/components/ledger/LedgerDashboard";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";

function statusClass(status: LedgerEntryStatus) {
  if (status === "VOIDED") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "PENDING") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function amountClass(type: LedgerEntryType, status: LedgerEntryStatus) {
  if (status === "VOIDED") return "text-slate-400 line-through";
  return type === "PAYMENT" || type === "CREDIT" ? "text-emerald-700" : "text-slate-950";
}

export default async function AdminLedgerPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const status = getFilter(searchParams, "status");
  const type = getFilter(searchParams, "type");
  const attention = getFilter(searchParams, "attention");
  const { page, take, skip } = getPagination(searchParams);
  const baseWhere: Prisma.LedgerEntryWhereInput = {
    ...(status ? { status: status as LedgerEntryStatus } : {}),
    ...(type ? { type: type as LedgerEntryType } : {}),
    ...(query ? { OR: [
      { description: { contains: query, mode: "insensitive" } },
      { memo: { contains: query, mode: "insensitive" } },
      { application: { applicantName: { contains: query, mode: "insensitive" } } },
      { tenantUser: { name: { contains: query, mode: "insensitive" } } },
      { unit: { unitNumber: { contains: query, mode: "insensitive" } } },
      { unit: { property: { name: { contains: query, mode: "insensitive" } } } }
    ] } : {})
  };
  const where: Prisma.LedgerEntryWhereInput = { ...baseWhere, ...ledgerAttentionWhere(attention) };
  const [entries, totalEntries, snapshot, applications, schedules] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take,
      skip,
      include: { unit: { include: { property: true } }, application: true, tenantUser: true, createdBy: true }
    }),
    prisma.ledgerEntry.count({ where }),
    ledgerOperationsSnapshot(baseWhere),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      include: { unit: { include: { property: true } }, ledgerEntries: true }
    }),
    prisma.recurringChargeSchedule.findMany({ where: { isActive: true }, orderBy: { nextRunDate: "asc" }, take: 6, include: { unit: { include: { property: true } }, application: true } })
  ]);

  const totalCharges = snapshot.charges;
  const totalPayments = snapshot.payments;
  const totalBalance = snapshot.balance;

  const applicationBalances = applications
    .map((application) => ({ application, balance: ledgerBalance(application.ledgerEntries), oldestCharge: application.ledgerEntries.filter((entry) => entry.status !== "VOIDED" && entry.type === "CHARGE").sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0] }))
    .filter((item) => item.balance !== 0)
    .slice(0, 8);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-6 sm:px-4 lg:px-6">
      <AdminPageHeader title="Rent & Payment Ledger" description="Compact finance command center for balances, aging risk, recurring charges, payment plans, and export-ready reconciliation." actionHref="/admin/ledger/new" actionLabel="Add Entry" />
      <LedgerQuickLinks links={[
        { href: "/admin/ledger/new", label: "Add Entry", primary: true },
        { href: "/admin/ledger/schedules", label: "Recurring" },
        { href: "/admin/ledger/schedules/new", label: "New Schedule" },
        { href: "/admin/ledger/plans", label: "Plans" },
        { href: "/admin/ledger/aging", label: "Aging" },
        { href: "/admin/ledger/reports", label: "Reports" },
        { href: "/admin/ledger/export", label: "CSV" }
      ]} />


      <AdminListControls searchPlaceholder="Search ledger by description, memo, tenant, property, or unit..." defaultQuery={query}>
        <FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(LedgerEntryStatus).map((value) => ({ value, label: ledgerStatusLabel(value) }))]} />
        <FilterSelect name="type" label="Type" defaultValue={type ?? ""} options={[{ value: "", label: "All types" }, ...Object.values(LedgerEntryType).map((value) => ({ value, label: ledgerTypeLabel(value) }))]} />
        <FilterSelect name="attention" label="Attention" defaultValue={attention ?? ""} options={[{ value: "", label: "All entries" }, { value: "overdue", label: "Overdue" }, { value: "due_soon", label: "Due soon" }, { value: "pending", label: "Pending" }, { value: "voided", label: "Voided" }]} />
      </AdminListControls>

      <LedgerMetricGrid metrics={[
        { label: "Open balance", value: formatCurrency(totalBalance), detail: `${snapshot.collectionRate}% collected`, href: "/admin/ledger/aging", tone: totalBalance > 0 ? "amber" : "emerald" },
        { label: "Posted charges", value: formatCurrency(totalCharges), detail: "Charge + adjustment total" },
        { label: "Payments & credits", value: formatCurrency(totalPayments), detail: "Collected / credited", tone: "emerald" },
        { label: "Overdue", value: formatCurrency(snapshot.overdueAmount), detail: `${snapshot.overdueCount} overdue entr${snapshot.overdueCount === 1 ? "y" : "ies"}`, href: "/admin/ledger?attention=overdue", tone: snapshot.overdueCount > 0 ? "rose" : "emerald" }
      ]} />

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 className="text-base font-black text-slate-950">Ledger activity</h2><p className="text-xs font-bold text-slate-500">{totalEntries} matching</p></div>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-[0.68rem] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-600">{entry.postedAt.toLocaleDateString()}<br/><span className="text-xs text-slate-400">{ledgerAttentionLabel(entry)}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-950">{entry.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {entry.unit.unitNumber}</span></td>
                  <td className="px-4 py-3"><LedgerTypePill type={entry.type} /></td>
                  <td className="px-4 py-3 text-slate-700">{entry.description}<br/><span className="text-xs text-slate-500">{entry.application ? entry.application.applicantName : entry.tenantUser?.name || "No application linked"}</span></td>
                  <td className="px-4 py-3"><LedgerStatusPill status={entry.status} /></td>
                  <td className="px-4 py-3 text-right"><LedgerAmount amount={ledgerSignedAmount(entry)} isCredit={entry.type === "PAYMENT" || entry.type === "CREDIT"} muted={entry.status === "VOIDED"} /></td>
                  <td className="px-4 py-3"><Link className="font-black text-brand-700" href={`/admin/ledger/${entry.id}`}>Open</Link></td>
                </tr>
              ))}
              {entries.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No ledger entries have been recorded yet.</td></tr> : null}
            </tbody>
          </table>
          <Pagination pathname="/admin/ledger" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalEntries} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Open application balances</h2>
          <div className="mt-4 grid gap-3">
            {applicationBalances.map(({ application, balance, oldestCharge }) => (
              <Link key={application.id} href={`/admin/applications/${application.id}`} className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="font-black text-slate-950">{application.applicantName}</p>
                <p className="text-sm text-slate-500">{application.unit.property.name} Unit {application.unit.unitNumber}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{agingBucket(oldestCharge?.dueDate)}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(balance)}</p>
              </Link>
            ))}
            {applicationBalances.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No open application balances yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-black text-slate-950">Upcoming recurring schedules</h2><p className="mt-1 text-sm text-slate-500">Use schedules to generate monthly rent charges without manual duplicate entry.</p></div>
          <Link className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white" href="/admin/ledger/schedules">Manage</Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Link key={schedule.id} href={`/admin/ledger/schedules/${schedule.id}`} className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
              <p className="font-black text-slate-950">{schedule.name}</p>
              <p className="text-sm text-slate-500">{schedule.unit.property.name} Unit {schedule.unit.unitNumber}</p>
              <p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(schedule.amount)}</p>
              <p className="text-xs text-slate-500">Next run {schedule.nextRunDate.toLocaleDateString()}</p>
            </Link>
          ))}
          {schedules.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No recurring schedules have been created yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
