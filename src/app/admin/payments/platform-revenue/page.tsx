export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getPlatformRevenueCenter } from "@/lib/payments/platform-revenue";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createActivePlatformFeePolicyAction } from "./actions";

function Metric({ label, value, detail, tone = "slate" }: { label: string; value: string; detail: string; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-rose-200 bg-rose-50 text-rose-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    blue: "bg-blue-100 text-blue-800"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tones[tone]}`}>{label}</span>;
}

export default async function AdminPlatformRevenuePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await requireRole(["ADMIN"], "/admin/payments/platform-revenue");
  const center = await getPlatformRevenueCenter();
  const policyUpdated = searchParams?.policy === "updated";

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-6 sm:px-4 lg:px-6">
      <AdminPageHeader
        eyebrow="Platform finance"
        title="HomeBase Fee Revenue"
        description="Review Stripe platform readiness, HomeBase application-fee capture, transaction volume, and net transfers to landlord connected accounts."
        actionHref="/admin/ledger"
        actionLabel="Open ledger"
      />

      {policyUpdated ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Active HomeBase platform fee policy updated. New rent payments will use this policy snapshot.</p> : null}

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Stripe platform setup</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{center.readiness.statusLabel}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              HomeBase collects its fee through Stripe Connect application fees. The active policy is {center.platformFeePolicy.percent}% with {formatCurrency(center.platformFeePolicy.fixedCents)} fixed fee.
            </p>
          </div>
          <StatusBadge label={center.readiness.ready ? "Platform ready" : "Setup needed"} tone={center.readiness.ready ? "green" : "amber"} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {center.readiness.checklist.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-black text-slate-950">{item.label}</p>
                <StatusBadge label={item.complete ? "Ready" : "Needed"} tone={item.complete ? "green" : "amber"} />
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Set active platform fee</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">This creates a new active database policy and archives the previous active policy. Each payment stores a snapshot so old transactions remain auditable.</p>
          <form action={createActivePlatformFeePolicyAction} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Policy name<input name="name" defaultValue="HomeBase 1% rent collection fee" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Percent<input name="percent" type="number" min="0" max="25" step="0.001" defaultValue={center.platformFeePolicy.percent} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Fixed fee dollars<input name="fixedDollars" type="number" min="0" max="50" step="0.01" defaultValue={(center.platformFeePolicy.fixedCents / 100).toFixed(2)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Description<input name="description" defaultValue="HomeBase application fee applied to Stripe destination-charge rent payments." className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Audit note<textarea name="auditNote" defaultValue="Approved platform fee policy for rent payment collection." className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Activate fee policy</button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Policy history</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Database policies override env/default settings for new Stripe rent payments.</p>
          <div className="mt-3 grid gap-2">
            {center.feePolicies.map((policy) => (
              <div key={policy.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{policy.name}</p>
                  <StatusBadge label={policy.status} tone={policy.status === "ACTIVE" ? "green" : policy.status === "ARCHIVED" ? "slate" : "amber"} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">{policy.percent}% + {formatCurrency(policy.fixedCents)} · effective {policy.effectiveFrom.toLocaleDateString()}</p>
                {policy.auditNote ? <p className="mt-1 text-xs font-bold text-slate-500">{policy.auditNote}</p> : null}
              </div>
            ))}
            {center.feePolicies.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No database fee policies have been created yet. HomeBase is using the environment/default fallback policy.</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Gross rent volume" value={formatCurrency(center.metrics.grossVolume)} detail={`${center.metrics.eligibleCount} fee-bearing transactions`} tone="blue" />
        <Metric label="HomeBase revenue" value={formatCurrency(center.metrics.platformRevenue)} detail={`${center.platformFeePolicy.percent}% application fee policy`} tone="green" />
        <Metric label="Net to landlords" value={formatCurrency(center.metrics.netToLandlords)} detail="After HomeBase application fee" tone="green" />
        <Metric label="Average fee" value={formatCurrency(center.metrics.averagePlatformFee)} detail="Per eligible transaction" />
        <Metric label="Connected landlords" value={String(center.connectedLandlordCount)} detail="Ready for charges and payouts" tone={center.connectedLandlordCount > 0 ? "green" : "amber"} />
        <Metric label="Refund/dispute risk" value={String(center.metrics.refundedOrDisputedCount)} detail="Revenue-impacting transactions" tone={center.metrics.refundedOrDisputedCount > 0 ? "amber" : "slate"} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Monthly platform revenue</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Recent fee capture by transaction month.</p>
          <div className="mt-3 grid gap-2">
            {center.monthlyRevenue.slice(0, 8).map((month) => (
              <div key={month.month} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{month.month}</p>
                  <p className="font-black text-emerald-700">{formatCurrency(month.platformRevenue)}</p>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{month.transactionCount} transactions · gross {formatCurrency(month.grossVolume)} · net {formatCurrency(month.netToLandlords)}</p>
              </div>
            ))}
            {center.monthlyRevenue.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No fee-bearing transactions have been reconciled yet.</p> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recent fee-bearing transactions</h2>
              <p className="text-sm font-semibold text-slate-500">Provider transaction records are separate from accounting ledger rows.</p>
            </div>
            <Link href="/landlord/payments/reconciliation" className="text-sm font-black text-brand-700">Landlord view</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Landlord</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">HomeBase fee</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {center.transactions.slice(0, 16).map((transaction) => (
                  <tr key={transaction.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3"><StatusBadge label={transaction.status} tone={transaction.status === "FAILED" ? "red" : transaction.status === "REFUNDED" || transaction.status === "DISPUTED" ? "amber" : "green"} /></td>
                    <td className="px-4 py-3 font-bold text-slate-950">{transaction.landlordUser?.name || transaction.landlordUser?.email || "Landlord not linked"}</td>
                    <td className="px-4 py-3 text-slate-600">{transaction.unit.property.name} #{transaction.unit.unitNumber}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950">{formatCurrency(transaction.grossAmount)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-700">{formatCurrency(transaction.platformFeeAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(transaction.netToLandlordAmount)}</td>
                  </tr>
                ))}
                {center.transactions.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No platform-fee transaction records have been created yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
