import Link from "next/link";
import { notFound } from "next/navigation";
import { addLandlordApplicationNote } from "@/app/landlord/actions";
import { Field, textareaClass } from "@/components/admin/FormFields";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const application = await prisma.application.findFirst({
    where: { id: params.id, unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: { unit: { include: { property: true } }, lead: true, notes: { orderBy: { createdAt: "desc" } } }
  });

  if (!application) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={application.applicantName} description="View this application and add landlord notes. Application status decisions remain admin-only." actionHref="/landlord/applications" actionLabel="Back to applications" />
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-slate-500">Email</p><p className="mt-1 font-semibold text-slate-900">{application.applicantEmail}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Phone</p><p className="mt-1 font-semibold text-slate-900">{application.applicantPhone ?? "Not provided"}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Status</p><p className="mt-1 font-semibold text-slate-900">{label(application.status)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Started</p><p className="mt-1 font-semibold text-slate-900">{application.createdAt.toLocaleString()}</p></div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700"><p className="text-xs font-bold uppercase text-slate-500">Summary</p><p className="mt-2 leading-7">{application.summary ?? "No summary provided."}</p></div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application notes</h2>
            <form action={addLandlordApplicationNote} className="mt-5 space-y-4">
              <input type="hidden" name="applicationId" value={application.id} />
              <Field label="Add landlord note">
                <textarea name="note" className={textareaClass} placeholder="Example: Unit is still available for this applicant." required />
              </Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Note</button>
            </form>
            <div className="mt-6 space-y-3">
              {application.notes.length === 0 ? <p className="text-slate-600">No notes have been added yet.</p> : application.notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="leading-7 text-slate-700">{note.note}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p></article>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Requested unit</h2>
            <p className="mt-3 text-lg font-bold text-slate-950">{application.unit.property.name} #{application.unit.unitNumber}</p>
            <p className="text-slate-600">{application.unit.property.city}, {application.unit.property.state}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(application.unit.rentAmount)}</p>
            <Link href={`/marketplace/${application.unit.id}`} className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">View listing</Link>
          </div>
          {application.lead ? <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6 shadow-sm"><h2 className="text-xl font-black text-slate-950">Original lead</h2><p className="mt-2 text-slate-700">This application started from a marketplace inquiry.</p><Link href={`/landlord/leads/${application.lead.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Lead</Link></div> : null}
        </aside>
      </section>
    </main>
  );
}
