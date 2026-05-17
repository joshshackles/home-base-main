import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { agingBucket, installmentStatusLabel, ledgerBalance, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel, paymentPlanStatusLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export default async function ApplicantLedgerPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/ledger");
  const [entries, plans] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }] },
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      include: { unit: { include: { property: true } }, application: true }
    }),
    prisma.paymentPlan.findMany({
      where: { OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }] },
      orderBy: { createdAt: "desc" },
      include: { unit: { include: { property: true } }, installments: { orderBy: { dueDate: "asc" } } }
    })
  ]);
  const balance = ledgerBalance(entries);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Applicant</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Ledger</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Review charges, payments, credits, and adjustments connected to your applications.</p>
      </div>
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Current balance</p>
        <p className="mt-2 text-5xl font-black text-slate-950">{formatCurrency(balance)}</p>
        <p className="mt-3 text-sm text-slate-500">This ledger is informational. It does not process online payments inside HomeBase MLS yet.</p>
        <a className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white" href="/applicant/ledger/statement">Open Printable Statement</a>
      </section>

      {plans.length > 0 ? (
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Payment plans</h2>
          <p className="mt-1 text-sm text-slate-500">Review your installment plan status and upcoming due dates.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const nextDue = plan.installments.find((item) => item.status === "DUE" || item.status === "MISSED");
              const remaining = plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED").reduce((sum, item) => sum + item.amount, 0);
              return (
                <div key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-brand-700">{paymentPlanStatusLabel(plan.status)}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.unit.property.name} - Unit {plan.unit.unitNumber}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Remaining</p><p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(remaining)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Next Due</p><p className="mt-1 text-xl font-black text-slate-950">{nextDue ? formatCurrency(nextDue.amount) : "Complete"}</p></div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{nextDue ? `${nextDue.dueDate.toLocaleDateString()} · ${agingBucket(nextDue.dueDate)} · ${installmentStatusLabel(nextDue.status)}` : "No open installments remain."}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-sm font-bold uppercase tracking-wide text-slate-500">{ledgerTypeLabel(entry.type)} · {ledgerStatusLabel(entry.status)}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{entry.description}</h2><p className="mt-2 text-slate-600">{entry.unit.property.name} - Unit {entry.unit.unitNumber}</p><p className="mt-1 text-sm text-slate-500">Posted {entry.postedAt.toLocaleDateString()}</p></div>
              <p className="text-3xl font-black text-slate-950">{formatCurrency(Math.abs(ledgerSignedAmount(entry)))}</p>
            </div>
            {entry.memo ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{entry.memo}</p> : null}
          </div>
        ))}
        {entries.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">No ledger activity is connected to your account yet.</div> : null}
      </div>
    </main>
  );
}
