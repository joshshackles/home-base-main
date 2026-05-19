export const dynamic = "force-dynamic";

import { LedgerEntryType, PaymentMethod } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createLedgerEntry } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function NewLedgerEntryPage() {
  const [units, applications, tenants] = await Promise.all([
    prisma.unit.findMany({ where: { NOT: { status: "ARCHIVED" }, property: { isArchived: false } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], include: { property: true } }),
    prisma.application.findMany({ where: { status: { in: ["APPROVED", "UNDER_REVIEW", "SUBMITTED", "STARTED"] } }, orderBy: { updatedAt: "desc" }, include: { unit: { include: { property: true } } } }),
    prisma.user.findMany({ where: { role: { in: ["APPLICANT", "TENANT"] }, isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Add Ledger Entry" description="Record a charge, payment, credit, or adjustment. This records history only and does not process online payments." />
      <form action={createLedgerEntry} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="text-sm font-bold text-slate-700">Entry type</span><select name="type" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value={LedgerEntryType.CHARGE}>Charge</option><option value={LedgerEntryType.PAYMENT}>Payment</option><option value={LedgerEntryType.CREDIT}>Credit</option><option value={LedgerEntryType.ADJUSTMENT}>Adjustment</option></select></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Amount</span><input name="amount" type="number" min="1" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="850" /></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Unit</span><select name="unitId" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} - Unit {unit.unitNumber}</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Application, optional</span><select name="applicationId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No linked application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} - {application.unit.property.name} Unit {application.unit.unitNumber}</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Tenant/applicant account, optional</span><select name="tenantUserId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No linked user</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name || tenant.email} ({tenant.email})</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Description</span><input name="description" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="May rent charge, security deposit, payment received, etc." /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Due date, optional</span><input name="dueDate" type="date" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Paid date, optional</span><input name="paidAt" type="date" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Payment method, optional</span><select name="paymentMethod" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">None</option>{Object.values(PaymentMethod).map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
          <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Memo</span><textarea name="memo" rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Optional internal note." /></label>
        </div>
        <div className="mt-6 flex justify-end"><button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Ledger Entry</button></div>
      </form>
    </main>
  );
}
