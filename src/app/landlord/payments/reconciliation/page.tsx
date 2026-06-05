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
        <Metric label="Transaction exceptions" value={String(center.metrics.transactionExceptionCount)} detail="Payment/webhook records needing review" tone={center.metrics.transactionExceptionCount > 0 ? "red" : "green"} />
        <Metric label="Tracked platform fees" value={formatCurrency(center.metrics.platformFeesTracked)} detail={`${center.operations.transactionMetrics.reconciledCount} reconciled transactions`} tone="green" />
        <Metric label="Net to landlords" value={formatCurrency(center.metrics.netToLandlordTracked)} detail="Succeeded or reconciled transactions" tone="green" />
        <Metric label="Webhook failures" value={String(center.metrics.webhookFailureCount)} detail={`${center.operations.webhookMetrics.trackedCount} recent Stripe events`} tone={center.metrics.webhookFailureCount > 0 ? "red" : "slate"} />
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Payment operations queue</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Stripe provider events and HomeBase transaction records that need attention before statements close.</p>
            </div>
            <StatusBadge label={`${center.operations.exceptions.length} exceptions`} tone={center.operations.exceptions.length > 0 ? "red" : "green"} />
          </div>
          <div className="mt-3 grid gap-2">
            {center.operations.exceptions.slice(0, 8).map((exception) => (
              <div key={exception.id} className={`rounded-xl p-3 ${exception.severity === "critical" || exception.severity === "high" ? "bg-rose-50" : exception.severity === "medium" ? "bg-amber-50" : "bg-slate-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`${exception.severity === "critical" || exception.severity === "high" ? "text-rose-950" : exception.severity === "medium" ? "text-amber-950" : "text-slate-950"} font-black`}>{exception.title}</p>
                  <StatusBadge label={exception.severity} tone={exception.severity === "critical" || exception.severity === "high" ? "red" : exception.severity === "medium" ? "amber" : "slate"} />
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{exception.detail}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">{exception.source} - {exception.actionLabel}</p>
              </div>
            ))}
            {center.operations.exceptions.length === 0 ? <Empty>No payment transaction or webhook exceptions are waiting.</Empty> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Stripe event inbox</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Webhook events are stored before business logic runs, so replays stay idempotent and observable.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">Processed</p><p className="text-2xl font-black text-slate-950">{center.operations.webhookMetrics.processedCount}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">Processing</p><p className="text-2xl font-black text-slate-950">{center.operations.webhookMetrics.processingCount}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">Retried</p><p className="text-2xl font-black text-slate-950">{center.operations.webhookMetrics.retriedCount}</p></div>
            <div className="rounded-xl bg-rose-50 p-3"><p className="text-xs font-black uppercase text-rose-500">Failed</p><p className="text-2xl font-black text-rose-950">{center.operations.webhookMetrics.failedCount}</p></div>
          </div>
          <div className="mt-3 grid gap-2">
            {center.operations.webhookEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{event.type}</p>
                  <StatusBadge label={event.status} tone={event.status === "FAILED" ? "red" : event.status === "PROCESSED" ? "green" : "amber"} />
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{event.stripeEventId} - attempts {event.attempts} - {event.receivedAt.toLocaleString()}</p>
                {event.errorMessage ? <p className="mt-1 text-xs font-bold text-rose-700">{event.errorMessage}</p> : null}
              </div>
            ))}
            {center.operations.webhookEvents.length === 0 ? <Empty>No Stripe webhook events are in the current operations window.</Empty> : null}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Transaction ledger</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Provider attempts, platform fees, and net-to-landlord amounts tracked separately from accounting ledger entries.</p>
          </div>
          <StatusBadge label={`${center.operations.transactionMetrics.trackedCount} tracked`} />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Gross</th>
                <th className="px-3 py-2">HomeBase fee</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">Provider</th>
              </tr>
            </thead>
            <tbody>
              {center.operations.transactions.slice(0, 12).map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-100">
                  <td className="px-3 py-2"><StatusBadge label={transaction.status} tone={transaction.status === "FAILED" ? "red" : transaction.status === "RECONCILED" || transaction.status === "SUCCEEDED" ? "green" : "amber"} /></td>
                  <td className="px-3 py-2 font-bold text-slate-700">{transaction.unit.property.name} #{transaction.unit.unitNumber}</td>
                  <td className="px-3 py-2 text-slate-600">{transaction.tenantUser?.name || transaction.tenantUser?.email || "Tenant not linked"}</td>
                  <td className="px-3 py-2 font-black text-slate-950">{formatCurrency(transaction.grossAmount)}</td>
                  <td className="px-3 py-2 font-bold text-blue-700">{formatCurrency(transaction.platformFeeAmount)}</td>
                  <td className="px-3 py-2 font-bold text-emerald-700">{formatCurrency(transaction.netToLandlordAmount)}</td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-xs font-semibold text-slate-500">{transaction.stripePaymentIntentId || transaction.stripeCheckoutSessionId || transaction.stripePaymentStatus || "Pending provider id"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {center.operations.transactions.length === 0 ? <Empty>No payment transactions have been tracked yet.</Empty> : null}
        </div>
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
