export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getEnterpriseFinanceCenter } from "@/lib/payments/enterprise-finance";
import { approveVendorPayoutAction, createSecurityDepositAction, createVendorPayoutAction, generateAccountingExportAction, generateCreditReportingRecordsAction, reconcileSecurityDepositAction, refreshFinancialInsightsAction } from "@/app/payments/enterprise-actions";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-black text-slate-950">{title}</h2><div className="mt-3">{children}</div></section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{detail}</p></div>;
}

function UnitLabel({ item }: { item?: { unitNumber: string; property: { name: string } } | null }) {
  return <span>{item ? `${item.property.name} #${item.unitNumber}` : "Portfolio"}</span>;
}

export default async function EnterpriseFinancePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments/enterprise");
  const month = typeof searchParams?.month === "string" ? searchParams.month : undefined;
  const center = await getEnterpriseFinanceCenter(user.userId, month);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Enterprise financial ecosystem</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Advanced finance operations</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Manage disputes, vendor payouts, security deposits, accounting exports, portfolio insights, and credit-reporting readiness from one compact finance workspace.</p>
          </div>
          <Link href="/landlord/payments" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Back to payments</Link>
        </div>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-7">
        <Metric label="Received" value={formatCurrency(center.metrics.received)} detail={center.month} />
        <Metric label="Outstanding" value={formatCurrency(center.metrics.outstanding)} detail="Open balance" />
        <Metric label="Disputes" value={String(center.metrics.openDisputes)} detail="Needs review" />
        <Metric label="Vendor queue" value={formatCurrency(center.metrics.pendingVendor)} detail="Pending payouts" />
        <Metric label="Deposits held" value={formatCurrency(center.metrics.depositsHeld)} detail="Escrow tracking" />
        <Metric label="Credit ready" value={String(center.metrics.creditReady)} detail="Records queued" />
        <Metric label="Risk snapshots" value={String(center.insights.length)} detail="Latest insights" />
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Vendor payouts">
          <form action={createVendorPayoutAction} className="grid gap-2 md:grid-cols-4">
            <select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold md:col-span-1" required>
              <option value="">Unit</option>{center.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}
            </select>
            <input name="amount" type="number" min="0" step="0.01" placeholder="Amount" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" required />
            <input name="description" placeholder="Description" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" required />
            <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Create</button>
          </form>
          <div className="mt-3 divide-y divide-slate-100">
            {center.vendorPayouts.map((payout) => <div key={payout.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div><p className="font-black text-slate-900">{formatCurrency(payout.amount)} / {payout.status.replaceAll("_", " ")}</p><p className="text-xs font-semibold text-slate-500">{payout.description} / <UnitLabel item={payout.unit} /></p></div>{payout.status === "APPROVAL_REQUIRED" || payout.status === "DRAFT" ? <form action={approveVendorPayoutAction}><input type="hidden" name="id" value={payout.id} /><button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black">Approve</button></form> : null}</div>)}
          </div>
        </Card>

        <Card title="Security deposits / escrow">
          <form action={createSecurityDepositAction} className="grid gap-2 md:grid-cols-5">
            <select name="unitId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" required><option value="">Unit</option>{center.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select>
            <input name="amountRequired" type="number" min="0" step="0.01" placeholder="Required" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" required />
            <input name="amountHeld" type="number" min="0" step="0.01" placeholder="Held" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
            <input name="notes" placeholder="Notes" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
            <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Track</button>
          </form>
          <div className="mt-3 divide-y divide-slate-100">
            {center.deposits.map((deposit) => <div key={deposit.id} className="grid gap-2 py-2 text-sm md:grid-cols-[1fr_auto]"><div><p className="font-black text-slate-900"><UnitLabel item={deposit.unit} /> / {deposit.status.replaceAll("_", " ")}</p><p className="text-xs font-semibold text-slate-500">Held {formatCurrency(deposit.amountHeld)} / Released {formatCurrency(deposit.amountReleased)} / Deductions {formatCurrency(deposit.deductions)}</p></div><form action={reconcileSecurityDepositAction} className="flex flex-wrap gap-1"><input type="hidden" name="id" value={deposit.id} /><input name="amountReleased" type="number" min="0" step="0.01" placeholder="Release" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" /><input name="deductions" type="number" min="0" step="0.01" placeholder="Deduct" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" /><button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black">Update</button></form></div>)}
          </div>
        </Card>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card title="Dispute center">
          <div className="divide-y divide-slate-100">{center.disputes.map((dispute) => <div key={dispute.id} className="py-2 text-sm"><p className="font-black text-slate-900">{formatCurrency(dispute.amount)} / {dispute.status.replaceAll("_", " ")}</p><p className="text-xs font-semibold text-slate-500">{dispute.reason ?? "No reason provided"} / <UnitLabel item={dispute.unit} /></p></div>)}</div>
        </Card>
        <Card title="Accounting exports">
          <form action={generateAccountingExportAction} className="grid gap-2">
            <input name="month" type="month" defaultValue={center.month} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
            <select name="type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><option value="QUICKBOOKS_CSV">QuickBooks CSV</option><option value="XERO_CSV">Xero CSV</option><option value="OWNER_STATEMENT_CSV">Owner statement CSV</option><option value="PORTFOLIO_SUMMARY_CSV">Portfolio summary CSV</option></select>
            <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Generate export record</button>
          </form>
          <div className="mt-3 divide-y divide-slate-100">{center.exports.map((item) => <p key={item.id} className="py-2 text-xs font-bold text-slate-600">{item.fileName} / {item.rowCount} rows / {formatCurrency(item.totalAmount)}</p>)}</div>
        </Card>
        <Card title="Credit reporting readiness">
          <form action={generateCreditReportingRecordsAction} className="grid gap-2"><input name="month" type="month" defaultValue={center.month} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" /><button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Generate reporting records</button></form>
          <div className="mt-3 divide-y divide-slate-100">{center.creditRecords.map((record) => <p key={record.id} className="py-2 text-xs font-bold text-slate-600">{record.period} / {record.status} / {formatCurrency(record.amountDue)} / {record.paidOnTime ? "On-time" : "Review"}</p>)}</div>
        </Card>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_2fr]">
        <Card title="AI-style risk insights"><form action={refreshFinancialInsightsAction}><button className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white">Refresh insights</button></form></Card>
        <Card title="Latest portfolio intelligence">
          <div className="grid gap-2 md:grid-cols-2">{center.insights.map((insight) => <div key={insight.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-black text-slate-950">{insight.riskLevel} risk / score {insight.score}</p><p className="mt-1 text-xs font-semibold text-slate-600">{insight.recommendation}</p></div>)}</div>
        </Card>
      </section>
    </main>
  );
}
