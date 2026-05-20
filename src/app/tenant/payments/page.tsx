export const dynamic = "force-dynamic";

import Link from "next/link";
import { createTenantPaymentMethodSetupSession, scheduleTenantPayment } from "@/app/payments/actions";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getTenantPaymentCenter } from "@/lib/payments/rental-finance";
import { stripePaymentsEnabled } from "@/lib/stripe";

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "amber" | "red" }) {
  const tones = { slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-800" };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${tones[tone]}`}>{children}</span>;
}

export default async function TenantPaymentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["TENANT"], "/tenant/payments");
  const { methods, schedules, events, openCharges, autopayEnrollments, retryAttempts } = await getTenantPaymentCenter(user.userId);
  const enabled = stripePaymentsEnabled();
  const dueTotal = openCharges.reduce((sum, entry) => sum + entry.amount, 0);
  const scheduledTotal = schedules.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-3 py-6 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Resident rent center</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Rent, payments, and autopay</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-300">Review open rent and fees, add a payment method, schedule rent, and open your full ledger statement.</p>
          </div>
          <form action={createTenantPaymentMethodSetupSession}>
            <button disabled={!enabled} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Add bank or card</button>
          </form>
        </div>
      </section>

      {searchParams?.setup === "success" ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Payment method setup completed.</p> : null}
      {searchParams?.scheduled ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">Payment scheduled.</p> : null}
      {!enabled ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">Online payments are disabled until Stripe is configured. Your rent ledger is still available.</p> : null}

      <section className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Open rent/fees" value={formatCurrency(dueTotal)} detail={`${openCharges.length} payable items`} />
        <Metric label="Scheduled" value={formatCurrency(scheduledTotal)} detail={`${schedules.length} upcoming`} />
        <Metric label="Autopay" value={String(autopayEnrollments.filter((item) => item.status === "ACTIVE").length)} detail="Active enrollments" />
        <Metric label="Recovery" value={String(retryAttempts.length)} detail="Retry items" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">Open charges</h2>
            <Link href="/tenant/ledger" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Full ledger</Link>
          </div>
          <div className="mt-3 grid gap-2">
            {openCharges.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No open rent or fee charges are connected to your account.</p> : openCharges.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-slate-950">{entry.description}</p><p className="text-xs font-semibold text-slate-500">{entry.unit.property.name} #{entry.unit.unitNumber}</p></div>
                  <p className="font-black text-slate-950">{formatCurrency(entry.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Schedule a payment</h2>
          <form action={scheduleTenantPayment} className="mt-3 grid gap-3">
            <select name="ledgerEntryId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              {openCharges.map((entry) => <option key={entry.id} value={entry.id}>{entry.description} - {formatCurrency(entry.amount)} - {entry.unit.property.name} #{entry.unit.unitNumber}</option>)}
            </select>
            <select name="paymentMethodId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><option value="">Choose payment method later</option>{methods.map((method) => <option key={method.id} value={method.stripePaymentMethodId}>{method.nickname || method.bankName || method.brand || method.last4}</option>)}</select>
            <input name="scheduledFor" type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
            <button disabled={!enabled || openCharges.length === 0} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Schedule payment</button>
          </form>
          <div className="mt-3 grid gap-2">
            {schedules.map((payment) => <div key={payment.id} className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-950">{formatCurrency(payment.amount)} on {payment.scheduledFor.toLocaleDateString()}</p><p className="text-xs font-semibold text-slate-500">{payment.unit.property.name} #{payment.unit.unitNumber}</p></div>)}
            {schedules.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No scheduled payments yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Saved methods</h2>
          <div className="mt-3 grid gap-2">
            {methods.map((method) => <div key={method.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{method.nickname || method.bankName || method.brand || method.type.replaceAll("_", " ")}</p><Pill tone={method.verificationStatus === "VERIFIED" ? "emerald" : "amber"}>{method.verificationStatus}</Pill></div><p className="mt-1 text-xs font-semibold text-slate-500">**** {method.last4 ?? "pending"} {method.isDefault ? "- default" : ""}</p></div>)}
            {methods.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No saved payment methods yet.</p> : null}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Recent payment activity</h2>
          <div className="mt-3 grid gap-2">
            {events.slice(0, 8).map((event) => <div key={event.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-950">{event.message}</p><Pill>{event.type.replaceAll("_", " ")}</Pill></div><p className="mt-1 text-xs font-semibold text-slate-500">{event.createdAt.toLocaleString()} {event.amount ? `- ${formatCurrency(event.amount)}` : ""}</p></div>)}
            {events.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No payment timeline events yet.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>;
}
