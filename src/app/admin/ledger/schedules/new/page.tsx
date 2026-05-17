import { RecurringChargeFrequency } from "@prisma/client";
import { createRecurringChargeSchedule } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";

export default async function NewRecurringChargeSchedulePage() {
  const [units, applications, tenants] = await Promise.all([
    prisma.unit.findMany({ where: { NOT: { status: "ARCHIVED" }, property: { isArchived: false } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], include: { property: true } }),
    prisma.application.findMany({ where: { status: { in: ["APPROVED", "SUBMITTED", "UNDER_REVIEW", "STARTED"] } }, orderBy: { updatedAt: "desc" }, include: { unit: { include: { property: true } } } }),
    prisma.user.findMany({ where: { role: { in: ["APPLICANT", "TENANT"] }, isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="New Recurring Charge Schedule" description="Create a monthly charge schedule for rent, tenant rent share, subsidy share, or recurring fees." />
      <form action={createRecurringChargeSchedule} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Schedule name</span><input name="name" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Monthly rent charge" /></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Ledger description</span><input name="description" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Monthly rent" /></label>
          <input type="hidden" name="frequency" value={RecurringChargeFrequency.MONTHLY} />
          <label className="block"><span className="text-sm font-bold text-slate-700">Total amount</span><input name="amount" type="number" min="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="850" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Due day of month</span><input name="dayOfMonth" type="number" min="1" max="28" defaultValue="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Tenant portion, optional</span><input name="tenantPortionAmount" type="number" min="0" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="350" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Subsidy portion, optional</span><input name="subsidyPortionAmount" type="number" min="0" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="500" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Start date</span><input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">End date, optional</span><input name="endDate" type="date" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Unit</span><select name="unitId" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} - Unit {unit.unitNumber}</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Application, optional</span><select name="applicationId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No linked application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} - {application.unit.property.name} Unit {application.unit.unitNumber}</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Tenant/applicant account, optional</span><select name="tenantUserId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No linked user</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name || tenant.email} ({tenant.email})</option>)}</select></label>
        </div>
        <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">When tenant/subsidy portions are entered, they must equal the total amount. The generated ledger entry stores the split in the memo for review.</p>
        <div className="mt-6 flex justify-end"><button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Create Schedule</button></div>
      </form>
    </main>
  );
}
