export const dynamic = "force-dynamic";

import Link from "next/link";
import { LedgerEntryType } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { agingBucket, agingBucketKey, ledgerSignedAmount } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

const bucketLabels: Record<string, string> = {
  current: "Current",
  "1_30": "1-30 days",
  "31_60": "31-60 days",
  "61_90": "61-90 days",
  "90_plus": "90+ days",
  no_due_date: "No due date"
};

export default async function AgingReportPage() {
  const entries = await prisma.ledgerEntry.findMany({
    where: { status: { not: "VOIDED" } },
    include: { application: true, unit: { include: { property: true } }, tenantUser: true },
    orderBy: [{ dueDate: "asc" }, { postedAt: "asc" }]
  });

  const charges = entries.filter((entry) => entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT);
  const payments = entries.filter((entry) => entry.type === "PAYMENT" || entry.type === "CREDIT").reduce((sum, entry) => sum + Math.abs(ledgerSignedAmount(entry)), 0);
  const chargesTotal = charges.reduce((sum, entry) => sum + entry.amount, 0);
  const openBalance = chargesTotal - payments;

  const bucketTotals = charges.reduce<Record<string, number>>((acc, entry) => {
    const key = agingBucketKey(entry.dueDate);
    acc[key] = (acc[key] ?? 0) + entry.amount;
    return acc;
  }, {});

  const applicationRows = Array.from(new Map(entries.map((entry) => [entry.applicationId || entry.tenantUserId || entry.unitId, entry])).values())
    .map((seed) => {
      const related = entries.filter((entry) => (seed.applicationId && entry.applicationId === seed.applicationId) || (!seed.applicationId && seed.tenantUserId && entry.tenantUserId === seed.tenantUserId) || (!seed.applicationId && !seed.tenantUserId && entry.unitId === seed.unitId));
      const balance = related.reduce((sum, entry) => sum + ledgerSignedAmount(entry), 0);
      const oldestCharge = related.filter((entry) => entry.type === "CHARGE" || entry.type === "ADJUSTMENT").sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0];
      return { seed, related, balance, oldestCharge };
    })
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Balance Aging Report" description="Review open balances by aging bucket so staff can identify current, delinquent, and high-risk accounts." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger">Ledger</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/plans">Payment Plans</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/aging/export">Export Aging CSV</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/statements">Statements</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Estimated Open Balance</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(openBalance)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Accounts With Balance</p><p className="mt-2 text-4xl font-black text-slate-950">{applicationRows.length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">90+ Day Charges</p><p className="mt-2 text-4xl font-black text-rose-700">{formatCurrency(bucketTotals["90_plus"] ?? 0)}</p></div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Object.entries(bucketLabels).map(([key, label]) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(bucketTotals[key] ?? 0)}</p></div>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Oldest Charge</th><th className="px-5 py-4">Aging</th><th className="px-5 py-4 text-right">Balance</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {applicationRows.map(({ seed, balance, oldestCharge }) => (
              <tr key={seed.applicationId || seed.tenantUserId || seed.unitId}>
                <td className="px-5 py-4 font-bold text-slate-950">{seed.application?.applicantName || seed.tenantUser?.name || seed.tenantUser?.email || "Unit balance"}</td>
                <td className="px-5 py-4 text-slate-700">{seed.unit.property.name}<br/><span className="text-xs text-slate-500">Unit {seed.unit.unitNumber}</span></td>
                <td className="px-5 py-4 text-slate-700">{oldestCharge?.description || "No charge"}<br/><span className="text-xs text-slate-500">{oldestCharge?.dueDate ? oldestCharge.dueDate.toLocaleDateString() : "No due date"}</span></td>
                <td className="px-5 py-4 font-bold text-amber-700">{agingBucket(oldestCharge?.dueDate)}</td>
                <td className="px-5 py-4 text-right font-black text-slate-950">{formatCurrency(balance)}</td>
                <td className="px-5 py-4">{seed.applicationId ? <Link className="font-bold text-brand-700" href={`/admin/applications/${seed.applicationId}`}>Open Application</Link> : <Link className="font-bold text-brand-700" href={`/admin/ledger/new`}>Add Entry</Link>}</td>
              </tr>
            ))}
            {applicationRows.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No open aged balances found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
