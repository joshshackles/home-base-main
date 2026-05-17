import { notFound } from "next/navigation";
import { pauseRecurringChargeSchedule, resumeRecurringChargeSchedule } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerBalance } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export default async function RecurringChargeScheduleDetailPage({ params }: { params: { id: string } }) {
  const schedule = await prisma.recurringChargeSchedule.findUnique({ where: { id: params.id }, include: { unit: { include: { property: true, ledgerEntries: true } }, application: { include: { ledgerEntries: true } }, tenantUser: true, createdBy: true } });
  if (!schedule) notFound();
  const relevantEntries = schedule.application?.ledgerEntries ?? schedule.unit.ledgerEntries;
  const openBalance = ledgerBalance(relevantEntries);
  const oldestOpenCharge = relevantEntries.filter((entry) => entry.status !== "VOIDED" && entry.type === "CHARGE").sort((a, b) => (a.dueDate?.getTime() ?? a.postedAt.getTime()) - (b.dueDate?.getTime() ?? b.postedAt.getTime()))[0];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title={schedule.name} description="Review schedule details, balance aging, and pause or resume monthly charge generation." />
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{schedule.isActive ? "Active" : "Paused"} · Monthly</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{formatCurrency(schedule.amount)}</h1>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div><dt className="text-sm font-bold text-slate-500">Unit</dt><dd className="mt-1 text-slate-950">{schedule.unit.property.name} Unit {schedule.unit.unitNumber}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Applicant/Tenant</dt><dd className="mt-1 text-slate-950">{schedule.application?.applicantName || schedule.tenantUser?.name || schedule.tenantUser?.email || "Not linked"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Description</dt><dd className="mt-1 text-slate-950">{schedule.description}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Due day</dt><dd className="mt-1 text-slate-950">{schedule.dayOfMonth}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Next run</dt><dd className="mt-1 text-slate-950">{schedule.nextRunDate.toLocaleDateString()}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Last run</dt><dd className="mt-1 text-slate-950">{schedule.lastRunDate ? schedule.lastRunDate.toLocaleDateString() : "Not run yet"}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">Start date</dt><dd className="mt-1 text-slate-950">{schedule.startDate.toLocaleDateString()}</dd></div>
            <div><dt className="text-sm font-bold text-slate-500">End date</dt><dd className="mt-1 text-slate-950">{schedule.endDate ? schedule.endDate.toLocaleDateString() : "None"}</dd></div>
          </dl>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Tenant Portion</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(schedule.tenantPortionAmount ?? schedule.amount)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Subsidy Portion</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(schedule.subsidyPortionAmount ?? 0)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Balance Aging</p><p className="mt-1 text-2xl font-black text-slate-950">{agingBucket(oldestOpenCharge?.dueDate)}</p></div>
          </div>
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Controls</h2>
          <p className="mt-4 text-sm text-slate-600">Current linked balance: <strong>{formatCurrency(openBalance)}</strong></p>
          <form action={schedule.isActive ? pauseRecurringChargeSchedule : resumeRecurringChargeSchedule} className="mt-4">
            <input type="hidden" name="scheduleId" value={schedule.id} />
            <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">{schedule.isActive ? "Pause Schedule" : "Resume Schedule"}</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
