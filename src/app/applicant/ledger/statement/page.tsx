export const dynamic = "force-dynamic";

import Link from "next/link";
import { LedgerEntryStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerBalance, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export default async function ApplicantStatementPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/ledger/statement");
  const entries = await prisma.ledgerEntry.findMany({
    where: { status: { not: LedgerEntryStatus.VOIDED }, OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }] },
    orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
    include: { application: true, unit: { include: { property: true } } }
  });
  const balance = ledgerBalance(entries);
  const charges = entries.filter((entry) => entry.type === "CHARGE" || entry.type === "ADJUSTMENT").reduce((sum, entry) => sum + entry.amount, 0);
  const payments = entries.filter((entry) => entry.type === "PAYMENT" || entry.type === "CREDIT").reduce((sum, entry) => sum + entry.amount, 0);
  const oldestCharge = entries.filter((entry) => entry.type === "CHARGE" || entry.type === "ADJUSTMENT").sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0];
  const seed = entries[0];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 print:max-w-none print:px-0 print:py-0 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/applicant/ledger">Back to Ledger</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/applicant/ledger/statement/export">Download CSV</Link>
        <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">Use your browser print command to save as PDF</span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">Account Statement</h1>
            <p className="mt-2 text-sm text-slate-500">Generated {new Date().toLocaleDateString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current Balance</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{formatCurrency(balance)}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-700">{agingBucket(oldestCharge?.dueDate)}</p>
          </div>
        </div>

        <div className="grid gap-4 py-6 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Charges</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(charges)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payments/Credits</p><p className="mt-1 text-2xl font-black text-emerald-700">{formatCurrency(payments)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Open Balance</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(balance)}</p></div>
        </div>

        {seed ? <div className="mb-6 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">Primary unit shown: <strong>{seed.unit.property.name} Unit {seed.unit.unitNumber}</strong></div> : null}

        <table className="w-full text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-3 text-slate-600">{entry.postedAt.toLocaleDateString()}</td>
                <td className="px-3 py-3 text-slate-800">{entry.description}<br/><span className="text-xs text-slate-500">{entry.unit.property.name} Unit {entry.unit.unitNumber}</span></td>
                <td className="px-3 py-3">{ledgerTypeLabel(entry.type)}</td>
                <td className="px-3 py-3">{ledgerStatusLabel(entry.status)}</td>
                <td className="px-3 py-3 text-right font-black text-slate-950">{formatCurrency(ledgerSignedAmount(entry))}</td>
              </tr>
            ))}
            {entries.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">No ledger entries are connected to your account yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
