import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { revokeLandlordProfileConnection } from "@/app/landlord/actions";
import { requireRole } from "@/lib/auth";
import { filterLandlordContacts, getContactGovernanceSummary, getLandlordContactsList } from "@/lib/profile-connections";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourceLabel(value: string) {
  if (value === "explicit") return "Profile connection";
  if (value === "maintenance") return "Live maintenance";
  if (value === "tenant") return "Current tenant";
  return "Application workflow";
}

function sourceTone(value: string) {
  if (value === "explicit") return "bg-brand-50 text-brand-800 ring-brand-100";
  if (value === "maintenance") return "bg-amber-50 text-amber-900 ring-amber-100";
  if (value === "tenant") return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  return "bg-sky-50 text-sky-900 ring-sky-100";
}

function formatDate(value: Date | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

type ContactsSearchParams = {
  q?: string | string[];
  source?: string | string[];
  role?: string | string[];
  status?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LandlordContactsPage({ searchParams }: { searchParams?: ContactsSearchParams }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const contacts = await getLandlordContactsList(user.userId);
  const summary = getContactGovernanceSummary(contacts);
  const activeQuery = (firstParam(searchParams?.q) ?? "").trim().toLowerCase();
  const activeSource = firstParam(searchParams?.source) ?? "all";
  const activeRole = firstParam(searchParams?.role) ?? "all";
  const statusMessage = firstParam(searchParams?.status);

  const sourceOptions = Array.from(new Set(contacts.map((contact) => contact.source))).sort();
  const roleOptions = Array.from(new Set(contacts.map((contact) => String(contact.assignedRole)))).sort();
  const filteredContacts = filterLandlordContacts(contacts, { query: activeQuery, source: activeSource, role: activeRole });
  const exportParams = new URLSearchParams();
  if (activeQuery) exportParams.set("q", activeQuery);
  if (activeSource !== "all") exportParams.set("source", activeSource);
  if (activeRole !== "all") exportParams.set("role", activeRole);
  const exportHref = `/landlord/contacts/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader
        title="Contacts"
        description="A unified view of explicit team connections plus tenants, applicants, and service partners tied to live workflows."
      />

      {statusMessage === "revoked" ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          Profile connection revoked. Any unit-scoped access granted by that connection is no longer active.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Total contacts</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Explicit connections</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{summary.explicitCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Workflow contacts</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{summary.workflowCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Unit scoped</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{summary.unitScopedCount}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{summary.portfolioCount} portfolio-wide</p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]" action="/landlord/contacts">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Search contacts</span>
            <input
              name="q"
              defaultValue={firstParam(searchParams?.q) ?? ""}
              placeholder="Name, email, unit, role, notes..."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Source</span>
            <select name="source" defaultValue={activeSource} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4">
              <option value="all">All sources</option>
              {sourceOptions.map((source) => <option key={source} value={source}>{sourceLabel(source)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Assignment</span>
            <select name="role" defaultValue={activeRole} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4">
              <option value="all">All assignments</option>
              {roleOptions.map((role) => <option key={role} value={role}>{label(role)}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm transition hover:bg-slate-800" type="submit">Filter</button>
            <Link href="/landlord/contacts" className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50">Reset</Link>
          </div>
        </form>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Governance checks</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
            <p className="flex items-center justify-between gap-3"><span>People with multiple scopes</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900">{summary.duplicatePeopleCount}</span></p>
            <p className="flex items-center justify-between gap-3"><span>Explicit links older than 180 days</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900">{summary.staleExplicitCount}</span></p>
            <p className="flex items-center justify-between gap-3"><span>Profiles missing display names</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900">{summary.missingNameCount}</span></p>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Review stale explicit connections regularly. Workflow contacts should be changed from their source records so access stays auditable.</p>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Connected People</h2>
            <p className="mt-1 text-sm text-slate-600">Showing {filteredContacts.length} of {contacts.length}. Explicit connections can be revoked here; workflow contacts are controlled by their source record.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={exportHref} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">Export CSV</Link>
            <Link href="/landlord/units" className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-brand-700">Manage unit assignments</Link>
          </div>
        </div>
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredContacts.map((contact) => (
              <div key={`${contact.userId}-${contact.assignedRole}-${contact.scopedUnit}`} className="grid gap-4 px-6 py-5 xl:grid-cols-[1.1fr_0.9fr_1fr_0.8fr_auto] xl:items-center">
                <div>
                  <p className="text-lg font-black text-slate-950">{contact.name}</p>
                  <a className="text-sm font-semibold text-brand-700 hover:text-brand-900" href={`mailto:${contact.email}`}>{contact.email}</a>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">System role: {label(contact.systemRole)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Assignment</p>
                  <p className="mt-1 font-bold text-slate-900">{label(contact.assignedRole)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Scope</p>
                  <p className="mt-1 font-bold text-slate-900">{contact.scopedUnit}</p>
                  {contact.unitId ? <Link href={`/landlord/units/${contact.unitId}`} className="mt-1 inline-block text-xs font-black text-brand-700 hover:text-brand-900">Open unit</Link> : null}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Last updated</p>
                  <p className="mt-1 font-bold text-slate-900">{formatDate(contact.updatedAt)}</p>
                  {contact.notes ? <p className="mt-1 max-w-xs text-sm text-slate-600">{contact.notes}</p> : null}
                </div>
                <div className="flex flex-col items-start gap-2 xl:items-end">
                  <div className="flex flex-wrap justify-start gap-1 xl:justify-end">
                    {contact.sources.map((source) => (
                      <p key={source} className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${sourceTone(source)}`}>{sourceLabel(source)}</p>
                    ))}
                  </div>
                  {contact.connectionId ? (
                    <form action={revokeLandlordProfileConnection}>
                      <input type="hidden" name="connectionId" value={contact.connectionId} />
                      <button className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50" type="submit">
                        Revoke access
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Managed by workflow</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-lg font-black text-slate-950">No contacts match those filters.</p>
            <p className="mt-2 text-slate-600">Reset the filters or assign staff on a unit, create maintenance work, or receive applications to populate this screen.</p>
          </div>
        )}
      </section>
    </main>
  );
}
