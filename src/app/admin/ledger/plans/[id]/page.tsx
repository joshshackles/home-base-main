export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PaymentPlanInstallmentStatus, PaymentPlanStatus } from "@prisma/client";
import { updatePaymentPlanInstallment, updatePaymentPlanStatus } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { agingBucket, installmentStatusLabel, ledgerBalance, paymentPlanStatusLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

function installmentClass(status: PaymentPlanInstallmentStatus) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "MISSED") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "WAIVED") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export default async function PaymentPlanDetailPage({ params }: { params: { id: string } }) {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: params.id },
    include: {
      unit: { include: { property: true } },
      application: { include: { ledgerEntries: true } },
      tenantUser: true,
      createdBy: true,
      installments: { orderBy: { dueDate: "asc" } }
    }
  });
  if (!plan) notFound();

  const paidAmount = plan.installments.filter((item) => item.status === "PAID" || item.status === "WAIVED").reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED").reduce((sum, item) => sum + item.amount, 0);
  const linkedBalance = plan.application ? ledgerBalance(plan.application.ledgerEntries) : 0;
  const openInstallments = plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED");
  const nextDue = openInstallments[0];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title={plan.name} description="Review the payment plan, update installment outcomes, and track remaining plan balance." />
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{paymentPlanStatusLabel(plan.status)}</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(plan.totalAmount)}</h1>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div><dt className="text-sm font-bold text-slate-500">Unit</dt><dd className="mt-1 text-slate-950">{plan.unit.property.name} Unit {plan.unit.unitNumber}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Applicant/Tenant</dt><dd className="mt-1 text-slate-950">{plan.application?.applicantName || plan.tenantUser?.name || plan.tenantUser?.email || "Not linked"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Installment</dt><dd className="mt-1 text-slate-950">{formatCurrency(plan.installmentAmount)} due day {plan.dueDayOfMonth}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Plan dates</dt><dd className="mt-1 text-slate-950">{plan.startDate.toLocaleDateString()} - {plan.endDate ? plan.endDate.toLocaleDateString() : "Open"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Created by</dt><dd className="mt-1 text-slate-950">{plan.createdBy?.name || plan.createdBy?.email || "Unknown"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Linked application balance</dt><dd className="mt-1 text-slate-950">{formatCurrency(linkedBalance)}</dd></div>
          </dl>
          {plan.notes ? <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-slate-700">{plan.notes}</p></div> : null}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Paid/Waived</p><p className="mt-1 text-2xl font-black text-emerald-700">{formatCurrency(paidAmount)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Remaining</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(remainingAmount)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Next Due</p><p className="mt-1 text-2xl font-black text-slate-950">{nextDue ? agingBucket(nextDue.dueDate) : "Complete"}</p></div>
          </div>
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Plan controls</h2>
          <form action={updatePaymentPlanStatus} className="mt-4 space-y-3">
            <input type="hidden" name="paymentPlanId" value={plan.id} />
            <label className="block"><span className="text-sm font-bold text-slate-700">Status</span><select name="status" defaultValue={plan.status} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">{Object.values(PaymentPlanStatus).map((status) => <option key={status} value={status}>{paymentPlanStatusLabel(status)}</option>)}</select></label>
            <label className="block"><span className="text-sm font-bold text-slate-700">Status note</span><textarea name="note" rows={3} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
            <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Update Plan</button>
          </form>
        </aside>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black text-slate-950">Installments</h2></div>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Due Date</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Aging</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Linked Entry</th><th className="px-5 py-4">Update</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {plan.installments.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-bold text-slate-950">{item.dueDate.toLocaleDateString()}</td>
                <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(item.amount)}</td>
                <td className="px-5 py-4 text-slate-700">{agingBucket(item.dueDate)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${installmentClass(item.status)}`}>{installmentStatusLabel(item.status)}</span></td>
                <td className="px-5 py-4 text-slate-600">{item.linkedLedgerEntryId ? "Payment entry created" : "None"}</td>
                <td className="px-5 py-4">
                  <form action={updatePaymentPlanInstallment} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="installmentId" value={item.id} />
                    <select name="status" defaultValue={item.status} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">{Object.values(PaymentPlanInstallmentStatus).map((status) => <option key={status} value={status}>{installmentStatusLabel(status)}</option>)}</select>
                    <input name="paidAt" type="date" defaultValue={item.paidAt ? item.paidAt.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                    <input name="notes" placeholder="Note" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                    <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
