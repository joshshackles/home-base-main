import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { agingBucket, installmentStatusLabel, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel, paymentPlanStatusLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { DEFAULT_PAGE_SIZE, SearchParams, getPagination } from "@/lib/pagination";
import { ledgerTotals } from "@/lib/ledger-queries";

export default async function LandlordLedgerPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireRole(["LANDLORD"], "/landlord/ledger");
  const { page, take, skip } = getPagination(searchParams);
  const ledgerWhere: Prisma.LedgerEntryWhereInput = { unit: { property: { ownerId: user.userId } } };
  const [entries, totalEntries, totals, plans] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take,
      skip,
      include: { unit: { include: { property: true } }, application: true, tenantUser: true }
    }),
    prisma.ledgerEntry.count({ where: ledgerWhere }),
    ledgerTotals(ledgerWhere),
    prisma.paymentPlan.findMany({
      where: { unit: { property: { ownerId: user.userId } } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { unit: { include: { property: true } }, application: true, tenantUser: true, installments: { orderBy: { dueDate: "asc" } } }
    })
  ]);
  const balance = totals.balance;
  const charges = totals.charges;
  const payments = totals.payments;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Ledger" description="Review charges, payments, credits, and balances connected to your assigned units." />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Charges</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(charges)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Payments & Credits</p><p className="mt-2 text-4xl font-black text-emerald-700">{formatCurrency(payments)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Balance</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(balance)}</p></div>
      </section>

      {plans.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Payment plans</h2>
          <p className="mt-1 text-sm text-slate-500">Plans connected to your assigned units are visible here.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const nextDue = plan.installments.find((item) => item.status === "DUE" || item.status === "MISSED");
              const remaining = plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED").reduce((sum, item) => sum + item.amount, 0);
              return (
                <div key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{paymentPlanStatusLabel(plan.status)}</p>
                  <h3 className="mt-1 font-black text-slate-950">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.application?.applicantName || plan.tenantUser?.name || plan.tenantUser?.email || "Not linked"}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(remaining)}</p>
                  <p className="text-xs text-slate-500">{nextDue ? `${nextDue.dueDate.toLocaleDateString()} · ${agingBucket(nextDue.dueDate)} · ${installmentStatusLabel(nextDue.status)}` : "No open installments"}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => <tr key={entry.id}><td className="px-5 py-4 text-slate-600">{entry.postedAt.toLocaleDateString()}</td><td className="px-5 py-4 font-bold text-slate-950">{entry.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {entry.unit.unitNumber}</span></td><td className="px-5 py-4">{ledgerTypeLabel(entry.type)}</td><td className="px-5 py-4">{entry.description}<br/><span className="text-xs text-slate-500">{entry.application?.applicantName || entry.tenantUser?.name || "No application linked"}</span></td><td className="px-5 py-4">{ledgerStatusLabel(entry.status)}</td><td className="px-5 py-4 text-right font-black">{formatCurrency(Math.abs(ledgerSignedAmount(entry)))}</td></tr>)}
            {entries.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No ledger activity is connected to your units yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pagination pathname="/landlord/ledger" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalEntries} />
    </main>
  );
}
