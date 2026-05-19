export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserRelationshipContactsList } from "@/lib/profile-connections";

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function tone(value: string) {
  if (value === "incoming") return "bg-brand-50 text-brand-800 ring-brand-100";
  if (value === "outgoing") return "bg-violet-50 text-violet-800 ring-violet-100";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

export default async function ApplicantContactsPage() {
  const user = await requireUser("/applicant/contacts");
  const contacts = await getUserRelationshipContactsList(user.userId);
  const primaryContacts = contacts.filter((contact) => ["LANDLORD", "PROPERTY_MANAGER", "HOUSING_COORDINATOR", "CASEWORKER", "MAINTENANCE_STAFF", "MAINTENANCE_WORKER", "EMERGENCY_CONTACT"].includes(String(contact.assignedRole)));

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-brand-700">Relationship engine</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">My contacts</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          People connected to your housing journey: landlord, property manager, housing coordinator, case worker, maintenance contacts, vendors, emergency contacts, and active workflow contacts.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total contacts</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{contacts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Primary contacts</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{primaryContacts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Workflow sources</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{new Set(contacts.flatMap((contact) => contact.sources)).size}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-lg font-black text-slate-950">Connected people</h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">Use these contacts when you need help with rent, documents, inspections, maintenance, case support, move-in, move-out, or emergency questions.</p>
        </div>
        {contacts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {contacts.map((contact) => (
              <article key={`${contact.userId}-${contact.assignedRole}-${contact.unitId}-${contact.direction}`} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_0.8fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{contact.name}</h3>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ring-1 ${tone(contact.direction)}`}>{label(contact.direction)}</span>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">{label(String(contact.assignedRole))}</span>
                  </div>
                  <a href={`mailto:${contact.email}`} className="mt-1 block text-sm font-bold text-brand-700 hover:text-brand-900">{contact.email}</a>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{contact.relationshipContext}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Scope</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{contact.scopedUnit}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{contact.sources.map(label).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link href="/applicant/inbox" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Message</Link>
                  {String(contact.assignedRole).includes("MAINTENANCE") ? <Link href="/applicant/maintenance" className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700">Maintenance</Link> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="font-black text-slate-950">No connected people yet.</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Contacts appear here after you apply, sign a lease, become a tenant, get assigned to a rental, or are connected by a landlord.</p>
            <Link href="/marketplace" className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700">Browse rentals</Link>
          </div>
        )}
      </section>
    </main>
  );
}
