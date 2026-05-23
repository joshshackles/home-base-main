export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Clock3, Filter, Home, Inbox, Mail, MessageSquare, Phone, RotateCcw, Search, Send, UserRound, Wrench } from "lucide-react";
import { replyToLandlordLead } from "@/app/landlord/actions";
import { sendWorkflowMessage } from "@/app/workflow-actions";
import { requireRole } from "@/lib/auth";
import { markVisibleInboxThreadRead } from "@/lib/messaging";
import {
  buildUnifiedLandlordInbox,
  filterUnifiedInboxThreads,
  selectedUnifiedInboxThreadId,
  unifiedInboxSourceLabel,
  unifiedInboxStatusLabel,
  type UnifiedInboxThread
} from "@/lib/messaging/unified-landlord-inbox";

type SearchParams = Record<string, string | string[] | undefined>;

function param(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function inboxHref(searchParams: SearchParams | undefined, updates: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!value) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `/landlord/inbox?${query}` : "/landlord/inbox";
}

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function money(value?: number | null) {
  if (typeof value !== "number") return "Rent not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function sourceClasses(sourceType: UnifiedInboxThread["sourceType"]) {
  if (sourceType === "lead") return "border-amber-200 bg-amber-50 text-amber-800";
  if (sourceType === "application") return "border-blue-200 bg-blue-50 text-blue-800";
  if (sourceType === "maintenance") return "border-rose-200 bg-rose-50 text-rose-800";
  if (sourceType === "lease") return "border-violet-200 bg-violet-50 text-violet-800";
  if (sourceType === "tenant") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function priorityClasses(priority: UnifiedInboxThread["priority"]) {
  if (priority === "urgent") return "border-red-200 bg-red-600 text-white";
  if (priority === "high") return "border-blue-200 bg-blue-600 text-white";
  return "border-slate-200 bg-white text-slate-600";
}

function sourceIcon(sourceType: UnifiedInboxThread["sourceType"]) {
  if (sourceType === "lead") return <Inbox size={16} />;
  if (sourceType === "application") return <ClipboardList size={16} />;
  if (sourceType === "maintenance") return <Wrench size={16} />;
  if (sourceType === "tenant") return <UserRound size={16} />;
  return <MessageSquare size={16} />;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function EmptyState({ title, detail, actionHref, actionLabel }: { title: string; detail: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <MessageSquare size={20} />
      </div>
      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{detail}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">
          {actionLabel}
          <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function ThreadCard({ thread, selected, href }: { thread: UnifiedInboxThread; selected: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 transition hover:border-blue-200 hover:bg-white ${selected ? "border-blue-300 bg-blue-50 shadow-sm" : thread.needsReply ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${sourceClasses(thread.sourceType)}`}>
              {sourceIcon(thread.sourceType)}
              {unifiedInboxSourceLabel(thread.sourceType)}
            </span>
            {thread.unreadCount > 0 ? <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black uppercase text-white">{thread.unreadCount} unread</span> : null}
          </div>
          <h2 className="mt-3 truncate text-base font-black text-slate-950">{thread.participantName}</h2>
          <p className="mt-1 truncate text-sm font-bold text-slate-700">{thread.subject}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${priorityClasses(thread.priority)}`}>{thread.needsReply ? "Reply" : unifiedInboxStatusLabel(thread.status)}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{thread.lastMessagePreview}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><Home size={13} /> {thread.contextSummary}</span>
        <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {timeLabel(thread.lastMessageAt)}</span>
      </div>
    </Link>
  );
}

function ContextPanel({ thread }: { thread: UnifiedInboxThread }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Conversation context</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{thread.context.propertyName ?? "General conversation"} {thread.context.unitNumber ? `#${thread.context.unitNumber}` : ""}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{[thread.context.address, thread.context.city, thread.context.state].filter(Boolean).join(", ") || thread.contextSummary}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${sourceClasses(thread.sourceType)}`}>{unifiedInboxSourceLabel(thread.sourceType)}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info label="Status" value={unifiedInboxStatusLabel(thread.status)} />
        <Info label="Rent" value={money(thread.context.rentAmount)} />
        <Info label="Available" value={thread.context.availableOn ? thread.context.availableOn.toLocaleDateString() : "Not listed"} />
        <Info label="Priority" value={thread.priority === "urgent" ? "Urgent" : thread.priority === "high" ? "Needs attention" : "Normal"} />
      </div>
      {thread.context.applicationStatus || thread.context.maintenanceStatus || thread.context.leadStatus ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {thread.context.applicationStatus ? <Info label="Application" value={unifiedInboxStatusLabel(thread.context.applicationStatus)} /> : null}
          {thread.context.maintenanceStatus ? <Info label="Maintenance" value={unifiedInboxStatusLabel(thread.context.maintenanceStatus)} /> : null}
          {thread.context.leadStatus ? <Info label="Lead" value={unifiedInboxStatusLabel(thread.context.leadStatus)} /> : null}
        </div>
      ) : null}
      {thread.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {thread.actions.map((action) => (
            <Link key={`${thread.id}-${action.href}-${action.label}`} href={action.href} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">
              {action.label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function MessageBubble({ message }: { message: UnifiedInboxThread["messages"][number] }) {
  const own = message.direction === "outbound";
  const internal = message.direction === "internal";
  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <article className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm ${own ? "border-blue-600 bg-blue-600 text-white" : internal ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-900"}`}>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase opacity-80">
          <span>{message.senderName}</span>
          <span>{timeLabel(message.createdAt)}</span>
          {internal ? <span>Internal</span> : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </article>
    </div>
  );
}

function ReplyComposer({ thread }: { thread: UnifiedInboxThread }) {
  const returnTo = `/landlord/inbox?thread=${encodeURIComponent(thread.id)}`;
  if (!thread.canReply) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="font-black text-slate-950">This conversation is closed.</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Messages are preserved in the unified inbox. Reopen or continue from the linked record if more follow-up is needed.</p>
      </div>
    );
  }

  return (
    <form action={thread.replyAction === "lead" ? replyToLandlordLead : sendWorkflowMessage} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {thread.replyAction === "lead" ? <input type="hidden" name="leadId" value={thread.sourceId} /> : <input type="hidden" name="threadId" value={thread.sourceId} />}
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor="reply-body" className="text-xs font-black uppercase text-slate-500">Reply</label>
      <textarea id="reply-body" name="body" required minLength={2} maxLength={4000} rows={4} placeholder={`Write back to ${thread.participantName}...`} className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-500">{thread.replyAction === "lead" ? "Lead replies are sent by email and saved to the lead timeline." : "Workflow replies stay in the message thread and update unread status for the recipient."}</p>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">
          <Send size={15} />
          Send reply
        </button>
      </div>
    </form>
  );
}

function Conversation({ thread }: { thread: UnifiedInboxThread }) {
  return (
    <section id="conversation" className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <Link href="/landlord/inbox#threads" className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-slate-950 lg:hidden">
          <ArrowLeft size={15} />
          Back to inbox
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${sourceClasses(thread.sourceType)}`}>{sourceIcon(thread.sourceType)} {unifiedInboxSourceLabel(thread.sourceType)}</span>
              {thread.needsReply ? <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black uppercase text-white">Needs reply</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700">Current</span>}
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{thread.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{thread.subject}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-black text-slate-950">{thread.participantName}</p>
            <div className="mt-2 space-y-1 text-slate-600">
              {thread.participantEmail ? <p className="flex items-center gap-2"><Mail size={14} /> {thread.participantEmail}</p> : null}
              {thread.participantPhone ? <p className="flex items-center gap-2"><Phone size={14} /> {thread.participantPhone}</p> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <ContextPanel thread={thread} />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-black text-slate-950">Conversation</p>
            <p className="text-xs font-black uppercase text-slate-500">{thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}</p>
          </div>
          <div className="space-y-3">
            {thread.messages.length === 0 ? <EmptyState title="No message history yet" detail="The first reply will start the visible conversation timeline." /> : thread.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          </div>
        </div>
        <ReplyComposer thread={thread} />
      </div>
    </section>
  );
}

export default async function LandlordInboxPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireRole(["LANDLORD"], "/landlord/inbox");
  const inbox = await buildUnifiedLandlordInbox(user);
  const selectedThreadId = selectedUnifiedInboxThreadId(searchParams);
  const messageThreadIds = inbox.threads.filter((thread) => thread.replyAction === "message").map((thread) => thread.sourceId);
  if (selectedThreadId?.startsWith("thread_")) await markVisibleInboxThreadRead(user, selectedThreadId.replace(/^thread_/, ""), messageThreadIds);

  const filters = {
    q: param(searchParams, "q"),
    source: param(searchParams, "source") ?? "all",
    scope: param(searchParams, "scope") ?? "all",
    sort: param(searchParams, "sort") ?? "needs-reply"
  };
  const filteredThreads = filterUnifiedInboxThreads(inbox.threads, filters);
  const selectedThread = inbox.threads.find((thread) => thread.id === selectedThreadId) ?? filteredThreads[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                <Link href="/landlord" className="hover:text-slate-950">Landlord dashboard</Link>
                <span>/</span>
                <span>Unified inbox</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Unified landlord inbox</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Lead questions, application conversations, tenant messages, and maintenance threads now land in one permission-scoped work center.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/landlord/leads" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><Inbox size={15} /> Leads</Link>
              <Link href="/landlord/applications" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><ClipboardList size={15} /> Applications</Link>
              <Link href="/landlord/maintenance" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"><Wrench size={15} /> Maintenance</Link>
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="All conversations" value={inbox.metrics.total} detail="Every visible thread for this landlord account." />
          <Metric label="Needs reply" value={inbox.metrics.needsReply} detail="New questions or threads waiting on staff." />
          <Metric label="Unread" value={inbox.metrics.unread} detail="Unread messages from renters or partners." />
          <Metric label="Lead questions" value={inbox.metrics.leads} detail="Marketplace inquiries and email replies." />
          <Metric label="Maintenance" value={inbox.metrics.maintenance} detail="Repair conversations with unit context." />
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <form action="/landlord/inbox" className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto] lg:items-end">
            <div>
              <label htmlFor="q" className="text-xs font-black uppercase text-slate-500">Search inbox</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-300 px-3">
                <Search size={17} className="text-slate-400" />
                <input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Search name, property, unit, email, or message" className="min-h-11 w-full bg-transparent text-sm font-bold outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="source" className="text-xs font-black uppercase text-slate-500">Type</label>
              <select id="source" name="source" defaultValue={filters.source} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none">
                <option value="all">All types</option>
                <option value="lead">Leads</option>
                <option value="application">Applications</option>
                <option value="maintenance">Maintenance</option>
                <option value="lease">Lease</option>
                <option value="tenant">Tenants</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label htmlFor="scope" className="text-xs font-black uppercase text-slate-500">Status</label>
              <select id="scope" name="scope" defaultValue={filters.scope} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none">
                <option value="all">All conversations</option>
                <option value="needs-reply">Needs reply</option>
                <option value="unread">Unread</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="text-xs font-black uppercase text-slate-500">Sort</label>
              <select id="sort" name="sort" defaultValue={filters.sort} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none">
                <option value="needs-reply">Needs reply first</option>
                <option value="newest">Newest activity</option>
                <option value="unread">Unread first</option>
                <option value="oldest">Oldest first</option>
                <option value="source">Type</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"><Filter size={15} /> Apply</button>
              <Link href="/landlord/inbox" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-3 text-slate-700 hover:bg-slate-50" aria-label="Clear filters"><RotateCcw size={16} /></Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside id="threads" className={`${selectedThreadId ? "hidden lg:block" : "block"} rounded-3xl border border-slate-200 bg-white p-3 shadow-sm`}>
            <div className="flex items-center justify-between gap-3 p-2">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Threads</p>
                <h2 className="text-lg font-black text-slate-950">{filteredThreads.length} visible</h2>
              </div>
              {inbox.metrics.needsReply === 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700"><CheckCircle2 size={13} /> Clear</span> : null}
            </div>
            <div className="mt-2 max-h-[74vh] space-y-3 overflow-y-auto pr-1">
              {filteredThreads.length === 0 ? (
                <EmptyState title="No conversations match" detail="Try clearing filters or searching by applicant, property, unit, email, or message text." actionHref="/landlord/inbox" actionLabel="Clear filters" />
              ) : (
                filteredThreads.map((thread) => <ThreadCard key={thread.id} thread={thread} selected={selectedThread?.id === thread.id} href={`${inboxHref(searchParams, { thread: thread.id })}#conversation`} />)
              )}
            </div>
          </aside>

          {selectedThread ? (
            <Conversation thread={selectedThread} />
          ) : (
            <EmptyState title="No landlord conversations yet" detail="No conversations are waiting right now. Lead questions, application messages, tenant conversations, and maintenance updates are listed here when connected to your listings or units." actionHref="/landlord/rentals" actionLabel="View rentals" />
          )}
        </section>
      </div>
    </main>
  );
}
