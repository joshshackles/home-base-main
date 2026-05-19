export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { getUserRelationshipContactsList } from "@/lib/profile-connections";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function VendorContactsPage() {
  const user = await requireUser("/vendor/contacts");
  await assertVendorPortalAccess(user);
  const contacts = await getUserRelationshipContactsList(user.userId);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-brand-700">Relationship engine</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Work contacts</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">People connected to your vendor work: owners, property managers, tenants, maintenance coordinators, case workers, housing coordinators, and emergency contacts.</p>
      </section>
      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {contacts.length > 0 ? <div className="divide-y divide-slate-100">
          {contacts.map((contact) => (
            <article key={`${contact.userId}-${contact.assignedRole}-${contact.unitId}-${contact.direction}`} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_0.8fr] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-950">{contact.name}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-700">{label(String(contact.assignedRole))}</span></div>
                <a href={`mailto:${contact.email}`} className="mt-1 block text-sm font-bold text-brand-700">{contact.email}</a>
                <p className="mt-2 text-sm font-semibold text-slate-600">{contact.relationshipContext}</p>
              </div>
              <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Scope</p><p className="mt-1 text-sm font-bold text-slate-800">{contact.scopedUnit}</p><p className="mt-1 text-xs font-semibold text-slate-500">{contact.sources.map(label).join(" · ")}</p></div>
            </article>
          ))}
        </div> : <div className="px-4 py-10 text-center"><p className="font-black text-slate-950">No work contacts yet.</p><p className="mt-2 text-sm font-semibold text-slate-600">Contacts appear here when you are assigned to jobs, units, or vendor relationships.</p></div>}
      </section>
    </main>
  );
}
