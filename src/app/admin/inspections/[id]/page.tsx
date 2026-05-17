import Link from "next/link";
import { notFound } from "next/navigation";
import { InspectionChecklistStatus, InspectionStatus } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, selectClass, textareaClass, inputClass, SubmitButton } from "@/components/admin/FormFields";
import { addInspectionChecklistItem, updateInspectionChecklistItem, updateInspectionStatus } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

const inspectionStatuses: InspectionStatus[] = ["SCHEDULED", "IN_PROGRESS", "PASSED", "FAILED", "NEEDS_REINSPECTION", "CANCELLED"];
const checklistStatuses: InspectionChecklistStatus[] = ["PENDING", "PASS", "FAIL", "NA"];

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: params.id },
    include: {
      unit: { include: { property: { include: { owner: true } } } },
      application: true,
      assignedTo: true,
      checklistItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });
  if (!inspection) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Inspection Detail" description={`${inspection.unit.property.name} - Unit ${inspection.unit.unitNumber}`} />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Checklist</h2>
            <div className="mt-5 space-y-4">
              {inspection.checklistItems.map((item) => (
                <form key={item.id} action={updateInspectionChecklistItem} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="itemId" value={item.id} />
                  <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                    <div>
                      <p className="font-bold text-slate-950">{item.label}</p>
                      <textarea name="notes" className={`${textareaClass} mt-3 min-h-16`} defaultValue={item.notes || ""} placeholder="Checklist notes" />
                    </div>
                    <div className="space-y-3">
                      <select name="status" className={selectClass} defaultValue={item.status}>
                        {checklistStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                      </select>
                      <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-bold text-white hover:bg-brand-700">Update</button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </div>

          <form action={addInspectionChecklistItem} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="inspectionId" value={inspection.id} />
            <h2 className="text-2xl font-black text-slate-950">Add checklist item</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_120px_auto] md:items-end">
              <Field label="Item"><input name="label" className={inputClass} required /></Field>
              <Field label="Sort"><input name="sortOrder" type="number" className={inputClass} defaultValue={50} /></Field>
              <SubmitButton>Add Item</SubmitButton>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Status</h2>
            <form action={updateInspectionStatus} className="mt-5 space-y-4">
              <input type="hidden" name="inspectionId" value={inspection.id} />
              <Field label="Inspection status">
                <select name="status" className={selectClass} defaultValue={inspection.status}>
                  {inspectionStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
              </Field>
              <Field label="Result summary"><textarea name="resultSummary" className={textareaClass} defaultValue={inspection.resultSummary || ""} /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClass} defaultValue={inspection.notes || ""} /></Field>
              <SubmitButton>Update Inspection</SubmitButton>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Inspection Info</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="font-bold text-slate-500">Scheduled</dt><dd>{inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled"}</dd></div>
              <div><dt className="font-bold text-slate-500">Completed</dt><dd>{inspection.completedAt ? inspection.completedAt.toLocaleString() : "Not completed"}</dd></div>
              <div><dt className="font-bold text-slate-500">Assigned</dt><dd>{inspection.assignedTo?.name || inspection.inspectorName || "Unassigned"}</dd></div>
              <div><dt className="font-bold text-slate-500">Landlord</dt><dd>{inspection.unit.property.owner?.name || inspection.unit.property.owner?.email || "Unassigned"}</dd></div>
              {inspection.application ? <div><dt className="font-bold text-slate-500">Application</dt><dd><Link href={`/admin/applications/${inspection.application.id}`} className="font-bold text-brand-700">{inspection.application.applicantName}</Link></dd></div> : null}
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}
