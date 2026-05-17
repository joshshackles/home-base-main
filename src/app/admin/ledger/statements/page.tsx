import Link from "next/link";
import { LedgerEntryStatus } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { balanceRowsByAccount } from "@/lib/ledger-reports";
import { prisma } from "@/lib/prisma";

export default async function LedgerStatementsPage() {
  const entries = await prisma.ledgerEntry.findMany({
    where: { status: { not: LedgerEntryStatus.VOIDED }, applicationId: { not: null } },
    orderBy: [{ postedAt: "desc" }],
    include: { application: true, tenantUser: true, unit: { include: { property: true } } }
  });
  const rows = balanceRowsByAccount(entries).filter((row) => row.seed.applicationId).sort((a, b) => b.balance - a.balance);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Printable Statements" description="Open applicant or tenant ledger statements that can be printed, saved as PDF, or exported as CSV." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/reports">Reports</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/export">Full Ledger CSV</Link>
      </div>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Aging</th><th className="px-5 py-4 text-right">Balance</th><th className="px-5 py-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-5 py-4 font-bold text-slate-950">{row.seed.application?.applicantName}<br/><span className="font-medium text-slate-500">{row.seed.application?.applicantEmail}</span></td>
                <td className="px-5 py-4 text-slate-700">{row.seed.unit.property.name}<br/><span className="text-xs text-slate-500">Unit {row.seed.unit.unitNumber}</span></td>
                <td className="px-5 py-4 font-bold text-amber-700">{row.agingBucket}</td>
                <td className="px-5 py-4 text-right font-black text-slate-950">{formatCurrency(row.balance)}</td>
                <td className="px-5 py-4"><div className="flex flex-wrap gap-3"><Link className="font-bold text-brand-700" href={`/admin/ledger/statements/${row.seed.applicationId}`}>Print Statement</Link><Link className="font-bold text-slate-700" href={`/admin/ledger/statements/${row.seed.applicationId}/export`}>CSV</Link></div></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No application ledger accounts have entries yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
