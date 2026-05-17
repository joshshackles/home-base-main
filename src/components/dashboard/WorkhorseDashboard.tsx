import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, ClipboardList, Clock3, Home, Inbox, KeyRound, Layers3, Search, ShieldCheck, UserRound, Wrench } from "lucide-react";
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

export function WorkhorseDashboard({ name, accountLabel, headline, summary, metrics, tasks, tools, accessRequests, showAccessBuilder = true, adminAccessQueue = [] }: WorkhorseDashboardProps) {
  const pendingTypes = new Set(accessRequests.filter((request) => request.status === "PENDING").map((request) => request.type));
  const approvedTypes = new Set(accessRequests.filter((request) => request.status === "APPROVED").map((request) => request.type));
  const sortedTasks = tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => taskPriority(a.task) - taskPriority(b.task) || a.index - b.index)
    .map(({ task }) => task);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><Layers3 size={15} /> Main dashboard</span>
            <span className="rounded-full bg-brand-500 px-3 py-1 text-white">{accountLabel}</span>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">{headline}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">{summary}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Link href="/marketplace" className="group rounded-2xl bg-white p-4 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Search size={20} /></span>
              <span className="mt-4 block text-sm font-black">Find Rentals</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">Profile-aware search and saved homes.</span>
            </Link>
            <Link href="/applicant/profile" className="group rounded-2xl border border-white/15 bg-white/10 p-4 text-white transition hover:-translate-y-0.5 hover:bg-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white"><UserRound size={20} /></span>
              <span className="mt-4 block text-sm font-black">Renter Profile</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">Household, income, preferences, and story.</span>
            </Link>
            <Link href="/account/password" className="group rounded-2xl border border-white/15 bg-white/10 p-4 text-white transition hover:-translate-y-0.5 hover:bg-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white"><KeyRound size={20} /></span>
              <span className="mt-4 block text-sm font-black">Account</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">Security and password controls.</span>
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><KeyRound size={22} /></span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-500">Signed in as</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{name || "HomeBase user"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Applicant access is the base account. Additional work modules appear here when access is approved.</p>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <AccessLine icon={<CheckCircle2 size={16} />} label="Applicant tools" value="Active" />
            <AccessLine icon={<Clock3 size={16} />} label="Pending requests" value={`${pendingTypes.size}`} />
            <AccessLine icon={<BadgeCheck size={16} />} label="Approved additions" value={`${approvedTypes.size}`} />
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-brand-50">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{metric.icon ?? <Home size={20} />}</span>
              <ArrowUpRight size={18} className="text-slate-400" />
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p className="mt-1 text-4xl font-black text-slate-950">{metric.value}</p>
            {metric.detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{metric.detail}</p> : null}
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Work queue</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">The highest-value next actions across your active modules.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">{sortedTasks.length} items</span>
          </div>
          <div className="mt-5 space-y-3">
            {sortedTasks.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No urgent work is waiting right now.</p> : sortedTasks.map((task) => (
              <Link key={`${task.title}-${task.href}`} href={task.href} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{task.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${task.tone === "urgent" ? "bg-red-50 text-red-700" : task.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{task.cta}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Work modules</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Every account uses the same dashboard; access simply adds more modules to the surface.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link key={`${tool.title}-${tool.href}`} href={tool.href} className="rounded-2xl border border-slate-200 p-4 hover:border-brand-200 hover:bg-brand-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{tool.icon ?? <BriefcaseBusiness size={19} />}</span>
                <p className="mt-4 font-black text-slate-950">{tool.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{tool.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {showAccessBuilder ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Add access</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Start as an applicant, then request work modules as your responsibilities grow.</p>
            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-950">
              <p className="font-black">Becoming a landlord</p>
              <p className="mt-1">Request landlord access here. Once an admin approves it, your dashboard opens the landlord module where you can create a property, add units, and publish available listings to the public directory.</p>
            </div>
            <form action={requestAccountAccessAction} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Access type</span>
                <select name="type" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900">
                  {accessOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Organization, optional</span>
                <input name="organization" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900" placeholder="Property company, agency, or team" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Why do you need this access?</span>
                <textarea name="reason" rows={4} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900" placeholder="Example: I own two units and need to list them, review leads, and manage repairs." />
              </label>
              <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-black text-white hover:bg-brand-700">Request Access</button>
            </form>
            <div className="mt-5 space-y-2">
              {accessOptions.map((option) => (
                <p key={option.value} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  <strong className="text-slate-950">{option.label}:</strong> {pendingTypes.has(option.value) ? "Request pending." : approvedTypes.has(option.value) ? "Approved." : option.detail}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">{adminAccessQueue.length > 0 ? "Access review queue" : "Access history"}</h2>
          <div className="mt-5 space-y-3">
            {(adminAccessQueue.length > 0 ? adminAccessQueue : accessRequests).slice(0, 8).map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{pretty(request.type)}</p>
                    <p className="mt-1 text-sm text-slate-600">{request.requester ? `${request.requester} - ` : ""}{request.organization || "No organization listed"} - {request.createdAt.toLocaleDateString()}</p>
                    {request.reason ? <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{request.reason}</p> : null}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusBadgeClass(request.status)}`}>{pretty(request.status)}</span>
                </div>
                {adminAccessQueue.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={reviewAccountAccessAction}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <input type="hidden" name="reviewNote" value="Approved from dashboard review queue." />
                      <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700" type="submit">Approve</button>
                    </form>
                    <form action={reviewAccountAccessAction}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="status" value="DECLINED" />
                      <input type="hidden" name="reviewNote" value="Declined from dashboard review queue." />
                      <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50" type="submit">Decline</button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
            {(adminAccessQueue.length > 0 ? adminAccessQueue : accessRequests).length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No access requests yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function AccessLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="inline-flex items-center gap-2 font-bold text-slate-700">{icon}{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

export const dashboardIcons = {
  applications: <ClipboardList size={20} />,
  inbox: <Inbox size={20} />,
  homes: <Home size={20} />,
  maintenance: <Wrench size={20} />,
  security: <ShieldCheck size={20} />,
  work: <BriefcaseBusiness size={20} />
};
