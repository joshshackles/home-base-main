export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, ClipboardList, Home, Inbox, MessageSquare, Search, UserRoundCheck } from "lucide-react";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { LandlordLeadRecord, getLandlordLeadPipelineModel, leadPipelineStageFor, platformContext } from "@/lib/platform";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

export default async function LandlordLeadsPage({ searchParams }: { searchParams?: { q?: string; stage?: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const { query, activeStage, leads, filteredLeads, stageCounts, stages, metrics } = await getLandlordLeadPipelineModel(platformContext(user), searchParams ?? {});
  // Platform lead pipeline service preserves legacy lead scope marker: ownerId: user.userId, isArchived: false.

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">
      <LandlordPageHeader title="Leasing Pipeline" description="Track public inquiries from first message through application review, approval, lease handoff, and closeout." actionHref="/landlord/inbox" actionLabel="Open Inbox" />

      <section className="mb-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric href="/landlord/leads" icon={<Inbox size={18} />} label="Total leads" value={metrics.totalLeads} detail={`${metrics.activeLeads} active prospects`} />
          <Metric href="/landlord/leads?stage=new" icon={<MessageSquare size={18} />} label="New inquiries" value={stageCounts.new ?? 0} detail="Needs first response" warn={(stageCounts.new ?? 0) > 0} />
          <Metric href="/landlord/applications" icon={<ClipboardList size={18} />} label="Applications" value={metrics.applications} detail={`${metrics.conversionRate}% lead-to-application rate`} />
          <Metric href="/landlord/inventory?view=vacant" icon={<Home size={18} />} label="Unit context" value={metrics.unitCount} detail="Units with pipeline activity" />
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]" action="/landlord/leads">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Search pipeline
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                <input name="q" defaultValue={query} className="w-full rounded-2xl border border-slate-300 py-3 pl-10 pr-4 text-sm font-semibold normal-case text-slate-900" placeholder="Name, email, phone, message, unit, property..." />
              </span>
            </label>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 md:self-end">Search</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <StageFilter href="/landlord/leads" active={!activeStage} label="All" count={leads.length} />
            {stages.map((stage) => <StageFilter key={stage.key} href={`/landlord/leads?stage=${stage.key}`} active={activeStage === stage.key} label={stage.title} count={stageCounts[stage.key] ?? 0} />)}
          </div>
        </div>
      </section>

      <section className="hidden gap-4 xl:grid xl:grid-cols-6">
        {stages.map((stage) => {
          const stageLeads = filteredLeads.filter((lead) => leadPipelineStageFor(lead) === stage.key);
          return (
            <section key={stage.key} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-black text-slate-950">{stage.title}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-600 shadow-sm">{stageLeads.length}</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{stage.detail}</p>
              </div>
              <div className="grid gap-3">
                {stageLeads.length > 0 ? stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} compact />) : <EmptyStage />}
              </div>
            </section>
          );
        })}
      </section>

      <section className="mt-4 grid gap-3 xl:hidden">
        {filteredLeads.length > 0 ? filteredLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">No leads match this view</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Clear the filter or open the marketplace inbox to respond to new renter questions.</p>
            <Link href="/landlord/leads" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Clear filters</Link>
          </div>
        )}
      </section>

      {leads.length === 0 ? (
        <section className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <UserRoundCheck className="mx-auto text-blue-700" size={32} />
          <h2 className="mt-3 text-2xl font-black text-slate-950">No leasing leads yet</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Public marketplace inquiries will show here once renters ask questions, request contact, or begin an application for one of your active listings.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/landlord/inventory?view=unlisted" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50">Review listings</Link>
            <Link href="/landlord/inbox" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Open inbox</Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function LeadCard({ lead, compact = false }: { lead: LandlordLeadRecord; compact?: boolean }) {
  const stageKey = leadPipelineStageFor(lead);
  const stage = [
    { key: "new", title: "New inquiry" },
    { key: "contacted", title: "Contacted" },
    { key: "application_started", title: "Application started" },
    { key: "review", title: "Screening / review" },
    { key: "approved", title: "Approved" },
    { key: "closed", title: "Closed" }
  ].find((item) => item.key === stageKey);
  const latestConversation = lead.conversations[0];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-950">{lead.name}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{lead.email}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">{stage?.title ?? label(lead.status)}</span>
      </div>

      <p className="mt-3 text-sm font-bold text-slate-950">{lead.unit.property.name} #{lead.unit.unitNumber}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{lead.unit.property.city}, {lead.unit.property.state} • {formatCurrency(lead.unit.rentAmount)}</p>
      <p className={`${compact ? "line-clamp-3" : "line-clamp-2"} mt-3 text-sm leading-6 text-slate-600`}>{lead.message || "Marketplace inquiry with no message."}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
        <span className="rounded-xl bg-slate-50 px-3 py-2">Updated {dateLabel(lead.updatedAt)}</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">{lead.notes.length} notes</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">{lead.application ? label(lead.application.status) : "No application"}</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">{latestConversation ? label(latestConversation.status) : "No thread"}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/landlord/leads/${lead.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700">
          Open
          <ArrowRight size={14} />
        </Link>
        <Link href={`/landlord/inbox?thread=lead_${lead.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">
          Reply
        </Link>
        {lead.application ? <Link href={`/landlord/applications/${lead.application.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Application</Link> : null}
      </div>
    </article>
  );
}

function Metric({ href, icon, label, value, detail, warn = false }: { href: string; icon: React.ReactNode; label: string; value: string | number; detail: string; warn?: boolean }) {
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white ${warn ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</span>
        <ArrowRight size={16} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </Link>
  );
}

function StageFilter({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return <Link href={href} className={`rounded-full px-3 py-2 text-xs font-black ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label} <span className="opacity-75">{count}</span></Link>;
}

function EmptyStage() {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-xs font-semibold leading-5 text-slate-500">No prospects are currently in this stage.</div>;
}
