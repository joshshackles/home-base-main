export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getLandlordPaymentReconciliationCenter } from "@/lib/payments/production-hardening";

function Metric({ label, value, detail, tone = "slate" }: { label: string; value: string; detail: string; tone?: "slate" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-rose-200 bg-rose-50 text-rose-950"
  };
  return <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="text-xs font-semibold text-slate-500">{detail}</p></div>;
}

function StatusBadge({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tones[tone]}`}>{label}</span>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">{children}</p>;
}

export default async function LandlordPaymentReconciliationPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/reconciliation");
  const center = await getLandlordPaymentReconciliationCenter(user.userId);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Production reconciliation</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Payment reconciliation</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Audit collected rent, failed-payment recovery, Stripe receipts, refunds, disputes, and vendor payouts before closing statements.</p>
          </div>
          <Link href="/landlord/payments" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Back to payments</Link>
        </div>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-4">
        <Metric label="Collected" value={formatCurrency(center.metrics.received)} detail="Posted payment and credit ledger entries" tone="green" />
        <Metric label="Outstanding" value={formatCurrency(center.metrics.outstanding)} detail="Open charge balance in review window" tone={center.metrics.outstanding > 0 ? "amber" : "slate"} />
        <Metric label="Recovery" value={String(center.metrics.failedRetries)} detail="Failed retry attempts still visible" tone={center.metrics.failedRetries > 0 ? "red" : "slate"} />
        <Metric label="Reconciliation gaps" value={String(center.metrics.reconciliationGapCount + center.metrics.receiptGapCount)} detail="Paid charges or receipts needing review" tone={center.metrics.reconciliationGapCount + center.metrics.receiptGapCount > 0 ? "amber" : "green"} />
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Failed payment recovery</h2>
          <div className="mt-3 grid gap-2">
            {center.retries.map((retry) => (
              <div key={retry.id} className="rounded-xl bg-amber-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-amber-950">Retry #{retry.attemptNumber} - {formatCurrency(retry.amount)}</p>
                  <StatusBadge label={retry.status} tone={retry.status === "FAILED" ? "red" : "amber"} />
                </div>
                <p className="mt-1 text-xs font-semibold text-amber-700">{retry.unit.property.name} #{retry.unit.unitNumber} - {retry.user.email} - next {retry.nextAttemptAt.toLocaleDateString()}</p>
                {retry.failureReason ? <p className="mt-1 text-xs font-bold text-amber-800">{retry.failureReason}</p> : null}
              </div>
            ))}
            {center.retries.length === 0 ? <Empty>No recovery items are waiting.</Empty> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Autopay health</h2>
          <div className="mt-3 grid gap-2">
            {center.autopayEnrollments.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{item.user.name || item.user.email}</p>
                  <StatusBadge label={item.status} tone={item.status === "ACTIVE" ? "green" : "amber"} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.unit.property.name} #{item.unit.unitNumber} - failures {item.failureCount} - next {item.nextRunDate.toLocaleDateString()}</p>
              </div>
            ))}
            {center.autopayEnrollments.length === 0 ? <Empty>No autopay enrollments yet.</Empty> : null}
          </div>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Disputes and refunds</h2>
          <div className="mt-3 grid gap-2">
            {center.disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-xl bg-rose-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-rose-950">{formatCurrency(dispute.amount)} dispute</p>
                  <StatusBadge label={dispute.status} tone={dispute.status === "WON" || dispute.status === "CLOSED" ? "green" : dispute.status === "LOST" ? "red" : "amber"} />
                </div>
                <p className="mt-1 text-xs font-semibold text-rose-700">{dispute.unit ? `${dispute.unit.property.name} #${dispute.unit.unitNumber}` : "Unit not linked"} - reason {dispute.reason ?? "not provided"}</p>
                {dispute.evidenceDueBy ? <p className="mt-1 text-xs font-bold text-rose-800">Evidence due {dispute.evidenceDueBy.toLocaleDateString()}</p> : null}
              </div>
            ))}
            {center.refunds.map((refund) => <div key={refund.id} className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-950">{refund.description}</p><p className="text-xs font-semibold text-slate-500">{formatCurrency(refund.amount)} - {refund.stripeRefundStatus}</p></div>)}
            {center.disputes.length === 0 && center.refunds.length === 0 ? <Empty>No disputes or refund records in the current window.</Empty> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Vendor payouts</h2>
          <div className="mt-3 grid gap-2">
            {center.vendorPayouts.map((payout) => (
              <div key={payout.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{payout.description}</p>
                  <StatusBadge label={payout.status} tone={payout.status === "PAID" ? "green" : payout.status === "FAILED" ? "red" : "amber"} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(payout.amount)} - {payout.vendor?.name || payout.vendor?.email || "Vendor not linked"}{payout.stripeTransferId ? ` - ${payout.stripeTransferId}` : ""}</p>
                {payout.failureReason ? <p className="mt-1 text-xs font-bold text-rose-700">{payout.failureReason}</p> : null}
              </div>
            ))}
            {center.vendorPayouts.length === 0 ? <Empty>No vendor payouts are ready for reconciliation.</Empty> : null}
          </div>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Receipt and ledger gaps</h2>
          <div className="mt-3 grid gap-2">
            {center.receiptGaps.map((entry) => <div key={entry.id} className="rounded-xl bg-amber-50 p-3"><p className="font-black text-amber-950">{entry.description}</p><p className="text-xs font-semibold text-amber-700">{entry.unit.property.name} #{entry.unit.unitNumber} - payment intent has no receipt URL</p></div>)}
            {center.paidChargeGaps.map((entry) => <div key={entry.id} className="rounded-xl bg-amber-50 p-3"><p className="font-black text-amber-950">{entry.description}</p><p className="text-xs font-semibold text-amber-700">{entry.unit.property.name} #{entry.unit.unitNumber} - marked paid without matching payment ledger</p></div>)}
            {center.receiptGaps.length === 0 && center.paidChargeGaps.length === 0 ? <Empty>Ledger and receipt records look reconciled.</Empty> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Recent payment events</h2>
          <div className="mt-3 grid gap-2">
            {center.paymentEvents.map((event) => (
              <div key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{event.message}</p>
                  <StatusBadge label={event.type} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{event.unit ? `${event.unit.property.name} #${event.unit.unitNumber}` : "Platform event"} - {event.createdAt.toLocaleString()}</p>
              </div>
            ))}
            {center.paymentEvents.length === 0 ? <Empty>No payment events in this window.</Empty> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
