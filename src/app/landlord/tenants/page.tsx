export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Inbox,
  Lock,
  MessageSquare,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users
} from "lucide-react";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { EmptyState, WorkflowStatusBadge } from "@/components/ui/system";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DirectoryEntry = {
  key: string;
  primaryHref: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: "current_tenant" | "past_tenant" | "applicant" | "lead";
  applicationStatus: string | null;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  city: string;
  marketingStatus: string;
  rentAmount: number;
  authorized: boolean;
  profilePercent: number | null;
  moveInDate: Date | null;
  applicationDate: Date | null;
  lastActivity: Date;
  messageThreadId: string | null;
  unreadMessage: boolean;
  leadId: string | null;
  applicationId: string | null;
  occupancyId: string | null;
  summary: string;
};

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function includes(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

function profileCompleteness(profile: {
  legalName?: string | null;
  phone?: string | null;
  currentAddress?: string | null;
  rentalHistory?: string | null;
  employmentSummary?: string | null;
  applicantSignature?: string | null;
  householdMembers?: unknown[];
  incomeSources?: unknown[];
} | null | undefined) {
  if (!profile) return null;
  const items = [
    profile.legalName,
    profile.phone,
    profile.currentAddress,
    profile.rentalHistory,
    profile.employmentSummary,
    profile.applicantSignature,
    profile.householdMembers?.length ? "household" : null,
    profile.incomeSources?.length ? "income" : null
  ];
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

function relationshipTone(relationship: DirectoryEntry["relationship"]) {
  if (relationship === "current_tenant") return "bg-emerald-100 text-emerald-800";
  if (relationship === "past_tenant") return "bg-slate-100 text-slate-700";
  if (relationship === "applicant") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-900";
}

function authTone(authorized: boolean) {
  return authorized ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";
}

function sortEntries(entries: DirectoryEntry[], sort: string) {
  return [...entries].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "status") return (a.applicationStatus ?? a.relationship).localeCompare(b.applicationStatus ?? b.relationship);
    if (sort === "property") return a.propertyName.localeCompare(b.propertyName) || a.unitLabel.localeCompare(b.unitLabel);
    if (sort === "moveIn") return (b.moveInDate?.getTime() ?? 0) - (a.moveInDate?.getTime() ?? 0);
    if (sort === "newestApplication") return (b.applicationDate?.getTime() ?? 0) - (a.applicationDate?.getTime() ?? 0);
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });
}

export default async function LandlordTenantsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/tenants");
  const ownerScope = { ownerId: user.userId, isArchived: false };
  const q = firstParam(searchParams?.q).trim().toLowerCase();
  const relationship = firstParam(searchParams?.relationship);
  const status = firstParam(searchParams?.status);
  const propertyId = firstParam(searchParams?.propertyId);
  const unitId = firstParam(searchParams?.unitId);
  const listing = firstParam(searchParams?.listing);
  const auth = firstParam(searchParams?.auth);
  const sort = firstParam(searchParams?.sort) || "activity";
  const page = Math.max(1, Number.parseInt(firstParam(searchParams?.page) || "1", 10) || 1);
  const pageSize = 24;

  const [properties, units, applications, occupancies, leads] = await Promise.all([
    prisma.property.findMany({
      where: ownerScope,
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.unit.findMany({
      where: { property: ownerScope, NOT: { status: "ARCHIVED" } },
      select: { id: true, unitNumber: true, property: { select: { name: true } } },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
    }),
    prisma.application.findMany({
      where: { unit: { property: ownerScope } },
      include: {
        unit: { include: { property: true } },
        applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
        applicationDetail: true,
        messageThreads: {
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 500
    }),
    prisma.occupancy.findMany({
      where: { unit: { property: ownerScope } },
      include: {
        tenant: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
        unit: { include: { property: true } },
        application: { include: { applicationDetail: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 500
    }),
    prisma.lead.findMany({
      where: { unit: { property: ownerScope } },
      include: { unit: { include: { property: true } }, application: true },
      orderBy: { updatedAt: "desc" },
      take: 500
    })
  ]);

  const entries = new Map<string, DirectoryEntry>();

  for (const application of applications) {
    const profile = application.applicantUser?.applicantProfile;
    const thread = application.messageThreads[0];
    const lastMessage = thread?.messages[0];
    const authorized = Boolean(application.applicationDetail?.signedAt || application.applicantUserId);
    const key = application.applicantUserId ? `user:${application.applicantUserId}` : `email:${application.applicantEmail.toLowerCase()}`;
    entries.set(`${key}:application:${application.id}`, {
      key: `${key}:application:${application.id}`,
      primaryHref: `application-${application.id}`,
      name: application.applicantName,
      email: application.applicantEmail,
      phone: application.applicantPhone ?? profile?.phone ?? null,
      relationship: "applicant",
      applicationStatus: application.status,
      propertyId: application.unit.property.id,
      propertyName: application.unit.property.name,
      unitId: application.unit.id,
      unitLabel: `${application.unit.property.name} #${application.unit.unitNumber}`,
      city: application.unit.property.city,
      marketingStatus: application.unit.marketingStatus,
      rentAmount: application.unit.rentAmount,
      authorized,
      profilePercent: authorized ? profileCompleteness(profile) : null,
      moveInDate: application.applicationDetail?.requestedMoveInDate ?? profile?.desiredMoveInDate ?? null,
      applicationDate: application.createdAt,
      lastActivity: thread?.lastMessageAt ?? application.updatedAt,
      messageThreadId: thread?.id ?? null,
      unreadMessage: Boolean(lastMessage && lastMessage.senderId !== user.userId && !lastMessage.readByStaffAt),
      leadId: application.leadId,
      applicationId: application.id,
      occupancyId: null,
      summary: application.summary || "Application connected to one of your listings."
    });
  }

  for (const occupancy of occupancies) {
    const profile = occupancy.tenant.applicantProfile;
    const current = !["FORMER", "CANCELLED"].includes(occupancy.status);
    entries.set(`occupancy:${occupancy.id}`, {
      key: `occupancy:${occupancy.id}`,
      primaryHref: `occupancy-${occupancy.id}`,
      name: occupancy.tenant.name ?? occupancy.tenant.email,
      email: occupancy.tenant.email,
      phone: profile?.phone ?? occupancy.application?.applicantPhone ?? null,
      relationship: current ? "current_tenant" : "past_tenant",
      applicationStatus: occupancy.application?.status ?? null,
      propertyId: occupancy.unit.property.id,
      propertyName: occupancy.unit.property.name,
      unitId: occupancy.unit.id,
      unitLabel: `${occupancy.unit.property.name} #${occupancy.unit.unitNumber}`,
      city: occupancy.unit.property.city,
      marketingStatus: occupancy.unit.marketingStatus,
      rentAmount: occupancy.unit.rentAmount,
      authorized: true,
      profilePercent: profileCompleteness(profile),
      moveInDate: occupancy.moveInDate,
      applicationDate: occupancy.application?.createdAt ?? null,
      lastActivity: occupancy.updatedAt,
      messageThreadId: null,
      unreadMessage: false,
      leadId: occupancy.application?.leadId ?? null,
      applicationId: occupancy.applicationId,
      occupancyId: occupancy.id,
      summary: occupancy.notes || "Tenant relationship connected to one of your units."
    });
  }

  for (const lead of leads) {
    if (lead.application) continue;
    entries.set(`lead:${lead.id}`, {
      key: `lead:${lead.id}`,
      primaryHref: `lead-${lead.id}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      relationship: "lead",
      applicationStatus: lead.status,
      propertyId: lead.unit.property.id,
      propertyName: lead.unit.property.name,
      unitId: lead.unit.id,
      unitLabel: `${lead.unit.property.name} #${lead.unit.unitNumber}`,
      city: lead.unit.property.city,
      marketingStatus: lead.unit.marketingStatus,
      rentAmount: lead.unit.rentAmount,
      authorized: false,
      profilePercent: null,
      moveInDate: null,
      applicationDate: lead.createdAt,
      lastActivity: lead.updatedAt,
      messageThreadId: null,
      unreadMessage: lead.status === "NEW",
      leadId: lead.id,
      applicationId: null,
      occupancyId: null,
      summary: lead.message || "Marketplace question or inquiry."
    });
  }

  let filtered = [...entries.values()];
  if (q) {
    filtered = filtered.filter((entry) =>
      includes(entry.name, q) ||
      includes(entry.email, q) ||
      includes(entry.phone, q) ||
      includes(entry.propertyName, q) ||
      includes(entry.unitLabel, q) ||
      includes(entry.city, q) ||
      includes(entry.summary, q)
    );
  }
  if (relationship) filtered = filtered.filter((entry) => entry.relationship === relationship);
  if (status) filtered = filtered.filter((entry) => entry.applicationStatus === status);
  if (propertyId) filtered = filtered.filter((entry) => entry.propertyId === propertyId);
  if (unitId) filtered = filtered.filter((entry) => entry.unitId === unitId);
  if (listing) filtered = filtered.filter((entry) => entry.marketingStatus === listing);
  if (auth === "authorized") filtered = filtered.filter((entry) => entry.authorized);
  if (auth === "pending") filtered = filtered.filter((entry) => !entry.authorized);

  const sorted = sortEntries(filtered, sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageEntries = sorted.slice((page - 1) * pageSize, page * pageSize);
  const paramsWithoutPage = new URLSearchParams();
  for (const [key, value] of Object.entries({ q, relationship, status, propertyId, unitId, listing, auth, sort })) {
    if (value) paramsWithoutPage.set(key, value);
  }
  const pageHref = (nextPage: number) => `/landlord/tenants?${paramsWithoutPage.toString()}${paramsWithoutPage.toString() ? "&" : ""}page=${nextPage}`;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <LandlordPageHeader title="Tenant Directory" description="Search applicants, leads, and tenants connected to your listings, messages, applications, and occupancy records." actionHref="/landlord/applications" actionLabel="Applications" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visible records" value={sorted.length} detail="Authorized landlord relationships" />
        <Metric label="Applicants" value={sorted.filter((entry) => entry.relationship === "applicant").length} detail="Applied to your listings" />
        <Metric label="Tenants" value={sorted.filter((entry) => entry.relationship === "current_tenant").length} detail="Current active renters" />
        <Metric label="Share authorized" value={sorted.filter((entry) => entry.authorized).length} detail="Profile packet available" />
      </section>

      <form action="/landlord/tenants" className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input name="q" defaultValue={q} className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Search by name, address, email, phone, property, or unit" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"><SlidersHorizontal size={16} /> Search</button>
            <Link href="/landlord/tenants" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">Clear filters</Link>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterSelect name="relationship" label="Relationship" value={relationship} options={[["", "All"], ["applicant", "Applicants"], ["lead", "Leads"], ["current_tenant", "Current tenants"], ["past_tenant", "Past tenants"]]} />
          <FilterSelect name="status" label="Status" value={status} options={[["", "All"], ["NEW", "New"], ["CONTACTED", "Contacted"], ["APPLICATION_STARTED", "Application started"], ["CLOSED", "Closed"], ["STARTED", "Started"], ["SUBMITTED", "Submitted"], ["UNDER_REVIEW", "Under review"], ["APPROVED", "Approved"], ["DENIED", "Denied"], ["WITHDRAWN", "Withdrawn"], ["PENDING_MOVE_IN", "Pending move-in"], ["ACTIVE", "Active"], ["RENEWAL_PENDING", "Renewal pending"], ["NOTICE_GIVEN", "Notice given"], ["MOVE_OUT_SCHEDULED", "Move-out scheduled"], ["FORMER", "Former"], ["CANCELLED", "Cancelled"]]} />
          <FilterSelect name="propertyId" label="Property" value={propertyId} options={[["", "All properties"], ...properties.map((property) => [property.id, property.name] as [string, string])]} />
          <FilterSelect name="unitId" label="Unit" value={unitId} options={[["", "All units"], ...units.map((unit) => [unit.id, `${unit.property.name} #${unit.unitNumber}`] as [string, string])]} />
          <FilterSelect name="listing" label="Listing" value={listing} options={[["", "All listings"], ["ACTIVE", "Public"], ["DRAFT", "Draft"], ["PAUSED", "Paused"]]} />
          <FilterSelect name="auth" label="Share" value={auth} options={[["", "All"], ["authorized", "Authorized"], ["pending", "Pending"]]} />
        </div>
        <div className="mt-3 max-w-xs">
          <FilterSelect name="sort" label="Sort" value={sort} options={[["activity", "Newest activity"], ["newestApplication", "Newest application"], ["name", "Name"], ["status", "Status"], ["property", "Property"], ["moveIn", "Move-in date"]]} />
        </div>
      </form>

      <section className="mt-6 grid gap-4">
        {pageEntries.length === 0 ? (
          <EmptyState
            icon={<Users size={26} />}
            title={entries.size === 0 ? "No authorized tenant records yet" : "No tenant records match your filters"}
            detail={entries.size === 0
              ? "Applicants, leads, and tenants appear here after they apply, message you, authorize profile sharing, or move into one of your units."
              : "Try clearing filters or searching by applicant name, email, property, city, or unit."}
            action={entries.size === 0 ? <Link href="/landlord/rentals" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Review Listings</Link> : <Link href="/landlord/tenants" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Clear Filters</Link>}
          />
        ) : pageEntries.map((entry) => (
          <article key={entry.key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-xl font-black text-slate-950 sm:text-2xl">{entry.name}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${relationshipTone(entry.relationship)}`}>{label(entry.relationship)}</span>
                  {entry.applicationStatus ? <WorkflowStatusBadge status={entry.applicationStatus} /> : null}
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ${authTone(entry.authorized)}`}>{entry.authorized ? <ShieldCheck size={13} /> : <Lock size={13} />}{entry.authorized ? "Share authorized" : "Share pending"}</span>
                  {entry.unreadMessage ? <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase text-white">Unread message</span> : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">{entry.unitLabel} - {entry.city} - {formatCurrency(entry.rentAmount)} / month</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Signal label="Status" value={entry.applicationStatus ? label(entry.applicationStatus) : label(entry.relationship)} />
                  <Signal label="Profile" value={entry.profilePercent !== null ? `${entry.profilePercent}%` : "Locked"} />
                  <Signal label="Move-in" value={entry.moveInDate ? entry.moveInDate.toLocaleDateString() : "Not set"} />
                  <Signal label="Activity" value={entry.lastActivity.toLocaleDateString()} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{entry.summary}</p>
              </div>
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">Contact</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{entry.email ?? "Email locked"}</p>
                <p className="mt-1 text-sm text-slate-600">{entry.phone ?? "Phone not provided"}</p>
                <div className="mt-4 grid gap-2">
                  <Link href={`/landlord/tenants/${entry.primaryHref}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">View profile <ArrowRight size={15} /></Link>
                  {entry.applicationId ? <Link href={`/landlord/applications/${entry.applicationId}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><FileText size={15} /> View Application</Link> : null}
                  {entry.messageThreadId ? <Link href={`/landlord/inbox?thread=thread_${entry.messageThreadId}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><MessageSquare size={15} /> Open Message</Link> : null}
                  {entry.leadId ? <Link href={`/landlord/inbox?thread=lead_${entry.leadId}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><Inbox size={15} /> Reply in Inbox</Link> : null}
                </div>
              </aside>
            </div>
          </article>
        ))}
      </section>

      {pageCount > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold">
          <span className="text-slate-600">Page {page} of {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-900 hover:bg-slate-50">Previous</Link> : null}
            {page < pageCount ? <Link href={pageHref(page + 1)} className="rounded-xl bg-slate-950 px-4 py-2 text-white hover:bg-slate-800">Next</Link> : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Array<[string, string]> }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
      {label}
      <select name={name} defaultValue={value} className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm font-semibold normal-case text-slate-900">
        {options.map(([optionValue, optionLabel]) => <option key={`${name}-${optionValue || "all"}`} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p></div>;
}
