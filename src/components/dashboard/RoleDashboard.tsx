import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, Layers3, LockKeyhole, Zap } from "lucide-react";
import type { RoleDashboardModel } from "@/lib/dashboard/role-dashboard";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";
import { DashboardToolGrid } from "@/components/dashboard/DashboardToolGrid";
import { DashboardActivityFeed } from "@/components/dashboard/DashboardActivityFeed";
import { DashboardIcon } from "@/components/dashboard/dashboard-icons";
import { CommandCenterButton, CommandCenterHeader, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";

function pretty(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function areaTone(tone: string) {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

const headerIconByModule: Record<RoleDashboardModel["primaryModule"], string> = {
  admin: "ShieldCheck",
  applicant: "Search",
  inspector: "ClipboardCheck",
  landlord: "Building2",
  tenant: "Home",
  vendor: "Wrench"
};

function roleEyebrow(model: RoleDashboardModel) {
  if (model.primaryModule === "vendor") return "Field operations";
  if (model.primaryModule === "inspector") return "Inspection workflow";
  if (model.primaryModule === "tenant") return "Resident workspace";
  if (model.primaryModule === "applicant") return "Renter workspace";
  if (model.primaryModule === "admin") return "Operations workspace";
  return model.accountLabel;
}

export function RoleDashboard({ model }: { model: RoleDashboardModel }) {
  const approvedTypes = model.access.accessRequests.filter((request) => request.status === "APPROVED");
  const pendingTypes = model.access.accessRequests.filter((request) => request.status === "PENDING");

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 lg:px-6">
        <CommandCenterHeader
          eyebrow={roleEyebrow(model)}
          title={model.headline}
          description={model.summary}
          actionHref={model.clarity.nextActionHref}
          actionLabel={model.clarity.nextActionCta}
          secondaryHref="/account/password"
          secondaryLabel="Account"
          icon={<span className="text-blue-700"><DashboardIcon name={headerIconByModule[model.primaryModule]} size={30} /></span>}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-slate-700 ring-1 ring-slate-200"><Layers3 size={14} /> {model.accountLabel}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase text-blue-700 ring-1 ring-blue-100"><BadgeCheck size={14} /> {pretty(model.role)}</span>
          {approvedTypes.length > 0 ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700 ring-1 ring-emerald-100">{approvedTypes.length} expanded access</span> : null}
        </div>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.metrics.map((metric) => <DashboardMetricCard key={metric.label} metric={metric} />)}
        </section>

        <CommandCenterSurface className="mt-5 bg-slate-950 text-white">
          <div className="p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-stretch">
              <div className="flex min-h-full flex-col rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">You are here</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">{model.clarity.currentFocus}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{model.clarity.roleGoal}</p>
                <div className="mt-auto pt-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Authorized modules</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {model.access.modules.map((module) => (
                      <span key={module} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase text-slate-100">{pretty(module)}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-blue-300/25 bg-blue-500/10 p-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100"><Zap size={14} /> Do this next</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">{model.clarity.nextActionTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-blue-50">{model.clarity.nextActionDetail}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link href={model.clarity.nextActionHref} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-blue-50">
                    {model.clarity.nextActionCta} <ArrowRight size={16} />
                  </Link>
                  <Link href="#needs-attention" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
                    Review Needs Attention
                  </Link>
                </div>
                <div className="mt-5 grid gap-2 md:grid-cols-3">
                  {model.clarity.followUpActions.map((action) => (
                    <Link key={`${action.title}-${action.href}`} href={action.href} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 hover:bg-white/[0.12]">
                      <p className="flex items-center gap-2 text-sm font-black text-white"><CheckCircle2 size={15} className="text-emerald-200" /> {action.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{action.detail}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CommandCenterSurface>

        <section id="needs-attention" className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Needs attention" detail="Role-specific actions based on data your account is authorized to see." count={`${model.needsAttention.length} items`}>
            <DashboardTaskList items={model.needsAttention} emptyTitle={model.emptyState.title} emptyDetail={model.emptyState.detail} />
          </Panel>

          <Link href={model.coherence.nextActionHref} className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Next best action</p>
            <h2 className="mt-3 text-2xl font-black leading-tight">{model.coherence.nextActionLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{model.coherence.primaryQuestion}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-100">Open Next Action <ArrowRight size={15} /></span>
          </Link>
        </section>

        <CommandCenterSurface className="mt-5">
          <div className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Workflow map</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">The same operating questions adapt to each role without exposing unauthorized tools.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{model.coherence.attentionTotal} urgent</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {model.coherence.areas.map((area) => (
                <Link key={area.key} href={area.href} className={`rounded-2xl border p-3 hover:bg-white ${areaTone(area.tone)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-black uppercase">{area.label}</p>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-black">{area.count}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-black leading-5">{area.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-80">{area.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </CommandCenterSurface>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel id="tools" title="Tools and shortcuts" detail="Only modules available to this role or approved account access are shown." count={`${model.tools.length} tools`}>
            <DashboardToolGrid tools={model.tools} />
          </Panel>
          <Panel id="activity" title="Recent activity" detail="Latest work signals from your authorized workspace scope.">
            <DashboardActivityFeed activity={model.activity} />
          </Panel>
        </section>

        <CommandCenterSurface className="mt-5">
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Account access</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Your workspace modules are based on role plus approved account access requests.</p>
              </div>
              <CommandCenterButton href="/account/password" icon={<LockKeyhole size={15} />}>Account security</CommandCenterButton>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <AccessTile label="Primary role" value={pretty(model.role)} detail={model.accountLabel} />
              <AccessTile label="Approved access" value={approvedTypes.length} detail={approvedTypes.length ? approvedTypes.map((request) => pretty(request.type)).join(", ") : "No expanded access approved"} />
              <AccessTile label="Pending access" value={pendingTypes.length} detail={pendingTypes.length ? pendingTypes.map((request) => pretty(request.type)).join(", ") : "No pending access requests"} />
            </div>
          </div>
        </CommandCenterSurface>
      </div>
    </main>
  );
}

function Panel({ id, title, detail, count, children }: { id?: string; title: string; detail: string; count?: string; children: ReactNode }) {
  return (
    <CommandCenterPanel id={id} title={title} detail={detail} badge={count}>
      {children}
    </CommandCenterPanel>
  );
}

function AccessTile({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
