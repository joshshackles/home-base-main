import Link from "next/link";
import { PaymentPlanStatus } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { agingBucket, installmentStatusLabel, ledgerBalance, paymentPlanStatusLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

function planStatusClass(status: PaymentPlanStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "DEFAULTED") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export default async function PaymentPlansPage() {
  const plans = await prisma.paymentPlan.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      unit: { include: { property: true } },
      application: { include: { ledgerEntries: true } },
      tenantUser: true,
      installments: { orderBy: { dueDate: "asc" } }
    }
  });

  const activePlans = plans.filter((plan) => plan.status === "ACTIVE");
  const activeRemaining = activePlans.reduce((sum, plan) => sum + plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED").reduce((inner, item) => inner + item.amount, 0), 0);
  const overdueInstallments = activePlans.flatMap((plan) => plan.installments.filter((item) => item.status === "DUE" && item.dueDate < new Date()));

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Payment Plans" description="Create and monitor repayment plans for balances that need a controlled installment schedule." actionHref="/admin/ledger/plans/new" actionLabel="New Payment Plan" />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger">Ledger</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/aging">Aging Report</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Active Plans</p><p className="mt-2 text-4xl font-black text-slate-950">{activePlans.length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Remaining Scheduled</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(activeRemaining)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Overdue Installments</p><p className="mt-2 text-4xl font-black text-amber-700">{overdueInstallments.length}</p></div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1060px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Applicant/Tenant</th><th className="px-5 py-4">Plan Amount</th><th className="px-5 py-4">Installment</th><th className="px-5 py-4">Progress</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => {
              const paid = plan.installments.filter((item) => item.status === "PAID" || item.status === "WAIVED").reduce((sum, item) => sum + item.amount, 0);
              const nextDue = plan.installments.find((item) => item.status === "DUE" || item.status === "MISSED");
              const linkedBalance = plan.application ? ledgerBalance(plan.application.ledgerEntries) : 0;
              return (
                <tr key={plan.id}>
                  <td className="px-5 py-4"><Link className="font-black text-brand-700" href={`/admin/ledger/plans/${plan.id}`}>{plan.name}</Link><br/><span className="text-xs text-slate-500">{nextDue ? `Next ${nextDue.dueDate.toLocaleDateString()} · ${agingBucket(nextDue.dueDate)}` : "No open installments"}</span></td>
                  <td className="px-5 py-4 font-bold text-slate-950">{plan.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {plan.unit.unitNumber}</span></td>
                  <td className="px-5 py-4 text-slate-700">{plan.application?.applicantName || plan.tenantUser?.name || plan.tenantUser?.email || "Not linked"}</td>
                  <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(plan.totalAmount)}<br/><span className="text-xs font-medium text-slate-500">Balance {formatCurrency(linkedBalance)}</span></td>
                  <td className="px-5 py-4 text-slate-700">{formatCurrency(plan.installmentAmount)} / month<br/><span className="text-xs text-slate-500">Due day {plan.dueDayOfMonth}</span></td>
                  <td className="px-5 py-4 text-slate-700">{formatCurrency(paid)} paid<br/><span className="text-xs text-slate-500">{plan.installments.length} installments · {installmentStatusLabel(nextDue?.status || "PAID")}</span></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${planStatusClass(plan.status)}`}>{paymentPlanStatusLabel(plan.status)}</span></td>
                  <td className="px-5 py-4"><Link className="font-bold text-brand-700" href={`/admin/ledger/plans/${plan.id}`}>Open</Link></td>
                </tr>
              );
            })}
            {plans.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">No payment plans have been created yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
