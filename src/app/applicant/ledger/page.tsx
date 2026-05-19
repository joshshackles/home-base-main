export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { agingBucket, installmentStatusLabel, ledgerAttentionLabel, ledgerBalance, ledgerSignedAmount, ledgerStatusLabel, ledgerTypeLabel, paymentPlanStatusLabel } from "@/lib/ledger";
import { LedgerAmount, LedgerMetricGrid, LedgerStatusPill, LedgerTypePill } from "@/components/ledger/LedgerDashboard";
import { prisma } from "@/lib/prisma";
import { createLedgerCheckoutSession } from "@/app/payments/actions";
import { stripePaymentsEnabled } from "@/lib/stripe";

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
  const openCharges = entries.filter((entry) => entry.status !== "VOIDED" && (entry.type === "CHARGE" || entry.type === "ADJUSTMENT")).reduce((sum, entry) => sum + entry.amount, 0);
  const payments = entries.filter((entry) => entry.status !== "VOIDED" && (entry.type === "PAYMENT" || entry.type === "CREDIT")).reduce((sum, entry) => sum + entry.amount, 0);
  const nextDue = entries.filter((entry) => entry.status !== "VOIDED" && (entry.type === "CHARGE" || entry.type === "ADJUSTMENT") && entry.dueDate).sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))[0];
  const paymentsEnabled = stripePaymentsEnabled();

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-3 py-6 sm:px-4 lg:px-6">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">Applicant</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-black text-slate-950">Ledger</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Review charges, payments, credits, adjustments, and payment-plan activity connected to your applications.</p></div>
          <div className="flex flex-wrap gap-2"><a className="inline-flex rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white" href="/applicant/payments">Payment Center</a><a className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700" href="/applicant/ledger/statement">Printable Statement</a></div>
        </div>
      </div>
      <LedgerMetricGrid metrics={[
        { label: "Current balance", value: formatCurrency(balance), detail: nextDue?.dueDate ? `Next due ${nextDue.dueDate.toLocaleDateString()}` : "No due date", tone: balance > 0 ? "amber" : "emerald" },
        { label: "Charges", value: formatCurrency(openCharges), detail: "Open charge history" },
        { label: "Payments & credits", value: formatCurrency(payments), detail: "Recorded reductions", tone: "emerald" },
        { label: "Entries", value: String(entries.length), detail: "Ledger records" }
      ]} />
      <p className="my-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{paymentsEnabled ? "Online payments are available for eligible landlord-connected charges. Stripe securely handles payment details." : "Online payments are not configured yet. Your landlord can enable Stripe Connect to accept payments from this portal."}</p>

      {plans.length > 0 ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Payment plans</h2>
          <p className="mt-1 text-sm text-slate-500">Review your installment plan status and upcoming due dates.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
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

      <div className="grid gap-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap gap-2"><LedgerTypePill type={entry.type} /><LedgerStatusPill status={entry.status} /></div><h2 className="mt-2 truncate text-xl font-black text-slate-950">{entry.description}</h2><p className="mt-1 text-sm text-slate-600">{entry.unit.property.name} - Unit {entry.unit.unitNumber}</p><p className="mt-1 text-xs font-semibold text-slate-500">Posted {entry.postedAt.toLocaleDateString()} · {ledgerAttentionLabel(entry)}</p></div>
              <p className="text-2xl"><LedgerAmount amount={ledgerSignedAmount(entry)} isCredit={entry.type === "PAYMENT" || entry.type === "CREDIT"} muted={entry.status === "VOIDED"} /></p>
            </div>
            {entry.memo ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{entry.memo}</p> : null}
            {paymentsEnabled && entry.status !== "VOIDED" && (entry.type === "CHARGE" || entry.type === "ADJUSTMENT") && entry.stripePaymentStatus !== "paid" ? (
              <form action={createLedgerCheckoutSession} className="mt-3">
                <input type="hidden" name="ledgerEntryId" value={entry.id} />
                <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white">Pay securely with Stripe</button>
              </form>
            ) : null}
            {entry.stripePaymentStatus === "paid" ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">Paid online through Stripe.</p> : null}
          </div>
        ))}
        {entries.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">No ledger activity is connected to your account yet.</div> : null}
      </div>
    </main>
  );
}
