import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { revokeLandlordProfileConnection } from "@/app/landlord/actions";
import { requireRole } from "@/lib/auth";
import {
  filterLandlordContacts,
  getContactGovernanceSummary,
  getLandlordContactsList,
  landlordContactSourceLabels,
  sortLandlordContacts,
  type ContactReviewStatus,
  type ContactRiskLevel,
  type ContactSortMode,
} from "@/lib/profile-connections";

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourceLabel(value: string) {
  return (
    landlordContactSourceLabels[
      value as keyof typeof landlordContactSourceLabels
    ] ?? "Workflow contact"
  );
}

function sourceTone(value: string) {
  if (value === "explicit") return "bg-brand-50 text-brand-800 ring-brand-100";
  if (value === "maintenance")
    return "bg-amber-50 text-amber-900 ring-amber-100";
  if (value === "tenant")
    return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  return "bg-sky-50 text-sky-900 ring-sky-100";
}

function reviewLabel(value: ContactReviewStatus) {
  if (value === "needs_review") return "Needs review";
  if (value === "missing_profile") return "Missing profile";
  if (value === "multi_scope") return "Multi-scope";
  return "Current";
}

function reviewTone(value: ContactReviewStatus) {
  if (value === "needs_review")
    return "bg-amber-50 text-amber-900 ring-amber-100";
  if (value === "missing_profile")
    return "bg-rose-50 text-rose-800 ring-rose-100";
  if (value === "multi_scope")
    return "bg-violet-50 text-violet-800 ring-violet-100";
  return "bg-emerald-50 text-emerald-900 ring-emerald-100";
}

function riskTone(value: ContactRiskLevel) {
  if (value === "high") return "bg-rose-50 text-rose-800 ring-rose-100";
  if (value === "medium") return "bg-amber-50 text-amber-900 ring-amber-100";
  return "bg-emerald-50 text-emerald-900 ring-emerald-100";
}

function formatDate(value: Date | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

type ContactsSearchParams = {
  q?: string | string[];
  source?: string | string[];
  role?: string | string[];
  review?: string | string[];
  sort?: string | string[];
  status?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statCard(labelText: string, value: number, helper?: string) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

export default async function LandlordContactsPage({
  searchParams,
}: {
  searchParams?: ContactsSearchParams;
}) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const contacts = await getLandlordContactsList(user.userId);
  const summary = getContactGovernanceSummary(contacts);
  const activeQuery = (firstParam(searchParams?.q) ?? "").trim().toLowerCase();
  const activeSource = firstParam(searchParams?.source) ?? "all";
  const activeRole = firstParam(searchParams?.role) ?? "all";
  const activeReview = firstParam(searchParams?.review) ?? "all";
  const activeSort = (firstParam(searchParams?.sort) ??
    "review") as ContactSortMode;
  const statusMessage = firstParam(searchParams?.status);

  const sourceOptions = Array.from(
    new Set(contacts.flatMap((contact) => contact.sources)),
  ).sort();
  const roleOptions = Array.from(
    new Set(contacts.map((contact) => String(contact.assignedRole))),
  ).sort();
  const filteredContacts = sortLandlordContacts(
    filterLandlordContacts(contacts, {
      query: activeQuery,
      source: activeSource,
      role: activeRole,
      review: activeReview,
    }),
    activeSort,
  );
  const exportParams = new URLSearchParams();
  if (activeQuery) exportParams.set("q", activeQuery);
  if (activeSource !== "all") exportParams.set("source", activeSource);
  if (activeRole !== "all") exportParams.set("role", activeRole);
  if (activeReview !== "all") exportParams.set("review", activeReview);
  if (activeSort !== "name") exportParams.set("sort", activeSort);
  const exportHref = `/landlord/contacts/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;
  const priorityContacts = sortLandlordContacts(contacts, "footprint")
    .filter(
      (contact) =>
        contact.reviewStatus !== "current" ||
        contact.governanceFlags.length > 0,
    )
    .slice(0, 4);

  return (
    <main
      id="main-content"
      className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"
    >
      <LandlordPageHeader
        title="Contacts"
        description="A compact governance dashboard for team connections, tenants, applicants, and service partners tied to active workflows."
      />

      {statusMessage === "revoked" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
          Profile connection revoked. Unit-scoped access granted by that
          connection is no longer active.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statCard("Total", summary.total)}
        {statCard("Explicit", summary.explicitCount)}
        {statCard("Workflow", summary.workflowCount)}
        {statCard(
          "Needs review",
          summary.needsReviewCount,
          `${summary.staleExplicitCount} stale explicit`,
        )}
        {statCard(
          "High risk",
          summary.highRiskCount,
          `${summary.lowConfidenceCount} low confidence`,
        )}
        {statCard(
          "Portfolio",
          summary.portfolioExplicitCount,
          `${summary.privilegedAccessCount} privileged`,
        )}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.55fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]"
            action="/landlord/contacts"
          >
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                name="q"
                defaultValue={firstParam(searchParams?.q) ?? ""}
                placeholder="Name, email, unit, role..."
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Source
              </span>
              <select
                name="source"
                defaultValue={activeSource}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
              >
                <option value="all">All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {sourceLabel(source)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Assignment
              </span>
              <select
                name="role"
                defaultValue={activeRole}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
              >
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {label(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Review
              </span>
              <select
                name="review"
                defaultValue={activeReview}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
              >
                <option value="all">All</option>
                <option value="attention">Needs attention</option>
                <option value="needs_review">Stale explicit</option>
                <option value="missing_profile">Missing profile</option>
                <option value="multi_scope">Multi-scope</option>
                <option value="high_risk">High risk</option>
                <option value="low_confidence">Low confidence</option>
                <option value="current">Current</option>
                <option value="portfolio_explicit">
                  Portfolio-wide explicit
                </option>
                <option value="operational_access">Operational access</option>
                <option value="revocable">Revocable</option>
                <option value="workflow_only">Workflow only</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Sort
              </span>
              <select
                name="sort"
                defaultValue={activeSort}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-brand-500/20 transition focus:border-brand-500 focus:ring-4"
              >
                <option value="review">Review priority</option>
                <option value="risk">Risk / confidence</option>
                <option value="updated">Recently updated</option>
                <option value="name">Name</option>
                <option value="role">Assignment</option>
                <option value="scope">Scope</option>
                <option value="footprint">Permission footprint</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                type="submit"
              >
                Filter
              </button>
              <Link
                href="/landlord/contacts"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Governance checks
          </p>
          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700">
            <p className="flex items-center justify-between gap-3">
              <span>People with multiple scopes</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.duplicatePeopleCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Explicit links older than 180 days</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.staleExplicitCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Profiles missing display names</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.missingNameCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>High-risk contacts</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.highRiskCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Portfolio-wide explicit links</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.portfolioExplicitCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Revocable relationships</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-900">
                {summary.revocableCount}
              </span>
            </p>
          </div>
        </div>
      </section>

      {priorityContacts.length > 0 ? (
        <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Priority contact review
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                Resolve access risk before it becomes operational drift
              </h2>
            </div>
            <Link
              href="/landlord/contacts?review=attention&sort=footprint"
              className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              Open attention queue
            </Link>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-4">
            {priorityContacts.map((contact) => (
              <div
                key={`priority-${contact.userId}-${contact.assignedRole}-${contact.scopedUnit}`}
                className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm"
              >
                <p className="truncate text-sm font-black text-slate-950">
                  {contact.name}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-600">
                  {contact.permissionFootprint}
                </p>
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  {contact.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Connected People
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">
              Showing {filteredContacts.length} of {contacts.length}. Explicit
              links can be revoked; workflow contacts are managed from the
              source record.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={exportHref}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Export CSV
            </Link>
            <Link
              href="/landlord/units"
              className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-brand-700"
            >
              Manage assignments
            </Link>
          </div>
        </div>
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredContacts.map((contact) => (
              <div
                key={`${contact.userId}-${contact.assignedRole}-${contact.scopedUnit}`}
                className="grid gap-3 px-4 py-3 xl:grid-cols-[1.05fr_0.75fr_1fr_0.75fr_auto] xl:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{contact.name}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ring-1 ${reviewTone(contact.reviewStatus)}`}
                    >
                      {reviewLabel(contact.reviewStatus)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ring-1 ${riskTone(contact.riskLevel)}`}
                    >
                      {label(contact.riskLevel)} risk
                    </span>
                  </div>
                  <a
                    className="text-sm font-semibold text-brand-700 hover:text-brand-900"
                    href={`mailto:${contact.email}`}
                  >
                    {contact.email}
                  </a>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    System: {label(contact.systemRole)} · Confidence{" "}
                    {contact.confidenceScore}% · {label(contact.scopeType)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {contact.attentionReason}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    {contact.permissionFootprint}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Assignment
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {label(String(contact.assignedRole))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Scope
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {contact.scopedUnit}
                  </p>
                  {contact.unitId ? (
                    <Link
                      href={`/landlord/units/${contact.unitId}`}
                      className="mt-0.5 inline-block text-xs font-black text-brand-700 hover:text-brand-900"
                    >
                      Open unit
                    </Link>
                  ) : null}
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Updated
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {formatDate(contact.updatedAt)}
                  </p>
                  <p
                    className="mt-0.5 max-w-xs truncate text-xs text-slate-600"
                    title={contact.recommendedAction}
                  >
                    {contact.recommendedAction}
                  </p>
                  {contact.governanceFlags.length > 0 ? (
                    <p
                      className="mt-0.5 max-w-xs truncate text-xs font-semibold text-amber-700"
                      title={contact.governanceFlags.join(" · ")}
                    >
                      {contact.governanceFlags.join(" · ")}
                    </p>
                  ) : null}
                  {contact.notes ? (
                    <p
                      className="mt-0.5 max-w-xs truncate text-xs text-slate-500"
                      title={contact.notes}
                    >
                      {contact.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2 xl:items-end">
                  <div className="flex flex-wrap justify-start gap-1 xl:justify-end">
                    {contact.sources.map((source) => (
                      <p
                        key={source}
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ring-1 ${sourceTone(source)}`}
                      >
                        {sourceLabel(source)}
                      </p>
                    ))}
                  </div>
                  {contact.connectionId ? (
                    <form action={revokeLandlordProfileConnection}>
                      <input
                        type="hidden"
                        name="connectionId"
                        value={contact.connectionId}
                      />
                      <button
                        className="rounded-xl border border-rose-200 px-2.5 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-50"
                        type="submit"
                      >
                        Revoke
                      </button>
                    </form>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">
                      Workflow managed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-lg font-black text-slate-950">
              No contacts match those filters.
            </p>
            <p className="mt-2 text-slate-600">
              Reset filters or assign staff on a unit, create maintenance work,
              or receive applications.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
