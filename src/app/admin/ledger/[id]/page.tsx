import { notFound } from "next/navigation";
import { voidLedgerEntry } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export default async function LedgerEntryDetailPage({ params }: { params: { id: string } }) {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: params.id }, include: { unit: { include: { property: true } }, application: true, tenantUser: true, createdBy: true } });
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Ledger Entry" description="Review a ledger entry and void it if it was entered in error." />
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{ledgerTypeLabel(entry.type)} · {ledgerStatusLabel(entry.status)}</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(Math.abs(ledgerSignedAmount(entry)))}</h1>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div><dt className="text-sm font-bold text-slate-500">Description</dt><dd className="mt-1 text-slate-950">{entry.description}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Unit</dt><dd className="mt-1 text-slate-950">{entry.unit.property.name} Unit {entry.unit.unitNumber}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Application</dt><dd className="mt-1 text-slate-950">{entry.application ? entry.application.applicantName : "Not linked"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Tenant/applicant user</dt><dd className="mt-1 text-slate-950">{entry.tenantUser?.name || entry.tenantUser?.email || "Not linked"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Due date</dt><dd className="mt-1 text-slate-950">{entry.dueDate ? entry.dueDate.toLocaleDateString() : "None"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Paid date</dt><dd className="mt-1 text-slate-950">{entry.paidAt ? entry.paidAt.toLocaleDateString() : "None"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Payment method</dt><dd className="mt-1 text-slate-950">{entry.paymentMethod || "None"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Created by</dt><dd className="mt-1 text-slate-950">{entry.createdBy?.name || entry.createdBy?.email || "Unknown"}</dd></div>
          </dl>
          {entry.memo ? <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Memo</p><p className="mt-1 whitespace-pre-wrap text-slate-700">{entry.memo}</p></div> : null}
          {entry.voidReason ? <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-rose-800"><p className="font-bold">Void reason</p><p className="mt-1">{entry.voidReason}</p></div> : null}
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Entry controls</h2>
          {entry.status !== "VOIDED" ? (
            <form action={voidLedgerEntry} className="mt-4 space-y-3">
              <input type="hidden" name="ledgerEntryId" value={entry.id} />
              <label className="block"><span className="text-sm font-bold text-slate-700">Void reason</span><textarea name="voidReason" required rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
              <button className="w-full rounded-2xl bg-rose-600 px-5 py-3 font-bold text-white hover:bg-rose-700">Void Entry</button>
            </form>
          ) : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">This entry has already been voided.</p>}
        </aside>
      </section>
    </main>
  );
}
