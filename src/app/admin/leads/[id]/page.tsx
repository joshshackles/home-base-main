import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { addLeadNote, convertLeadToApplication, updateLeadStatus } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, selectClass, textareaClass } from "@/components/admin/FormFields";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      unit: { include: { property: true } },
      notes: { orderBy: { createdAt: "desc" } },
      application: true
    }
  });

  if (!lead) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={lead.name}
        description="Manage this marketplace lead, record follow-up notes, and start an application when the applicant is ready."
        actionHref="/admin/leads"
        actionLabel="Back to leads"
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Lead details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-slate-500">Email</p><p className="mt-1 font-semibold text-slate-900">{lead.email}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Phone</p><p className="mt-1 font-semibold text-slate-900">{lead.phone ?? "Not provided"}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Status</p><p className="mt-1 font-semibold text-slate-900">{label(lead.status)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Received</p><p className="mt-1 font-semibold text-slate-900">{lead.createdAt.toLocaleString()}</p></div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700">
              <p className="text-xs font-bold uppercase text-slate-500">Original message</p>
              <p className="mt-2 leading-7">{lead.message ?? "No message provided."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Follow-up notes</h2>
            <form action={addLeadNote} className="mt-5 space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Add note">
                <textarea name="note" className={textareaClass} placeholder="Example: Called applicant and left voicemail about next steps." required />
              </Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Note</button>
            </form>
            <div className="mt-6 space-y-3">
              {lead.notes.length === 0 ? <p className="text-slate-600">No notes have been added yet.</p> : lead.notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="leading-7 text-slate-700">{note.note}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Unit</h2>
            <p className="mt-3 text-lg font-bold text-slate-950">{lead.unit.property.name} #{lead.unit.unitNumber}</p>
            <p className="text-slate-600">{lead.unit.property.city}, {lead.unit.property.state}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(lead.unit.rentAmount)}</p>
            <Link href={`/marketplace/${lead.unit.id}`} className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">View listing</Link>
          </div>

          <form action={updateLeadStatus} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="id" value={lead.id} />
            <Field label="Lead status">
              <select name="status" className={selectClass} defaultValue={lead.status}>
                {Object.values(LeadStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            </Field>
            <button type="submit" className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Update Status</button>
          </form>

          <form action={convertLeadToApplication} className="rounded-3xl border border-brand-100 bg-brand-50 p-6 shadow-sm">
            <input type="hidden" name="leadId" value={lead.id} />
            <h2 className="text-xl font-black text-slate-950">Application workflow</h2>
            {lead.application ? (
              <Link href={`/admin/applications/${lead.application.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Application</Link>
            ) : (
              <>
                <Field label="Application starter note" help="Optional. This becomes the first application note.">
                  <textarea name="summary" className={textareaClass} placeholder="Applicant is ready to begin the application process." />
                </Field>
                <button type="submit" className="mt-4 w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Convert to Application</button>
              </>
            )}
          </form>
        </aside>
      </section>
    </main>
  );
}
