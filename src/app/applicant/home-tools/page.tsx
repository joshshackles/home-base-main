export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { PayrollFrequency, TenantPaymentMethod, TenantPaymentStatus, UtilityAccountStatus } from "@prisma/client";
import { deletePayrollReminder, deleteTenantPayment, deleteUtilityAccount, savePayrollReminder, saveTenantPayment, saveUtilityAccount } from "@/app/applicant/actions";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function ApplicantHomeToolsPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/home-tools");
  const [applications, utilities, payroll, payments, openLedger] = await Promise.all([
    prisma.application.findMany({
      where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] },
      include: { unit: { include: { property: true } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.utilityAccount.findMany({ where: { userId: user.userId }, include: { unit: { include: { property: true } }, application: true }, orderBy: [{ status: "asc" }, { dueDayOfMonth: "asc" }] }),
    prisma.payrollReminder.findMany({ where: { userId: user.userId }, orderBy: [{ nextPayDate: "asc" }, { createdAt: "desc" }] }),
    prisma.tenantPayment.findMany({ where: { userId: user.userId }, include: { unit: { include: { property: true } }, application: true, ledgerEntry: true }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] }),
    prisma.ledgerEntry.findMany({
      where: { status: { not: "VOIDED" }, OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }, { application: { applicantEmail: user.email } }] },
      include: { unit: { include: { property: true } }, application: true },
      orderBy: [{ dueDate: "asc" }, { postedAt: "desc" }],
      take: 20
    })
  ]);

  const unitOptions = Array.from(new Map(applications.map((application) => [application.unit.id, application.unit])).values());
  const totalPlanned = payments.filter((payment) => payment.status === "PLANNED" || payment.status === "SUBMITTED").reduce((sum, payment) => sum + payment.amount, 0);
  const utilityMonthly = utilities.reduce((sum, utility) => sum + (utility.averageAmount ?? 0), 0);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-200">Tenant tools</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Home, bills, payroll, and payments</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">Track utilities, paydays, rent plans, payment confirmations, and maintenance readiness once you are in a home.</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Utilities" value={`${utilities.length}`} />
        <Stat label="Utility Budget" value={formatCurrency(utilityMonthly)} />
        <Stat label="Paydays" value={`${payroll.length}`} />
        <Stat label="Planned Payments" value={formatCurrency(totalPlanned)} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Panel title="Add Utility">
            <form action={saveUtilityAccount} className="grid gap-4">
              <Field label="Home / application"><select name="applicationId" className={selectClass}><option value="">No application link</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.unit.property.name} #{application.unit.unitNumber}</option>)}</select></Field>
              <Field label="Provider"><input name="providerName" required className={inputClass} placeholder="Electric company, water, internet..." /></Field>
              <Field label="Service type"><input name="serviceType" required className={inputClass} placeholder="Electric, gas, water, internet" /></Field>
              <Field label="Account number"><input name="accountNumber" className={inputClass} /></Field>
              <Field label="Status"><select name="status" className={selectClass}>{Object.values(UtilityAccountStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
              <Field label="Due day"><input name="dueDayOfMonth" type="number" min="1" max="31" className={inputClass} /></Field>
              <Field label="Average amount"><input name="averageAmount" type="number" min="0" className={inputClass} /></Field>
              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"><input name="autopayEnabled" type="checkbox" className="mt-1 h-4 w-4" /> Autopay enabled</label>
              <Field label="Notes"><textarea name="notes" className={textareaClass} /></Field>
              <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Save Utility</button>
            </form>
          </Panel>

          <Panel title="Add Payroll Reminder">
            <form action={savePayrollReminder} className="grid gap-4">
              <Field label="Employer"><input name="employerName" required className={inputClass} /></Field>
              <Field label="Frequency"><select name="frequency" className={selectClass}>{Object.values(PayrollFrequency).map((frequency) => <option key={frequency} value={frequency}>{label(frequency)}</option>)}</select></Field>
              <Field label="Next pay date"><input name="nextPayDate" type="date" className={inputClass} /></Field>
              <Field label="Typical amount"><input name="typicalAmount" type="number" min="0" className={inputClass} /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClass} /></Field>
              <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Save Payroll</button>
            </form>
          </Panel>

          <Panel title="Plan / Record Payment">
            <form action={saveTenantPayment} className="grid gap-4">
              <Field label="Unit"><select name="unitId" required className={selectClass}><option value="">Select unit</option>{unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select></Field>
              <Field label="Application"><select name="applicationId" className={selectClass}><option value="">No application link</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.unit.property.name} #{application.unit.unitNumber}</option>)}</select></Field>
              <Field label="Ledger item, optional"><select name="ledgerEntryId" className={selectClass}><option value="">No ledger link</option>{openLedger.map((entry) => <option key={entry.id} value={entry.id}>{entry.description} - {formatCurrency(entry.amount)}</option>)}</select></Field>
              <Field label="Amount"><input name="amount" required type="number" min="1" className={inputClass} /></Field>
              <Field label="Method"><select name="method" className={selectClass}>{Object.values(TenantPaymentMethod).map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></Field>
              <Field label="Status"><select name="status" className={selectClass}>{Object.values(TenantPaymentStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
              <Field label="Due date"><input name="dueDate" type="date" className={inputClass} /></Field>
              <Field label="Confirmation"><input name="confirmation" className={inputClass} placeholder="Receipt number, check number, confirmation code" /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClass} /></Field>
              <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Save Payment</button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Utilities">
            <div className="space-y-3">
              {utilities.length === 0 ? <p className="text-slate-600">No utilities tracked yet.</p> : utilities.map((utility) => (
                <Record key={utility.id} title={`${utility.serviceType}: ${utility.providerName}`} meta={`${label(utility.status)}${utility.dueDayOfMonth ? ` - due day ${utility.dueDayOfMonth}` : ""}`} amount={utility.averageAmount}>
                  <p className="text-sm text-slate-600">{utility.unit ? `${utility.unit.property.name} #${utility.unit.unitNumber}` : "No home linked"}{utility.autopayEnabled ? " - autopay" : ""}</p>
                  {utility.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{utility.notes}</p> : null}
                  <DeleteForm action={deleteUtilityAccount} id={utility.id} />
                </Record>
              ))}
            </div>
          </Panel>

          <Panel title="Payroll">
            <div className="space-y-3">
              {payroll.length === 0 ? <p className="text-slate-600">No payroll reminders saved yet.</p> : payroll.map((item) => (
                <Record key={item.id} title={item.employerName} meta={`${label(item.frequency)}${item.nextPayDate ? ` - next ${item.nextPayDate.toLocaleDateString()}` : ""}`} amount={item.typicalAmount}>
                  {item.notes ? <p className="whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p> : null}
                  <DeleteForm action={deletePayrollReminder} id={item.id} />
                </Record>
              ))}
            </div>
          </Panel>

          <Panel title="Payments">
            <div className="space-y-3">
              {payments.length === 0 ? <p className="text-slate-600">No tenant payments saved yet.</p> : payments.map((payment) => (
                <Record key={payment.id} title={`${payment.unit.property.name} #${payment.unit.unitNumber}`} meta={`${label(payment.status)} - ${label(payment.method)}${payment.dueDate ? ` - ${payment.dueDate.toLocaleDateString()}` : ""}`} amount={payment.amount}>
                  {payment.confirmation ? <p className="text-sm text-slate-600">Confirmation: {payment.confirmation}</p> : null}
                  {payment.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{payment.notes}</p> : null}
                  <DeleteForm action={deleteTenantPayment} id={payment.id} />
                </Record>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Record({ title, meta, amount, children }: { title: string; meta: string; amount?: number | null; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-600">{meta}</p></div>{amount !== null && amount !== undefined ? <p className="text-xl font-black text-slate-950">{formatCurrency(amount)}</p> : null}</div><div className="mt-3">{children}</div></article>;
}

function DeleteForm({ action, id }: { action: (formData: FormData) => Promise<void>; id: string }) {
  return <form action={action} className="mt-3"><input type="hidden" name="id" value={id} /><button className="text-sm font-bold text-rose-700" type="submit">Remove</button></form>;
}
