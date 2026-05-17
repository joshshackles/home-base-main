export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { addLandlordLeadNote } from "@/app/landlord/actions";
import { Field, textareaClass } from "@/components/admin/FormFields";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordLeadDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: { unit: { include: { property: true } }, notes: { orderBy: { createdAt: "desc" } }, application: true }
  });

  if (!lead) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={lead.name} description="Review this lead and add landlord follow-up notes. Status changes and application conversion remain admin-only." actionHref="/landlord/leads" actionLabel="Back to leads" />
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
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700"><p className="text-xs font-bold uppercase text-slate-500">Original message</p><p className="mt-2 leading-7">{lead.message ?? "No message provided."}</p></div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Follow-up notes</h2>
            <form action={addLandlordLeadNote} className="mt-5 space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Add landlord note">
                <textarea name="note" className={textareaClass} placeholder="Example: I can show this unit Thursday afternoon." required />
              </Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Note</button>
            </form>
            <div className="mt-6 space-y-3">
              {lead.notes.length === 0 ? <p className="text-slate-600">No notes have been added yet.</p> : lead.notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="leading-7 text-slate-700">{note.note}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p></article>
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
          {lead.application ? <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6 shadow-sm"><h2 className="text-xl font-black text-slate-950">Application started</h2><p className="mt-2 text-slate-700">An admin has converted this lead into an application.</p><Link href={`/landlord/applications/${lead.application.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Application</Link></div> : null}
        </aside>
      </section>
    </main>
  );
}
