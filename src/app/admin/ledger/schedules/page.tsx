export const dynamic = "force-dynamic";

import Link from "next/link";
import { generateRecurringCharges, pauseRecurringChargeSchedule, resumeRecurringChargeSchedule } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function RecurringChargeSchedulesPage() {
  const [schedules, overdueCount] = await Promise.all([
    prisma.recurringChargeSchedule.findMany({
      orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
      include: { unit: { include: { property: true } }, application: true, tenantUser: true }
    }),
    prisma.recurringChargeSchedule.count({ where: { isActive: true, nextRunDate: { lte: new Date() } } })
  ]);
  const activeCount = schedules.filter((schedule) => schedule.isActive).length;
  const monthlyTotal = schedules.filter((schedule) => schedule.isActive).reduce((sum, schedule) => sum + schedule.amount, 0);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Recurring Charge Schedules" description="Generate monthly rent charges with due dates, balance aging, and optional tenant/subsidy split notes." actionHref="/admin/ledger/schedules/new" actionLabel="New Schedule" />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Active Schedules</p><p className="mt-2 text-4xl font-black text-slate-950">{activeCount}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Monthly Scheduled Charges</p><p className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(monthlyTotal)}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Due to Generate</p><p className="mt-2 text-4xl font-black text-amber-700">{overdueCount}</p></div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={generateRecurringCharges} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Generate scheduled charges</h2>
            <p className="mt-1 text-sm text-slate-600">This creates posted charge entries for schedules due on or before the selected date. Existing matching entries are skipped.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block"><span className="text-sm font-bold text-slate-700">Run through date</span><input name="runThroughDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-2 rounded-2xl border border-slate-300 px-4 py-3" /></label>
            <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Generate Charges</button>
          </div>
        </form>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Applicant/Tenant</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Split</th><th className="px-5 py-4">Next Run</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="px-5 py-4"><Link className="font-black text-brand-700" href={`/admin/ledger/schedules/${schedule.id}`}>{schedule.name}</Link><br/><span className="text-xs text-slate-500">Due day {schedule.dayOfMonth}</span></td>
                <td className="px-5 py-4 font-bold text-slate-950">{schedule.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {schedule.unit.unitNumber}</span></td>
                <td className="px-5 py-4 text-slate-700">{schedule.application?.applicantName || schedule.tenantUser?.name || schedule.tenantUser?.email || "Not linked"}</td>
                <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(schedule.amount)}</td>
                <td className="px-5 py-4 text-slate-600">Tenant {formatCurrency(schedule.tenantPortionAmount ?? schedule.amount)}<br/>Subsidy {formatCurrency(schedule.subsidyPortionAmount ?? 0)}</td>
                <td className="px-5 py-4 text-slate-700">{schedule.nextRunDate.toLocaleDateString()}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${schedule.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>{schedule.isActive ? "Active" : "Paused"}</span></td>
                <td className="px-5 py-4">
                  <form action={schedule.isActive ? pauseRecurringChargeSchedule : resumeRecurringChargeSchedule}>
                    <input type="hidden" name="scheduleId" value={schedule.id} />
                    <button className="font-bold text-brand-700">{schedule.isActive ? "Pause" : "Resume"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {schedules.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">No recurring charge schedules have been created yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
