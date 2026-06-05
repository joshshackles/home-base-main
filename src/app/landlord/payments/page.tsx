export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { applyLateFeeAction, createFinancialAdjustmentAction, createStripeConnectOnboardingLink, generateMonthlyRentChargesAction, generateOwnerStatementAction, refreshStripeConnectStatus, refundLedgerPaymentAction, updateUnitRentBillingPolicy } from "@/app/payments/actions";
import { formatCurrency } from "@/lib/format";
import { getLandlordPaymentsCommandCenter, platformContext } from "@/lib/platform";

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>{label}</span>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{detail}</p></div>;
}

export default async function LandlordPaymentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const { account, connectReadiness, ops, recentPayments, refundablePayments, openCharges, stripe, flash } = await getLandlordPaymentsCommandCenter(platformContext(user), searchParams);
  // Platform payments service preserves legacy financial scope marker through getLandlordPaymentOperations(user.userId).

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Financial operations</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Payments command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Connect Stripe, manage rent policies, monitor scheduled renter payments, apply late fees, and track received payments from one compact financial workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge active={stripe.enabled} label={stripe.label} />
            <StatusBadge active={connectReadiness.onboardingComplete} label={connectReadiness.statusLabel} />
            <Link href="/landlord/payments/reconciliation" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-black text-white">Reconciliation</Link>
            <Link href="/landlord/payments/enterprise" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Enterprise finance</Link>
          </div>
        </div>
      </section>

      {stripe.returned ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Stripe sent you back to HomeBase. Refresh status below to confirm account readiness.</p> : null}
      {stripe.refresh ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">Your onboarding link expired or was interrupted. Create a new onboarding link below.</p> : null}
      {stripe.missingAccount ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">Start Stripe setup before refreshing account status.</p> : null}
      {stripe.syncedAccount ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Stripe account status refreshed.</p> : null}
      {flash.policyUpdated ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Rent policy updated.</p> : null}

      <section className="mt-3 grid gap-3 md:grid-cols-6">
        <Metric label="Received" value={formatCurrency(ops.received)} detail="Recent payment/credit ledger total" />
        <Metric label="Outstanding" value={formatCurrency(ops.outstanding)} detail="Charges minus received payments" />
        <Metric label="Scheduled" value={formatCurrency(ops.scheduled)} detail={`${ops.autopayCount} autopay/scheduled items`} />
        <Metric label="Units" value={String(ops.units.length)} detail="Portfolio payment scope" />
        <Metric label="Stripe" value={connectReadiness.statusLabel} detail={account?.stripeConnectLastSyncedAt ? `Checked ${account.stripeConnectLastSyncedAt.toLocaleDateString()}` : "Never checked"} />
        <Metric label="Platform fee" value={`${stripe.platformFeePercent}%`} detail={`${stripe.platformFeePolicy.source} policy`} />
        <Metric label="Recovery" value={String(ops.retries.length)} detail="Active retry queue items" />
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-black">Financial safety</h2>
          <p className="mt-1 text-sm font-semibold leading-6">
            Manual charges, credits, refunds, late fees, generated rent, and owner statements create financial records or audit events. Use factual reasons and confirm the unit, amount, period, and tenant context before submitting.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Detailed ledger</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Open the accounting-style ledger when you need entry-level history, aging, void state, or payment plan detail.</p>
          <Link href="/landlord/ledger" className="mt-3 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open ledger</Link>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Stripe Connect</h2>
          <p className="mt-1 text-sm text-slate-600">Stripe-hosted onboarding handles identity, tax, banking, compliance, cards, ACH, and payouts. HomeBase stores only Stripe ids and readiness status.</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
            <p>Account: <span className="font-black text-slate-950">{account?.stripeConnectAccountId ? "Connected" : "Not connected"}</span></p>
            <p>Charges: <span className="font-black text-slate-950">{connectReadiness.chargesEnabled ? "Enabled" : "Pending"}</span></p>
            <p>Payouts: <span className="font-black text-slate-950">{connectReadiness.payoutsEnabled ? "Enabled" : "Pending"}</span></p>
            <p>Fee model: <span className="font-black text-slate-950">{stripe.platformFeePercent}% HomeBase application fee</span></p>
          </div>
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-950">
            <p className="font-black uppercase tracking-wide">Active platform fee policy</p>
            <p className="mt-1">{stripe.platformFeePolicy.label} · source: {stripe.platformFeePolicy.source} · policy id: {stripe.platformFeePolicy.id}</p>
            <p className="mt-1">{stripe.platformFeePolicy.auditNote}</p>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">{connectReadiness.controllerSummary}</div>
          <div className="mt-3 grid gap-2">
            {connectReadiness.checklist.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-slate-950">{item.label}</p>
                  <StatusBadge active={item.complete} label={item.complete ? "Ready" : "Needed"} />
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
          {connectReadiness.disabledReason ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">Stripe disabled reason: {connectReadiness.disabledReason}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={createStripeConnectOnboardingLink}><button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={!stripe.enabled}>{connectReadiness.actionLabel === "Refresh Stripe status" ? "Continue Stripe Setup" : connectReadiness.actionLabel}</button></form>
            <form action={refreshStripeConnectStatus}><button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50" disabled={!stripe.enabled || !account?.stripeConnectAccountId}>Refresh Status</button></form>
          </div>
          {!stripe.enabled ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and APP_URL in Vercel to enable live payment onboarding.</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Rent policy editor</h2>
          <form action={updateUnitRentBillingPolicy} className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500 md:col-span-2">Unit<select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">{ops.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber} · current {formatCurrency(unit.rentAmount)}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Monthly rent<input name="monthlyRent" type="number" min="0" step="1" defaultValue={ops.units[0] ? Math.round(ops.units[0].rentAmount / 100) : undefined} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Due day<input name="dueDayOfMonth" type="number" min="1" max="28" defaultValue="1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Grace days<input name="graceDays" type="number" min="0" defaultValue="5" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Late fee mode<select name="lateFeeMode" defaultValue="FLAT" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900"><option value="NONE">None</option><option value="FLAT">Flat</option><option value="PERCENT">Percent</option><option value="DAILY_FLAT">Flat + daily</option></select></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Late fee / percent<input name="lateFeeAmount" type="number" min="0" step="1" defaultValue="75" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Daily late fee<input name="dailyLateFee" type="number" min="0" step="1" defaultValue="0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <button disabled={ops.units.length === 0} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50 md:col-span-2">Save rent policy</button>
          </form>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Billing automation</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Generate monthly rent from each unit's rent policy and let autopay/scheduled payments handle collection.</p>
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">This action posts ledger charges. Review rent policies first; duplicate periods are protected by the billing helpers where configured.</p>
          <form action={generateMonthlyRentChargesAction} className="mt-3">
            <button className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Generate this month's rent</button>
          </form>
          <div className="mt-3 grid gap-2">
            {ops.autopayEnrollments.slice(0, 4).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{item.user.name || item.user.email}</p><StatusBadge active={item.status === "ACTIVE"} label={item.status} /></div><p className="mt-1 text-xs font-semibold text-slate-500">{item.unit.property.name} #{item.unit.unitNumber} · next {item.nextRunDate.toLocaleDateString()}</p></div>)}
            {ops.autopayEnrollments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No autopay enrollments yet.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Refunds & adjustments</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Every manual adjustment or refund request should include a clear reason. These actions are part of the financial audit trail.</p>
          <form action={createFinancialAdjustmentAction} className="mt-3 grid gap-2">
            <select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">{ops.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select>
            <select name="type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900"><option value="CREDIT">Credit</option><option value="WAIVER">Waive fee</option><option value="MANUAL_CHARGE">Manual charge</option><option value="RENT_ADJUSTMENT">Rent adjustment</option></select>
            <input name="amount" type="number" min="1" step="1" placeholder="Amount" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
            <input name="reason" placeholder="Reason / audit note" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
            <button disabled={ops.units.length === 0} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Create adjustment</button>
          </form>
          <form action={refundLedgerPaymentAction} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Stripe refund</p>
            <select name="ledgerEntryId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">{refundablePayments.map((entry) => <option key={entry.id} value={entry.id}>{entry.description} · {formatCurrency(entry.amount)}</option>)}</select>
            <input name="amount" type="number" min="1" step="1" placeholder="Refund amount" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
            <input name="reason" placeholder="Refund reason" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
            <button disabled={!stripe.enabled || refundablePayments.length === 0} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50">Request Stripe refund</button>
          </form>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Owner statements</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Statements summarize collected payments, open balances, and unit context for owner review. Export and sharing workflows should stay permission-scoped.</p>
          <form action={generateOwnerStatementAction} className="mt-3 grid gap-2">
            <input name="month" type="month" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
            <select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900"><option value="">All units</option>{ops.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select>
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Generate statement</button>
          </form>
          <div className="mt-3 grid gap-2">
            {ops.statements.map((statement) => <div key={statement.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{statement.periodStart.toLocaleDateString()} - {statement.periodEnd.toLocaleDateString()}</p><p className="font-black text-slate-900">{formatCurrency(statement.collectedPayments)}</p></div><p className="mt-1 text-xs font-semibold text-slate-500">{statement.unit ? `${statement.unit.property.name} #${statement.unit.unitNumber}` : "All units"} · outstanding {formatCurrency(statement.outstandingBalance)}</p></div>)}
            {ops.statements.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No owner statements generated yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Received payments</h2>
          <div className="mt-3 grid gap-2">{recentPayments.map((entry) => <div key={entry.id} className="rounded-xl bg-emerald-50 p-3"><div className="flex items-center justify-between gap-2"><p className="font-black text-emerald-950">{entry.description}</p><p className="font-black text-emerald-900">{formatCurrency(entry.amount)}</p></div><p className="mt-1 text-xs font-semibold text-emerald-700">{entry.unit.property.name} #{entry.unit.unitNumber} · {entry.paidAt?.toLocaleDateString() ?? entry.postedAt.toLocaleDateString()}</p></div>)}{recentPayments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No received payments yet.</p> : null}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Late fee candidates</h2>
          <div className="mt-3 grid gap-2">{openCharges.map((entry) => <div key={entry.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950">{entry.description}</p><p className="text-xs font-semibold text-slate-500">{entry.unit.property.name} #{entry.unit.unitNumber} · Due {entry.dueDate?.toLocaleDateString() ?? "not set"}</p></div><form action={applyLateFeeAction}><input type="hidden" name="ledgerEntryId" value={entry.id} /><button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Apply late fee</button></form></div></div>)}{openCharges.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No open charge candidates.</p> : null}</div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Failed payment recovery queue</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {ops.retries.map((retry) => <div key={retry.id} className="rounded-xl bg-amber-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-amber-950">Retry #{retry.attemptNumber} · {formatCurrency(retry.amount)}</p><StatusBadge active={retry.status === "SCHEDULED" || retry.status === "PROCESSING"} label={retry.status} /></div><p className="mt-1 text-xs font-semibold text-amber-700">{retry.unit.property.name} #{retry.unit.unitNumber} · {retry.user.email} · next {retry.nextAttemptAt.toLocaleDateString()}</p>{retry.failureReason ? <p className="mt-1 text-xs font-bold text-amber-800">{retry.failureReason}</p> : null}</div>)}
          {ops.retries.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No failed-payment recovery items.</p> : null}
        </div>
      </section>
    </main>
  );
}
