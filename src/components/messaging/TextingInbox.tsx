import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  Filter,
  Hash,
  Inbox,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Plus,
  RotateCcw,
  Search,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  Users,
  Wrench,
  Zap
} from "lucide-react";
import { MessageThreadStatus, MessageThreadType } from "@prisma/client";
import { sendWorkflowMessage, updateMessageThreadStatus } from "@/app/workflow-actions";

type Sender = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type Message = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  readByStaffAt?: Date | null;
  readByApplicantAt?: Date | null;
  sender: Sender;
};

type Thread = {
  id: string;
  subject: string;
  type: MessageThreadType | string;
  status: MessageThreadStatus | string;
  createdAt: Date;
  lastMessageAt: Date | null;
  createdBy: Sender;
  application: {
    id?: string;
    status?: string;
    applicantName?: string | null;
    applicantEmail?: string;
    unit: { id?: string; unitNumber: string; property: { id?: string; name: string } } | null;
  } | null;
  maintenanceRequest: {
    id?: string;
    subject: string;
    status?: string;
    priority?: string;
    unit?: { id?: string; unitNumber: string; property: { id?: string; name: string } } | null;
  } | null;
  messages: Message[];
};

type InboxFilters = {
  q?: string | string[];
  status?: string | string[];
  type?: string | string[];
  scope?: string | string[];
  sort?: string | string[];
  priority?: string | string[];
  thread?: string | string[];
};

type FilterState = {
  q: string;
  status: string;
  type: string;
  scope: string;
  sort: string;
  priority: string;
  thread?: string;
};

const QUICK_REPLIES = [
  "Thanks - I will review this and follow up.",
  "Can you upload a photo or document?",
  "I am checking the status and will send the next step shortly.",
  "This has been resolved and can be closed."
];

const PRIORITY_COPY: Record<string, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low"
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFilters(filters?: InboxFilters): FilterState {
  return {
    q: firstParam(filters?.q)?.trim() ?? "",
    status: firstParam(filters?.status) ?? "",
    type: firstParam(filters?.type) ?? "",
    scope: firstParam(filters?.scope) ?? "",
    sort: firstParam(filters?.sort) ?? "smart",
    priority: firstParam(filters?.priority) ?? "",
    thread: firstParam(filters?.thread)
  };
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function senderLabel(sender: Sender) {
  return sender.name || sender.email;
}

function initials(sender: Sender) {
  const source = sender.name || sender.email;
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function threadContext(thread: Thread) {
  if (thread.application?.unit) return `${thread.application.unit.property.name} #${thread.application.unit.unitNumber}`;
  if (thread.application) return thread.application.applicantName ?? thread.application.applicantEmail ?? thread.application.status ?? thread.subject;
  if (thread.maintenanceRequest?.unit) return `${thread.maintenanceRequest.unit.property.name} #${thread.maintenanceRequest.unit.unitNumber}`;
  if (thread.maintenanceRequest) return thread.maintenanceRequest.subject;
  return label(String(thread.type));
}

function threadParticipants(thread: Thread) {
  const participants = new Map<string, Sender>();
  participants.set(thread.createdBy.id, thread.createdBy);
  thread.messages.forEach((message) => participants.set(message.sender.id, message.sender));
  return Array.from(participants.values());
}

function lastActivity(thread: Thread) {
  return thread.lastMessageAt ?? thread.createdAt;
}

function newestMessage(thread: Thread) {
  return thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null;
}

function isWaitingOnCurrentUser(thread: Thread, isStaffInbox: boolean) {
  return isStaffInbox ? thread.status === MessageThreadStatus.WAITING_ON_STAFF : thread.status === MessageThreadStatus.WAITING_ON_APPLICANT;
}

function hoursSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 36e5));
}

function isOverdue(thread: Thread, isStaffInbox: boolean) {
  return thread.status !== MessageThreadStatus.CLOSED && isWaitingOnCurrentUser(thread, isStaffInbox) && hoursSince(lastActivity(thread)) >= 24;
}

function isEscalated(thread: Thread, isStaffInbox: boolean) {
  return thread.status !== MessageThreadStatus.CLOSED && isWaitingOnCurrentUser(thread, isStaffInbox) && hoursSince(lastActivity(thread)) >= 48;
}

function unreadMessagesForThread(thread: Thread, isStaffInbox: boolean) {
  return thread.messages.filter((message) => {
    if (message.isInternal && !isStaffInbox) return false;
    return isStaffInbox ? !message.readByStaffAt : !message.readByApplicantAt;
  });
}

function hasUnreadForCurrentUser(thread: Thread, currentUserId: string, isStaffInbox: boolean) {
  return unreadMessagesForThread(thread, isStaffInbox).some((message) => message.sender.id !== currentUserId);
}

function messageReadReceipt(message: Message, isMine: boolean, isStaffInbox: boolean) {
  if (!isMine || message.isInternal) return null;
  const seenAt = isStaffInbox ? message.readByApplicantAt : message.readByStaffAt;
  return seenAt ? `Seen ${seenAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Sent";
}

function responseLabel(thread: Thread, isStaffInbox: boolean) {
  if (thread.status === MessageThreadStatus.CLOSED) return "Closed";
  if (isEscalated(thread, isStaffInbox)) return `${hoursSince(lastActivity(thread))}h escalated`;
  if (isOverdue(thread, isStaffInbox)) return `${hoursSince(lastActivity(thread))}h waiting`;
  return isWaitingOnCurrentUser(thread, isStaffInbox) ? "Needs response" : "Waiting externally";
}

function priorityLabel(thread: Thread) {
  const raw = thread.maintenanceRequest?.priority;
  return raw ? PRIORITY_COPY[raw] ?? label(raw) : "Standard";
}

function threadScore(thread: Thread, isStaffInbox: boolean, currentUserId: string) {
  let score = 0;
  if (isWaitingOnCurrentUser(thread, isStaffInbox)) score += 40;
  if (hasUnreadForCurrentUser(thread, currentUserId, isStaffInbox)) score += 25;
  if (isOverdue(thread, isStaffInbox)) score += 20;
  if (isEscalated(thread, isStaffInbox)) score += 20;
  if (thread.maintenanceRequest?.priority === "URGENT") score += 30;
  if (thread.maintenanceRequest?.priority === "HIGH") score += 20;
  if (thread.type === MessageThreadType.LEASE || thread.type === MessageThreadType.MAINTENANCE) score += 6;
  return score;
}

function nextBestAction(thread: Thread, isStaffInbox: boolean) {
  if (thread.status === MessageThreadStatus.CLOSED) return "This thread is closed. Reopen it before sending new operational follow-up.";
  if (isEscalated(thread, isStaffInbox)) return "Escalate or reply now. This conversation has been waiting more than 48 hours.";
  if (isOverdue(thread, isStaffInbox)) return "Send a status update or assign ownership. This conversation is past the 24-hour response target.";
  if (isWaitingOnCurrentUser(thread, isStaffInbox)) return "Reply with a clear next step, request, or resolution to move this conversation forward.";
  return "Monitor for the other party's response. Add an internal note if staff context is needed.";
}

function toneForStatus(status: string) {
  if (status === MessageThreadStatus.CLOSED) return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === MessageThreadStatus.WAITING_ON_STAFF) return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === MessageThreadStatus.WAITING_ON_APPLICANT) return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function toneForType(type: string) {
  if (type === MessageThreadType.MAINTENANCE) return "bg-orange-50 text-orange-800 ring-orange-200";
  if (type === MessageThreadType.APPLICATION) return "bg-brand-50 text-brand-800 ring-brand-200";
  if (type === MessageThreadType.LEASE) return "bg-purple-50 text-purple-800 ring-purple-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function toneForScore(score: number) {
  if (score >= 80) return "bg-red-100 text-red-800 ring-red-200";
  if (score >= 55) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (score >= 25) return "bg-sky-100 text-sky-800 ring-sky-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function buildHref(basePath: string, updates: Partial<FilterState>) {
  const params = new URLSearchParams();
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function hrefWithThread(basePath: string, filters: FilterState, threadId: string) {
  return buildHref(basePath, { q: filters.q, status: filters.status, type: filters.type, scope: filters.scope, sort: filters.sort, priority: filters.priority, thread: threadId });
}

function filterThreads(threads: Thread[], filters: FilterState, isStaffInbox: boolean, currentUserIdForFilters: string) {
  return threads.filter((thread) => {
    const latest = newestMessage(thread);
    const participants = threadParticipants(thread).map((participant) => `${participant.name ?? ""} ${participant.email} ${participant.role}`);
    const haystack = [
      thread.subject,
      threadContext(thread),
      ...participants,
      latest?.body,
      thread.application?.applicantName,
      thread.application?.applicantEmail,
      thread.application?.status,
      thread.maintenanceRequest?.subject,
      thread.maintenanceRequest?.priority,
      thread.maintenanceRequest?.status
    ].filter(Boolean).join(" ").toLowerCase();

    if (filters.q && !haystack.includes(filters.q.toLowerCase())) return false;
    if (filters.status && thread.status !== filters.status) return false;
    if (filters.type && thread.type !== filters.type) return false;
    if (filters.priority && thread.maintenanceRequest?.priority !== filters.priority) return false;
    if (filters.scope === "waiting" && !isWaitingOnCurrentUser(thread, isStaffInbox)) return false;
    if (filters.scope === "unread" && !hasUnreadForCurrentUser(thread, currentUserIdForFilters, isStaffInbox)) return false;
    if (filters.scope === "overdue" && !isOverdue(thread, isStaffInbox)) return false;
    if (filters.scope === "escalated" && !isEscalated(thread, isStaffInbox)) return false;
    if (filters.scope === "internal" && (!isStaffInbox || !thread.messages.some((message) => message.isInternal))) return false;
    if (filters.scope === "closed" && thread.status !== MessageThreadStatus.CLOSED) return false;
    return true;
  });
}

function sortThreads(threads: Thread[], sort: string, isStaffInbox: boolean, currentUserId: string) {
  return [...threads].sort((a, b) => {
    if (sort === "oldest") return lastActivity(a).getTime() - lastActivity(b).getTime();
    if (sort === "unread") return Number(hasUnreadForCurrentUser(b, currentUserId, isStaffInbox)) - Number(hasUnreadForCurrentUser(a, currentUserId, isStaffInbox)) || lastActivity(b).getTime() - lastActivity(a).getTime();
    if (sort === "priority") return threadScore(b, isStaffInbox, currentUserId) - threadScore(a, isStaffInbox, currentUserId) || lastActivity(b).getTime() - lastActivity(a).getTime();
    if (sort === "recent") return lastActivity(b).getTime() - lastActivity(a).getTime();
    return threadScore(b, isStaffInbox, currentUserId) - threadScore(a, isStaffInbox, currentUserId) || lastActivity(b).getTime() - lastActivity(a).getTime();
  });
}

function ThreadMetric({ icon: Icon, label, value, detail }: { icon: typeof Inbox; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-300">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-brand-100"><Icon size={18} /></span>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-300">{detail}</p>
    </div>
  );
}

function StatusAction({ threadId, status, children, returnTo }: { threadId: string; status: MessageThreadStatus; children: ReactNode; returnTo?: string }) {
  return (
    <form action={updateMessageThreadStatus}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="status" value={status} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" type="submit">{children}</button>
    </form>
  );
}

function QuickReply({ threadId, body, returnTo }: { threadId: string; body: string; returnTo?: string }) {
  return (
    <form action={sendWorkflowMessage}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="body" value={body} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <button aria-label={`Send quick reply: ${body}`} title={body} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800" type="submit">{body}</button>
    </form>
  );
}

function workspaceFromBasePath(basePath: string) {
  if (basePath.startsWith("/admin")) return "admin";
  if (basePath.startsWith("/landlord")) return "landlord";
  if (basePath.startsWith("/applicant")) return "applicant";
  return "applicant";
}

function workflowHrefForThread(thread: Thread, basePath: string) {
  const workspace = workspaceFromBasePath(basePath);
  if (thread.maintenanceRequest?.id) return `/${workspace}/maintenance`;
  if (thread.application?.id) return `/${workspace}/applications`;
  return basePath;
}

function recordHrefForThread(thread: Thread, basePath: string) {
  const workspace = workspaceFromBasePath(basePath);
  const unitId = thread.application?.unit?.id ?? thread.maintenanceRequest?.unit?.id;
  if (!unitId) return null;
  if (workspace === "admin") return `/admin/rentals/${unitId}`;
  if (workspace === "landlord") return `/landlord/rentals/${unitId}`;
  return `/marketplace/${unitId}`;
}

function ContextLink({ thread, basePath }: { thread: Thread; basePath: string }) {
  const workflowHref = workflowHrefForThread(thread, basePath);
  const recordHref = recordHrefForThread(thread, basePath);
  return (
    <>
      {thread.maintenanceRequest?.id ? (
        <Link href={workflowHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Wrench size={14} /> Maintenance queue</Link>
      ) : thread.application?.id ? (
        <Link href={workflowHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><MessageSquareText size={14} /> Applications</Link>
      ) : null}
      {recordHref ? (
        <Link href={recordHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Hash size={14} /> Rental record</Link>
      ) : null}
    </>
  );
}

export function TextingInbox({
  currentUserId,
  threads,
  allowInternalNotes,
  selectedThreadId,
  filters,
  basePath = "/inbox",
  staffInbox
}: {
  currentUserId: string;
  threads: Thread[];
  allowInternalNotes?: boolean;
  staffInbox?: boolean;
  selectedThreadId?: string | null;
  filters?: InboxFilters;
  basePath?: string;
}) {
  const isStaffInbox = staffInbox ?? Boolean(allowInternalNotes);
  const activeFilters = normalizeFilters(filters);
  const filteredThreads = sortThreads(filterThreads(threads, activeFilters, isStaffInbox, currentUserId), activeFilters.sort, isStaffInbox, currentUserId);
  const selectedThreadExists = selectedThreadId ? filteredThreads.some((thread) => thread.id === selectedThreadId) : false;
  const activeThread = selectedThreadExists ? filteredThreads.find((thread) => thread.id === selectedThreadId) ?? null : filteredThreads[0] ?? null;
  const waitingCount = threads.filter((thread) => isWaitingOnCurrentUser(thread, isStaffInbox)).length;
  const overdueCount = threads.filter((thread) => isOverdue(thread, isStaffInbox)).length;
  const escalatedCount = threads.filter((thread) => isEscalated(thread, isStaffInbox)).length;
  const unreadCount = threads.filter((thread) => hasUnreadForCurrentUser(thread, currentUserId, isStaffInbox)).length;
  const closedCount = threads.filter((thread) => thread.status === MessageThreadStatus.CLOSED).length;
  const returnTo = buildHref(basePath, { q: activeFilters.q, status: activeFilters.status, type: activeFilters.type, scope: activeFilters.scope, sort: activeFilters.sort, priority: activeFilters.priority, thread: activeThread?.id });
  const canManageThreadStatus = isStaffInbox;
  const activeThreadScore = activeThread ? threadScore(activeThread, isStaffInbox, currentUserId) : 0;
  const activeThreadParticipants = activeThread ? threadParticipants(activeThread) : [];
  const activeThreadUnreadCount = activeThread ? unreadMessagesForThread(activeThread, isStaffInbox).filter((message) => message.sender.id !== currentUserId).length : 0;
  const activeThreadInternalCount = activeThread ? activeThread.messages.filter((message) => message.isInternal).length : 0;
  const activeThreadLastActivity = activeThread ? lastActivity(activeThread) : null;

  return (
    <main id="main-content" className="mx-auto max-w-[1580px] px-3 py-4 sm:px-4 lg:px-5">
      <div className="mb-4 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-4 text-white shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-100 ring-1 ring-white/15">
              <Sparkles size={14} /> Communication command center
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Messages</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">A unified, triage-first inbox for applicants, tenants, landlords, staff, vendors, maintenance workflows, internal notes, and lease conversations.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[700px]">
            <ThreadMetric icon={Inbox} label="All" value={threads.length} detail="total threads" />
            <ThreadMetric icon={Bell} label="Needs action" value={waitingCount} detail="waiting on you" />
            <ThreadMetric icon={TimerReset} label="Overdue" value={overdueCount} detail="24h+ response" />
            <ThreadMetric icon={AlertTriangle} label="Escalated" value={escalatedCount} detail="48h+ waiting" />
            <ThreadMetric icon={Eye} label="Unread" value={unreadCount} detail="unseen replies" />
          </div>
        </div>
      </div>

      <nav className="mb-3 grid gap-2 text-xs font-black sm:grid-cols-2 lg:grid-cols-5">
        <Link className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-brand-50" href={buildHref(basePath, { scope: "waiting", sort: "priority" })}>Action queue · {waitingCount}</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-brand-50" href={buildHref(basePath, { scope: "escalated", sort: "priority" })}>Escalations · {escalatedCount}</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-brand-50" href={buildHref(basePath, { scope: "unread", sort: "unread" })}>Unread · {unreadCount}</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-brand-50" href={buildHref(basePath, { type: MessageThreadType.MAINTENANCE, sort: "priority" })}>Maintenance dispatch</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-brand-50" href={buildHref(basePath, { status: MessageThreadStatus.CLOSED, scope: "closed" })}>Closed archive · {closedCount}</Link>
      </nav>

      {selectedThreadId && !selectedThreadExists ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          That conversation is no longer available, hidden by your filters, or you do not have permission to view it. Showing the most relevant accessible thread instead.
        </div>
      ) : null}

      <section className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm xl:grid-cols-[460px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 xl:border-b-0 xl:border-r">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 p-3 backdrop-blur">
            <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" open={threads.length === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-black text-slate-950">
                <span className="inline-flex items-center gap-2"><Plus size={17} /> New conversation</span>
                <span className="text-xs font-black text-brand-700 group-open:hidden">Open</span>
              </summary>
              <form action={sendWorkflowMessage} className="border-t border-slate-100 p-4">
                <input type="hidden" name="returnTo" value={returnTo} />
                <select name="type" defaultValue={MessageThreadType.GENERAL} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                  {Object.values(MessageThreadType).map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
                <input name="subject" required minLength={3} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subject" />
                <textarea name="body" required minLength={2} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Describe the question, issue, or next step..." />
                {allowInternalNotes ? <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isInternal" value="true" /> Staff-only internal note</label> : null}
                <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800" type="submit"><SendHorizonal size={16} /> Start thread</button>
              </form>
            </details>

            <form className="mt-3 grid gap-2" action={basePath}>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input name="q" defaultValue={activeFilters.q} className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" placeholder="Search subject, person, unit, message..." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select name="status" defaultValue={activeFilters.status} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <option value="">Any status</option>
                  {Object.values(MessageThreadStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
                <select name="type" defaultValue={activeFilters.type} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <option value="">Any type</option>
                  {Object.values(MessageThreadType).map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="scope" defaultValue={activeFilters.scope} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <option value="">All conversations</option>
                  <option value="waiting">Needs my response</option>
                  <option value="unread">Unread conversations</option>
                  <option value="overdue">Overdue response</option>
                  <option value="escalated">Escalated 48h+</option>
                  {isStaffInbox ? <option value="internal">Has internal notes</option> : null}
                  <option value="closed">Closed only</option>
                </select>
                <select name="sort" defaultValue={activeFilters.sort} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <option value="smart">Smart triage</option>
                  <option value="priority">Priority score</option>
                  <option value="unread">Unread first</option>
                  <option value="recent">Newest activity</option>
                  <option value="oldest">Oldest activity</option>
                </select>
              </div>
              <select name="priority" defaultValue={activeFilters.priority} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                <option value="">Any maintenance priority</option>
                {Object.entries(PRIORITY_COPY).map(([value, copy]) => <option key={value} value={value}>{copy}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-white hover:bg-slate-800" type="submit"><Filter size={14} /> Apply</button>
                <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href={basePath}><RotateCcw size={14} /> Reset</Link>
              </div>
            </form>
          </div>

          <div className="max-h-[760px] divide-y divide-slate-200 overflow-y-auto">
            {filteredThreads.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No conversations match these filters.</p> : null}
            {filteredThreads.map((thread) => {
              const latest = newestMessage(thread);
              const isActive = activeThread?.id === thread.id;
              const waiting = isWaitingOnCurrentUser(thread, isStaffInbox);
              const overdue = isOverdue(thread, isStaffInbox);
              const escalated = isEscalated(thread, isStaffInbox);
              const unread = hasUnreadForCurrentUser(thread, currentUserId, isStaffInbox);
              const score = threadScore(thread, isStaffInbox, currentUserId);
              const participants = threadParticipants(thread);
              return (
                <Link key={thread.id} href={hrefWithThread(basePath, activeFilters, thread.id)} className={`block px-4 py-3 transition ${isActive ? "bg-slate-950 text-white" : "bg-white hover:bg-slate-50"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>{initials(latest?.sender ?? thread.createdBy)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-black">{thread.subject}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1 ${toneForScore(score)}`}>{score}</span>
                      </div>
                      <p className={`mt-1 truncate text-xs font-semibold ${isActive ? "text-slate-300" : "text-slate-500"}`}>{threadContext(thread)}</p>
                      {latest ? <p className={`mt-2 line-clamp-2 text-sm ${isActive ? "text-slate-200" : "text-slate-700"}`}>{latest.isInternal ? "Internal note: " : ""}{latest.body}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {unread ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black uppercase text-brand-800">Unread</span> : null}
                        {escalated ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-800">Escalated</span> : overdue ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">Overdue</span> : null}
                        {waiting ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-sky-800">Action</span> : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1 ${toneForType(String(thread.type))}`}>{label(String(thread.type))}</span>
                        {thread.maintenanceRequest?.priority ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-800">{priorityLabel(thread)}</span> : null}
                      </div>
                      <div className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                        <span>{lastActivity(thread).toLocaleDateString()} {lastActivity(thread).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                        <span className="inline-flex items-center gap-1"><Users size={12} /> {participants.length}</span>
                        <span className="inline-flex items-center gap-1"><Hash size={12} /> {thread.messages.length}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[760px] bg-slate-100">
          {activeThread ? (
            <div className="flex h-full min-h-[760px] flex-col">
              <header className="border-b border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${toneForStatus(String(activeThread.status))}`}>{label(String(activeThread.status))}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ring-1 ${toneForType(String(activeThread.type))}`}>{label(String(activeThread.type))}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black uppercase ring-1 ${toneForScore(activeThreadScore)}`}><Zap size={12} /> Score {activeThreadScore}</span>
                      {isEscalated(activeThread, isStaffInbox) ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-black uppercase text-red-800 ring-1 ring-red-200"><AlertTriangle size={12} /> Escalated</span> : isOverdue(activeThread, isStaffInbox) ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase text-amber-800 ring-1 ring-amber-200"><Clock3 size={12} /> Overdue</span> : null}
                      {activeThread.messages.some((message) => message.isInternal) ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase text-amber-800 ring-1 ring-amber-200"><LockKeyhole size={12} /> Internal notes</span> : null}
                    </div>
                    <h2 className="mt-2 truncate text-2xl font-black text-slate-950">{activeThread.subject}</h2>
                    <p className="mt-1 text-sm text-slate-600">{threadContext(activeThread)} - started by {senderLabel(activeThread.createdBy)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ContextLink thread={activeThread} basePath={basePath} />
                    {canManageThreadStatus ? (
                      <StatusAction threadId={activeThread.id} status={activeThread.status === MessageThreadStatus.CLOSED ? MessageThreadStatus.OPEN : MessageThreadStatus.CLOSED} returnTo={returnTo}>
                        {activeThread.status === MessageThreadStatus.CLOSED ? <CircleDot size={14} /> : <CheckCircle2 size={14} />}
                        {activeThread.status === MessageThreadStatus.CLOSED ? "Reopen" : "Close"}
                      </StatusAction>
                    ) : null}
                  </div>
                </div>
              </header>

              <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-3 md:grid-cols-6">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Last activity</p><p className="mt-1 text-sm font-black text-slate-900">{activeThreadLastActivity?.toLocaleString()}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Messages</p><p className="mt-1 text-sm font-black text-slate-900">{activeThread.messages.length} total</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">People</p><p className="mt-1 text-sm font-black text-slate-900">{activeThreadParticipants.length} participants</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Internal</p><p className="mt-1 text-sm font-black text-slate-900">{activeThreadInternalCount} notes</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Unread</p><p className="mt-1 text-sm font-black text-slate-900">{activeThreadUnreadCount} new</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">SLA</p><p className="mt-1 text-sm font-black text-slate-900">{responseLabel(activeThread, isStaffInbox)}</p></div>
              </div>

              <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-950">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-700"><Star size={14} /> Next best action</p>
                  <p className="mt-1 font-semibold leading-6">{nextBestAction(activeThread, isStaffInbox)}</p>
                </div>
                {canManageThreadStatus ? (
                  <div className="flex flex-wrap gap-2">
                    <StatusAction threadId={activeThread.id} status={MessageThreadStatus.WAITING_ON_STAFF} returnTo={returnTo}>Waiting on staff</StatusAction>
                    <StatusAction threadId={activeThread.id} status={MessageThreadStatus.WAITING_ON_APPLICANT} returnTo={returnTo}>Waiting on applicant</StatusAction>
                    <StatusAction threadId={activeThread.id} status={MessageThreadStatus.OPEN} returnTo={returnTo}>Open</StatusAction>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">Status controls are managed by staff. Send a reply to move this conversation forward.</div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5">
                {activeThread.messages.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">No messages in this thread yet.</p> : activeThread.messages.map((message, index) => {
                  const isMine = message.sender.id === currentUserId;
                  const previous = index > 0 ? activeThread.messages[index - 1] : null;
                  const showSender = !previous || previous.sender.id !== message.sender.id || previous.isInternal !== message.isInternal;
                  const showDateSeparator = !previous || previous.createdAt.toDateString() !== message.createdAt.toDateString();
                  const readReceipt = messageReadReceipt(message, isMine, isStaffInbox);
                  return (
                    <div key={message.id}>
                      {showDateSeparator ? <div className="my-2 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">{message.createdAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div> : null}
                      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[86%] rounded-[1.35rem] px-4 py-3 shadow-sm ${message.isInternal ? "border border-amber-200 bg-amber-100 text-amber-950" : isMine ? "bg-brand-600 text-white" : "bg-white text-slate-900"}`}>
                          {showSender ? <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black uppercase opacity-75"><span>{senderLabel(message.sender)}</span><span>{label(message.sender.role)}</span>{message.isInternal ? <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Internal</span> : null}</div> : null}
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] font-bold opacity-70"><span>{message.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>{readReceipt ? <span>- {readReceipt}</span> : null}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((reply) => <QuickReply key={reply} threadId={activeThread.id} body={reply} returnTo={returnTo} />)}
                </div>
                <form action={sendWorkflowMessage}>
                  <input type="hidden" name="threadId" value={activeThread.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <textarea name="body" required rows={2} className="min-h-14 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6" placeholder="Write a clear update, request, internal note, or next step..." />
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                      {allowInternalNotes ? <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-200"><input type="checkbox" name="isInternal" value="true" /> Internal note</label> : null}
                      <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800" type="submit"><SendHorizonal size={16} /> Send reply</button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Tip: include the decision, owner, and next deadline so the thread remains audit-ready.</p>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[760px] items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto text-slate-400" size={48} />
                <h2 className="mt-4 text-2xl font-black text-slate-950">No conversation selected</h2>
                <p className="mt-2 max-w-md text-slate-600">Start a new thread or adjust your filters to see conversations here.</p>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-black text-slate-950">Smart triage scoring</p><p className="mt-1 text-sm leading-6 text-slate-600">Threads are ranked by urgency, unread status, SLA age, and maintenance priority so the highest-impact work rises first.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-black text-slate-950">Escalation queue</p><p className="mt-1 text-sm leading-6 text-slate-600">48-hour waiting conversations now have their own metric, scope filter, badges, and next-action guidance.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-black text-slate-950">Dispatch context</p><p className="mt-1 text-sm leading-6 text-slate-600">Thread cards surface participants, message count, workflow type, linked unit/application, and maintenance priority.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-black text-slate-950">Audit-ready replies</p><p className="mt-1 text-sm leading-6 text-slate-600">The composer nudges staff toward clear decisions, ownership, and next deadlines while preserving internal notes.</p></div>
      </section>
    </main>
  );
}
