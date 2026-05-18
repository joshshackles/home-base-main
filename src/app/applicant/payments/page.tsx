export const dynamic = "force-dynamic";

import { cancelScheduledPayment, cancelTenantAutoPay, createTenantPaymentMethodSetupSession, enableTenantAutoPay, pauseTenantAutoPay, resumeTenantAutoPay, scheduleTenantPayment } from "@/app/payments/actions";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getTenantPaymentCenter } from "@/lib/payments/rental-finance";
import { stripePaymentsEnabled } from "@/lib/stripe";

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "amber" | "red" }) {
  const tones = { slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-800" };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${tones[tone]}`}>{children}</span>;
}

export default async function ApplicantPaymentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const { methods, schedules, events, openCharges, autopayEnrollments, retryAttempts } = await getTenantPaymentCenter(user.userId);
  const enabled = stripePaymentsEnabled();
  const dueTotal = openCharges.reduce((sum, entry) => sum + entry.amount, 0);
  const scheduledTotal = schedules.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-3 py-5 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Tenant wallet</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Payments & autopay</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-300">Add bank details, schedule upcoming rent, review receipts, and keep a payment trail connected to your ledger.</p>
          </div>
          <form action={createTenantPaymentMethodSetupSession}>
            <button disabled={!enabled} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Add bank or card</button>
          </form>
        </div>
      </section>

      {searchParams?.setup === "success" ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Payment method setup completed. Stripe will send verification status through the webhook.</p> : null}
      {searchParams?.scheduled ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Payment scheduled.</p> : null}
      {!enabled ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">Online payment features are disabled until Stripe environment variables are configured.</p> : null}

      <section className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Open rent/fees</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(dueTotal)}</p><p className="text-xs text-slate-500">{openCharges.length} payable items</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Scheduled</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(scheduledTotal)}</p><p className="text-xs text-slate-500">{schedules.length} upcoming payments</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Autopay</p><p className="mt-1 text-2xl font-black text-slate-950">{autopayEnrollments.filter((item) => item.status === "ACTIVE").length}</p><p className="text-xs text-slate-500">{retryAttempts.length} active recovery items</p></div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Saved payment methods</h2>
          <div className="mt-3 grid gap-2">
            {methods.map((method) => <div key={method.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{method.nickname || method.bankName || method.brand || method.type.replaceAll("_", " ")}</p><Pill tone={method.verificationStatus === "VERIFIED" ? "emerald" : "amber"}>{method.verificationStatus}</Pill></div><p className="mt-1 text-xs font-semibold text-slate-500">•••• {method.last4 ?? "pending"} {method.isDefault ? "· default" : ""}</p></div>)}
            {methods.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No saved methods yet. Add a bank account for lower-cost rent payments or a card for backup.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Schedule a payment</h2>
          <form action={scheduleTenantPayment} className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
            <select name="ledgerEntryId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              {openCharges.map((entry) => <option key={entry.id} value={entry.id}>{entry.description} · {formatCurrency(entry.amount)} · {entry.unit.property.name} #{entry.unit.unitNumber}</option>)}
            </select>
            <select name="paymentMethodId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><option value="">Choose later</option>{methods.map((method) => <option key={method.id} value={method.stripePaymentMethodId}>{method.nickname || method.bankName || method.brand || method.last4}</option>)}</select>
            <input name="scheduledFor" type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
            <button disabled={openCharges.length === 0} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Schedule</button>
          </form>
          <div className="mt-3 grid gap-2">
            {schedules.map((payment) => <div key={payment.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950">{formatCurrency(payment.amount)} on {payment.scheduledFor.toLocaleDateString()}</p><p className="text-xs font-semibold text-slate-500">{payment.unit.property.name} #{payment.unit.unitNumber} · {payment.isAutopay ? "Autopay" : "Scheduled"}</p></div>{payment.status === "SCHEDULED" ? <form action={cancelScheduledPayment}><input type="hidden" name="scheduledPaymentId" value={payment.id} /><button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">Cancel</button></form> : <Pill tone="amber">{payment.status}</Pill>}</div>)}
          </div>
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Autopay enrollment</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Set a monthly rent autopay with an optional cap and backup method. HomeBase schedules the payment; Stripe stores the banking details.</p>
          <form action={enableTenantAutoPay} className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Unit<select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">{openCharges.map((entry) => <option key={entry.unitId} value={entry.unitId}>{entry.unit.property.name} #{entry.unit.unitNumber}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Primary method<select name="paymentMethodId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">{methods.map((method) => <option key={method.id} value={method.stripePaymentMethodId}>{method.nickname || method.bankName || method.brand || method.last4}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Backup method<select name="backupPaymentMethodId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900"><option value="">None</option>{methods.map((method) => <option key={method.id} value={method.stripePaymentMethodId}>{method.nickname || method.bankName || method.brand || method.last4}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Amount cap<input name="amountLimit" type="number" min="0" step="1" placeholder="Optional" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">Day of month<input name="dayOfMonth" type="number" min="1" max="28" defaultValue="1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" /></label>
            <button disabled={methods.length === 0 || openCharges.length === 0} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50 md:self-end">Enable autopay</button>
          </form>
          <div className="mt-3 grid gap-2">
            {autopayEnrollments.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-slate-950">{item.unit.property.name} #{item.unit.unitNumber}</p><p className="text-xs font-semibold text-slate-500">Next run {item.nextRunDate.toLocaleDateString()} · cap {item.amountLimit ? formatCurrency(item.amountLimit) : "none"}</p></div><Pill tone={item.status === "ACTIVE" ? "emerald" : "amber"}>{item.status}</Pill></div><div className="mt-2 flex flex-wrap gap-2">{item.status === "ACTIVE" ? <form action={pauseTenantAutoPay}><input type="hidden" name="enrollmentId" value={item.id} /><button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Pause</button></form> : <form action={resumeTenantAutoPay}><input type="hidden" name="enrollmentId" value={item.id} /><button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Resume</button></form>}<form action={cancelTenantAutoPay}><input type="hidden" name="enrollmentId" value={item.id} /><button className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700">Cancel</button></form></div></div>)}
            {autopayEnrollments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No active autopay enrollment yet.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Payment recovery</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Failed payments automatically enter a retry queue so rent collection can recover without duplicate manual work.</p>
          <div className="mt-3 grid gap-2">
            {retryAttempts.map((retry) => <div key={retry.id} className="rounded-xl bg-amber-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-amber-950">Retry #{retry.attemptNumber} · {formatCurrency(retry.amount)}</p><Pill tone="amber">{retry.status}</Pill></div><p className="mt-1 text-xs font-semibold text-amber-700">{retry.unit.property.name} #{retry.unit.unitNumber} · next attempt {retry.nextAttemptAt.toLocaleDateString()}</p></div>)}
            {retryAttempts.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No active retry attempts.</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Payment timeline</h2>
        <div className="mt-3 grid gap-2">
          {events.map((event) => <div key={event.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-950">{event.message}</p><Pill>{event.type.replaceAll("_", " ")}</Pill></div><p className="mt-1 text-xs font-semibold text-slate-500">{event.createdAt.toLocaleString()} {event.amount ? `· ${formatCurrency(event.amount)}` : ""}</p></div>)}
          {events.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No payment timeline events yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
