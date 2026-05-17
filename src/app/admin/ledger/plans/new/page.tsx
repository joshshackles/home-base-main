export const dynamic = "force-dynamic";

import { createPaymentPlan } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { ledgerBalance } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export default async function NewPaymentPlanPage() {
  const [applications, units, tenants] = await Promise.all([
    prisma.application.findMany({ orderBy: { updatedAt: "desc" }, include: { unit: { include: { property: true } }, ledgerEntries: true } }),
    prisma.unit.findMany({ where: { property: { isArchived: false } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], include: { property: true } }),
    prisma.user.findMany({ where: { role: { in: ["APPLICANT", "TENANT"] }, isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="New Payment Plan" description="Create an installment plan for an open application or tenant balance." />
      <form action={createPaymentPlan} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Plan name</span><input name="name" required placeholder="Jane Doe repayment plan" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Application</span><select name="applicationId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No application link</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} · {application.unit.property.name} Unit {application.unit.unitNumber} · balance {formatCurrency(ledgerBalance(application.ledgerEntries))}</option>)}</select></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Unit</span><select name="unitId" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} · Unit {unit.unitNumber}</option>)}</select></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Tenant/applicant user</span><select name="tenantUserId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No user link</option>{tenants.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} · {user.email}</option>)}</select></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Total plan amount</span><input name="totalAmount" type="number" min="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Monthly installment amount</span><input name="installmentAmount" type="number" min="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Due day of month</span><input name="dueDayOfMonth" type="number" min="1" max="28" defaultValue="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Start date</span><input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Notes</span><textarea name="notes" rows={5} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Reason for plan, verbal agreement details, or internal follow-up notes." /></label>
        </div>
        <button className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Create Payment Plan</button>
      </form>
    </main>
  );
}
