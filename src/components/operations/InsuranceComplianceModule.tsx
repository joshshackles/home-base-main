import type { ReactNode } from "react";
import { ComplianceRecordStatus, InsurancePolicyType } from "@prisma/client";
import { OperationsModuleView, money, unitLabel } from "@/components/operations/OperationsModuleView";
import { titleCase } from "@/lib/operations/modules";

type ComplianceData = Awaited<ReturnType<typeof import("@/lib/operations/modules").getInsuranceComplianceModule>>;
type ComplianceActions = {
  createPolicy: (formData: FormData) => Promise<void>;
  createCertification: (formData: FormData) => Promise<void>;
  createRequirement: (formData: FormData) => Promise<void>;
};

const inputClass = "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "text-xs font-black uppercase tracking-wide text-slate-500";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={labelClass}>{label}{children}</label>;
}

function DateInput({ name }: { name: string }) {
  return <input name={name} type="date" className={inputClass} />;
}

function RentalScopeSelect({ data }: { data: ComplianceData }) {
  return <select name="unitId" className={inputClass}><option value="">Portfolio-wide</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</select>;
}

function ApplicationSelect({ data }: { data: ComplianceData }) {
  return <select name="applicationId" className={inputClass}><option value="">Not tied to application</option>{data.applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} — {unitLabel(application.unit)}</option>)}</select>;
}

function StatusSelect() {
  return <select name="status" className={inputClass}>{Object.values(ComplianceRecordStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select>;
}

function ModuleForms({ data, actions }: { data: ComplianceData; actions: ComplianceActions }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <form action={actions.createPolicy} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Add insurance policy</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Track renters insurance, landlord policies, liability, flood, umbrella, document links, and expirations.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Policy type"><select name="type" className={inputClass}>{Object.values(InsurancePolicyType).map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></Field>
          <Field label="Status"><StatusSelect /></Field>
          <Field label="Applies to"><RentalScopeSelect data={data} /></Field>
          <Field label="Application"><ApplicationSelect data={data} /></Field>
          <Field label="Provider"><input name="providerName" className={inputClass} placeholder="State Farm, Assurant, Travelers" /></Field>
          <Field label="Policy number"><input name="policyNumber" className={inputClass} placeholder="Policy / binder number" /></Field>
          <Field label="Coverage amount"><input name="coverageAmount" type="number" min="0" step="0.01" className={inputClass} placeholder="100000" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Effective"><DateInput name="effectiveAt" /></Field><Field label="Expires"><DateInput name="expiresAt" /></Field></div>
          <Field label="Document URL"><input name="documentUrl" className={inputClass} placeholder="https://..." /></Field>
          <Field label="Notes"><textarea name="notes" className={`${inputClass} min-h-24`} placeholder="Coverage details, required limits, follow-up notes" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-800">Save policy</button>
      </form>

      <form action={actions.createCertification} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Add certification</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Monitor permits, licenses, occupancy certificates, elevator/fire/safety certifications, and expirations.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Certification name"><input name="name" required className={inputClass} placeholder="Occupancy permit, fire certificate" /></Field>
          <Field label="Status"><StatusSelect /></Field>
          <Field label="Applies to"><RentalScopeSelect data={data} /></Field>
          <Field label="Issuing authority"><input name="issuingAuthority" className={inputClass} placeholder="City, county, state agency" /></Field>
          <Field label="Certificate number"><input name="certificateNumber" className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Issued"><DateInput name="issuedAt" /></Field><Field label="Expires"><DateInput name="expiresAt" /></Field></div>
          <Field label="Document URL"><input name="documentUrl" className={inputClass} placeholder="https://..." /></Field>
          <Field label="Notes"><textarea name="notes" className={`${inputClass} min-h-24`} placeholder="Renewal requirements, inspector contact, filing instructions" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Save certification</button>
      </form>

      <form action={actions.createRequirement} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Add inspection rule</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Create recurring inspection compliance rules with last-completed and next-due tracking.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Requirement name"><input name="name" required className={inputClass} placeholder="Annual fire inspection, unit safety check" /></Field>
          <Field label="Status"><StatusSelect /></Field>
          <Field label="Applies to"><RentalScopeSelect data={data} /></Field>
          <Field label="Frequency months"><input name="requiredEveryMonths" type="number" min="0" step="1" className={inputClass} placeholder="12" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Last completed"><DateInput name="lastCompletedAt" /></Field><Field label="Next due"><DateInput name="nextDueAt" /></Field></div>
          <Field label="Notes"><textarea name="notes" className={`${inputClass} min-h-24`} placeholder="Checklist, inspector, access, penalty risk, documentation needed" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Save rule</button>
      </form>
    </div>
  );
}

export function InsuranceComplianceModule({ data, actions }: { data: ComplianceData; actions: ComplianceActions }) {
  return (
    <>
      <OperationsModuleView
        title="Insurance and compliance"
        eyebrow="Update 11"
        description="Renters insurance tracking, landlord insurance docs, inspection compliance, certifications, document links, and expiration risk management."
        metrics={[
          { label: "Policies", value: data.counts.policies },
          { label: "Certifications", value: data.counts.certifications },
          { label: "Inspection rules", value: data.counts.requirements },
          { label: "Needs attention", value: data.counts.risky, tone: data.counts.risky ? "warn" : "good" }
        ]}
        sections={[
          { title: "Insurance tracking", empty: "No renters or landlord insurance policies have been tracked yet.", rows: data.policies.map((item) => ({ title: `${titleCase(item.type)} insurance`, subtitle: item.providerName ?? item.application?.applicantName ?? unitLabel(item.unit), meta: [item.policyNumber, item.coverageAmountCents ? money(item.coverageAmountCents) : null, item.expiresAt ? `Expires ${item.expiresAt.toLocaleDateString()}` : null].filter(Boolean).join(" • "), status: item.status })) },
          { title: "Certification expirations", empty: "No certifications are being monitored yet.", rows: data.certifications.map((item) => ({ title: item.name, subtitle: item.issuingAuthority ?? item.property?.name ?? unitLabel(item.unit), meta: [item.certificateNumber, item.expiresAt ? `Expires ${item.expiresAt.toLocaleDateString()}` : null].filter(Boolean).join(" • "), status: item.status })) },
          { title: "Inspection compliance", empty: "No recurring inspection requirements have been configured yet.", rows: data.requirements.map((item) => ({ title: item.name, subtitle: item.requiredEveryMonths ? `Every ${item.requiredEveryMonths} months` : item.property?.name ?? unitLabel(item.unit), meta: item.nextDueAt ? `Next due ${item.nextDueAt.toLocaleDateString()}` : "No due date", status: item.status })) }
        ]}
      />
      <div className="px-4 pb-8 sm:px-6 lg:px-8"><ModuleForms data={data} actions={actions} /></div>
    </>
  );
}
