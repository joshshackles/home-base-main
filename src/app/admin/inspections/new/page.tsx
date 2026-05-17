import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, inputClass, selectClass, textareaClass, SubmitButton, SecondaryLink } from "@/components/admin/FormFields";
import { createInspection } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

export default async function NewInspectionPage() {
  const [units, inspectors, applications] = await Promise.all([
    prisma.unit.findMany({ where: { NOT: { status: "ARCHIVED" }, property: { isArchived: false } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], include: { property: true } }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSPECTOR"] }, isActive: true }, orderBy: { name: "asc" } }),
    prisma.application.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } }, orderBy: { createdAt: "desc" }, include: { unit: { include: { property: true } } } })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Schedule Inspection" description="Create an inspection connected to a unit and, when helpful, to an active application." />
      <form action={createInspection} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Unit">
          <select name="unitId" className={selectClass} required>
            <option value="">Select a unit</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} - Unit {unit.unitNumber}</option>)}
          </select>
        </Field>
        <Field label="Related application" help="Optional. Use this when the inspection is tied to an applicant workflow.">
          <select name="applicationId" className={selectClass}>
            <option value="">No application</option>
            {applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} - {application.unit.property.name} Unit {application.unit.unitNumber}</option>)}
          </select>
        </Field>
        <Field label="Assigned inspector">
          <select name="assignedToId" className={selectClass}>
            <option value="">Unassigned</option>
            {inspectors.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} ({user.role})</option>)}
          </select>
        </Field>
        <Field label="Scheduled date and time"><input name="scheduledFor" type="datetime-local" className={inputClass} /></Field>
        <Field label="Inspector name"><input name="inspectorName" className={inputClass} placeholder="Optional outside inspector name" /></Field>
        <Field label="Notes"><textarea name="notes" className={textareaClass} /></Field>
        <div className="flex gap-3"><SubmitButton>Schedule Inspection</SubmitButton><SecondaryLink href="/admin/inspections">Cancel</SecondaryLink></div>
      </form>
    </main>
  );
}
