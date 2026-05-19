import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Home,
  Inbox,
  KeyRound,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wrench,
  Zap
} from "lucide-react";
import { requestAccountAccessAction, reviewAccountAccessAction } from "@/app/account/actions";

type DashboardMetric = {
  label: string;
  value: string | number;
  href: string;
  detail?: string;
  icon?: ReactNode;
};

type DashboardTask = {
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone?: "default" | "urgent" | "success";
};

type DashboardTool = {
  title: string;
  detail: string;
  href: string;
  icon?: ReactNode;
};

type AccessRequest = {
  id: string;
  type: string;
  status: string;
  organization: string | null;
  reason?: string | null;
  createdAt: Date;
  requester?: string | null;
};

export type WorkhorseDashboardProps = {
  name: string | null;
  accountLabel: string;
  headline: string;
  summary: string;
  metrics: DashboardMetric[];
  tasks: DashboardTask[];
  tools: DashboardTool[];
  accessRequests: AccessRequest[];
  showAccessBuilder?: boolean;
  adminAccessQueue?: AccessRequest[];
};

const accessOptions = [
  { value: "LANDLORD", label: "Landlord", detail: "List units, manage applicants, leases, payments, maintenance, and tenant records." },
  { value: "PROPERTY_MANAGER", label: "Property manager", detail: "Operate assigned portfolios, communicate with tenants, and coordinate daily work." },
  { value: "CASEWORKER", label: "Caseworker", detail: "Support renter profiles, documents, inspections, subsidy notes, and housing search progress." },
  { value: "INSPECTOR", label: "Inspector", detail: "Receive inspections, update findings, and coordinate repairs or reinspections." },
  { value: "MAINTENANCE", label: "Maintenance", detail: "Receive repair work orders, message residents, update status, and attach notes." },
  { value: "VENDOR", label: "Vendor", detail: "Collaborate on assigned work, scheduling, documents, invoices, and completion updates." }
];

function pretty(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function taskPriority(task: DashboardTask) {
  if (task.tone === "urgent") return 0;
  if (task.tone === "default" || !task.tone) return 1;
  return 2;
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "DECLINED") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function taskToneClass(tone?: DashboardTask["tone"]) {
  if (tone === "urgent") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-white text-slate-800";
}

function activityVerb(task: DashboardTask) {
  if (task.tone === "urgent") return "Priority";
  if (task.tone === "success") return "Healthy";
  return "Queued";
}

export function WorkhorseDashboard({ name, accountLabel, headline, summary, metrics, tasks, tools, accessRequests, showAccessBuilder = true, adminAccessQueue = [] }: WorkhorseDashboardProps) {
  const pendingTypes = new Set(accessRequests.filter((request) => request.status === "PENDING").map((request) => request.type));
  const approvedTypes = new Set(accessRequests.filter((request) => request.status === "APPROVED").map((request) => request.type));
  const sortedTasks = tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => taskPriority(a.task) - taskPriority(b.task) || a.index - b.index)
    .map(({ task }) => task);
  const criticalCount = sortedTasks.filter((task) => task.tone === "urgent").length;
  const reviewItems = adminAccessQueue.length > 0 ? adminAccessQueue : accessRequests;
  const inboxHref = tools.find((tool) => tool.href.includes("inbox"))?.href ?? "/applicant/inbox";
  const quickLinks = [
    { href: "/marketplace", label: "Search", icon: <Search size={15} /> },
    { href: "/applicant/profile", label: "Profile", icon: <UserRound size={15} /> },
    { href: "/account/password", label: "Security", icon: <KeyRound size={15} /> },
    ...(tools.slice(0, 3).map((tool) => ({ href: tool.href, label: tool.title, icon: tool.icon ?? <BriefcaseBusiness size={15} /> })))
  ];

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Layers3 size={14} /> Command center</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{accountLabel}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700"><SlidersHorizontal size={14} /> Compact</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={inboxHref} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"><Bell size={14} /> Inbox</Link>
                <Link href="/marketplace" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-700"><Zap size={14} /> Quick action</Link>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">{headline}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{summary}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center">
                <MiniSignal label="Tasks" value={sortedTasks.length} />
                <MiniSignal label="Critical" value={criticalCount} />
                <MiniSignal label="Modules" value={tools.length} />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {quickLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 transition hover:border-brand-200 hover:bg-white">
                  <span className="shrink-0 text-brand-700">{link.icon}</span><span className="truncate">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><KeyRound size={19} /></span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Signed in as</p>
                <h2 className="mt-0.5 truncate text-xl font-black text-slate-950">{name || "HomeBase user"}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">One account, role-based modules, compact operational surface.</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <AccessLine icon={<CheckCircle2 size={15} />} label="Applicant tools" value="Active" />
              <AccessLine icon={<Clock3 size={15} />} label="Pending" value={`${pendingTypes.size}`} />
              <AccessLine icon={<BadgeCheck size={15} />} label="Approved" value={`${approvedTypes.size}`} />
            </div>
          </aside>
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link key={metric.label} href={metric.href} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-brand-700">{metric.icon ?? <Home size={18} />}</span>
                <ArrowUpRight size={16} className="text-slate-400" />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">{metric.label}</p>
              <p className="mt-0.5 truncate text-3xl font-black text-slate-950">{metric.value}</p>
              {metric.detail ? <p className="mt-1 truncate text-xs font-semibold text-slate-600">{metric.detail}</p> : null}
            </Link>
          ))}
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader eyebrow="Operational queue" title="Next best actions" detail="Sorted by urgency with denser rows for smaller screens." count={`${sortedTasks.length} items`} />
            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {sortedTasks.length === 0 ? <p className="bg-slate-50 p-4 text-sm text-slate-600">No urgent work is waiting right now.</p> : sortedTasks.map((task) => (
                <Link key={`${task.title}-${task.href}`} href={task.href} className="grid gap-2 bg-white p-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{task.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{task.detail}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${taskToneClass(task.tone)}`}>{task.cta}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader eyebrow="Activity feed" title="Operational heartbeat" detail="Generated from current work and access events." />
            <div className="mt-3 space-y-2">
              {sortedTasks.slice(0, 5).map((task) => (
                <Link key={`activity-${task.title}`} href={task.href} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border ${taskToneClass(task.tone)}`}><Activity size={15} /></span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-wide text-slate-500">{activityVerb(task)}</span>
                    <span className="block truncate text-sm font-black text-slate-950">{task.title}</span>
                    <span className="block truncate text-xs text-slate-600">{task.detail}</span>
                  </span>
                </Link>
              ))}
              {sortedTasks.length === 0 ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Nothing new in the operational feed.</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader eyebrow="Workspace" title="Modules" detail="Compact cards keep more tools visible above the fold." count={`${tools.length} modules`} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <Link key={`${tool.title}-${tool.href}`} href={tool.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:border-brand-200 hover:bg-white">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{tool.icon ?? <BriefcaseBusiness size={17} />}</span>
                    <p className="truncate text-sm font-black text-slate-950">{tool.title}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{tool.detail}</p>
                </Link>
              ))}
            </div>
          </div>

          <AccessPanel
            showAccessBuilder={showAccessBuilder}
            accessRequests={accessRequests}
            adminAccessQueue={adminAccessQueue}
            pendingTypes={pendingTypes}
            approvedTypes={approvedTypes}
            reviewItems={reviewItems}
          />
        </section>
      </div>
    </main>
  );
}

function MiniSignal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2 shadow-sm">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, detail, count }: { eyebrow: string; title: string; detail: string; count?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
        <h2 className="mt-0.5 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{detail}</p>
      </div>
      {count ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">{count}</span> : null}
    </div>
  );
}

function AccessPanel({ showAccessBuilder, accessRequests, adminAccessQueue, pendingTypes, approvedTypes, reviewItems }: {
  showAccessBuilder: boolean;
  accessRequests: AccessRequest[];
  adminAccessQueue: AccessRequest[];
  pendingTypes: Set<string>;
  approvedTypes: Set<string>;
  reviewItems: AccessRequest[];
}) {
  if (showAccessBuilder) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="Access" title="Add modules" detail="Request new operational access without leaving the dashboard." />
        <form action={requestAccountAccessAction} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Access type</span>
            <select name="type" required className="mt-1.5 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900">
              {accessOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Organization, optional</span>
            <input name="organization" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Property company, agency, or team" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Why do you need this access?</span>
            <textarea name="reason" rows={3} required className="mt-1.5 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900" placeholder="Example: I own two units and need to list them." />
          </label>
          <button className="w-full rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700">Request Access</button>
        </form>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {accessOptions.slice(0, 6).map((option) => (
            <p key={option.value} className="rounded-2xl bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
              <strong className="text-slate-950">{option.label}:</strong> {pendingTypes.has(option.value) ? "Request pending." : approvedTypes.has(option.value) ? "Approved." : option.detail}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <SectionHeader eyebrow="Governance" title={adminAccessQueue.length > 0 ? "Access review" : "Access history"} detail="Review account permission requests from the compact dashboard." count={`${reviewItems.length} records`} />
      <div className="mt-3 space-y-2">
        {reviewItems.slice(0, 8).map((request) => (
          <div key={request.id} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{pretty(request.type)}</p>
                <p className="mt-0.5 text-xs text-slate-600">{request.requester ? `${request.requester} - ` : ""}{request.organization || "No organization listed"} - {request.createdAt.toLocaleDateString()}</p>
                {request.reason ? <p className="mt-2 line-clamp-2 rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-700">{request.reason}</p> : null}
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusBadgeClass(request.status)}`}>{pretty(request.status)}</span>
            </div>
            {adminAccessQueue.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={reviewAccountAccessAction}>
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <input type="hidden" name="reviewNote" value="Approved from dashboard review queue." />
                  <button className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700" type="submit">Approve</button>
                </form>
                <form action={reviewAccountAccessAction}>
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="status" value="DECLINED" />
                  <input type="hidden" name="reviewNote" value="Declined from dashboard review queue." />
                  <button className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50" type="submit">Decline</button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
        {reviewItems.length === 0 ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">No access requests yet.</p> : null}
      </div>
    </div>
  );
}

function AccessLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="inline-flex items-center gap-2 font-bold text-slate-700">{icon}{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

export const dashboardIcons = {
  applications: <ClipboardList size={18} />,
  inbox: <Inbox size={18} />,
  homes: <Home size={18} />,
  maintenance: <Wrench size={18} />,
  security: <ShieldCheck size={18} />,
  work: <BriefcaseBusiness size={18} />,
  activity: <Activity size={18} />,
  sparkles: <Sparkles size={18} />
};
