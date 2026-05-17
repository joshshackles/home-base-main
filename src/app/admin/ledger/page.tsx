import Link from "next/link";
import { LedgerEntryStatus, LedgerEntryType, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerBalance, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { ledgerTotals } from "@/lib/ledger-queries";
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
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.LedgerEntryWhereInput = {
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
  const [entries, totalEntries, totals, applications, schedules] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take,
      skip,
      include: { unit: { include: { property: true } }, application: true, tenantUser: true, createdBy: true }
    }),
    prisma.ledgerEntry.count({ where }),
    ledgerTotals(),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      include: { unit: { include: { property: true } }, ledgerEntries: true }
    }),
    prisma.recurringChargeSchedule.findMany({ where: { isActive: true }, orderBy: { nextRunDate: "asc" }, take: 6, include: { unit: { include: { property: true } }, application: true } })
  ]);

  const totalCharges = totals.charges;
  const totalPayments = totals.payments;
  const totalBalance = totals.balance;

  const applicationBalances = applications
    .map((application) => ({ application, balance: ledgerBalance(application.ledgerEntries), oldestCharge: application.ledgerEntries.filter((entry) => entry.status !== "VOIDED" && entry.type === "CHARGE").sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0] }))
    .filter((item) => item.balance !== 0)
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Rent & Payment Ledger" description="Track charges, payments, credits, recurring monthly charges, and balances connected to units and applications." actionHref="/admin/ledger/new" actionLabel="Add Ledger Entry" />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/schedules">Recurring Schedules</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/schedules/new">New Monthly Schedule</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/plans">Payment Plans</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/aging">Aging Report</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/reports">Reports & Exports</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/export">Export CSV</Link>
      </div>


      <AdminListControls searchPlaceholder="Search ledger by description, memo, tenant, property, or unit..." defaultQuery={query}>
        <FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(LedgerEntryStatus).map((value) => ({ value, label: ledgerStatusLabel(value) }))]} />
        <FilterSelect name="type" label="Type" defaultValue={type ?? ""} options={[{ value: "", label: "All types" }, ...Object.values(LedgerEntryType).map((value) => ({ value, label: ledgerTypeLabel(value) }))]} />
      </AdminListControls>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Posted Charges</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(totalCharges)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Payments & Credits</p><p className="mt-2 text-4xl font-black text-emerald-700">{formatCurrency(totalPayments)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Open Balance</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(totalBalance)}</p></div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black text-slate-950">Recent ledger activity</h2></div>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-4 text-slate-600">{entry.postedAt.toLocaleDateString()}</td>
                  <td className="px-5 py-4 font-bold text-slate-950">{entry.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {entry.unit.unitNumber}</span></td>
                  <td className="px-5 py-4">{ledgerTypeLabel(entry.type)}</td>
                  <td className="px-5 py-4 text-slate-700">{entry.description}<br/><span className="text-xs text-slate-500">{entry.application ? entry.application.applicantName : entry.tenantUser?.name || "No application linked"}</span></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(entry.status)}`}>{ledgerStatusLabel(entry.status)}</span></td>
                  <td className={`px-5 py-4 text-right font-black ${amountClass(entry.type, entry.status)}`}>{formatCurrency(Math.abs(ledgerSignedAmount(entry)))}</td>
                  <td className="px-5 py-4"><Link className="font-bold text-brand-700" href={`/admin/ledger/${entry.id}`}>Open</Link></td>
                </tr>
              ))}
              {entries.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No ledger entries have been recorded yet.</td></tr> : null}
            </tbody>
          </table>
          <Pagination pathname="/admin/ledger" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalEntries} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-black text-slate-950">Upcoming recurring schedules</h2><p className="mt-1 text-sm text-slate-500">Use schedules to generate monthly rent charges without manual duplicate entry.</p></div>
          <Link className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white" href="/admin/ledger/schedules">Manage</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
