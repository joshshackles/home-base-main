export const dynamic = "force-dynamic";

import Link from "next/link";
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock3, DatabaseBackup, PlayCircle, RefreshCcw, ServerCog, ShieldCheck, TriangleAlert } from "lucide-react";
import { captureSystemHealthAction, seedAutomationRulesAction, syncOperationalReadinessAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsLinkCard, OpsMetric, OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import { getOperationalIntelligenceSummary } from "@/lib/admin-ops";

function alertTone(severity: string) {
  if (severity === "CRITICAL") return "bg-rose-50 text-rose-800 border-rose-200";
  if (severity === "WARNING") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-blue-50 text-blue-800 border-blue-200";
}

function jobTone(status: string) {
  if (status === "FAILED" || status === "RETRYING") return "bg-rose-50 text-rose-800";
  if (status === "RUNNING" || status === "QUEUED") return "bg-blue-50 text-blue-800";
  if (status === "SUCCEEDED") return "bg-emerald-50 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminOperationsPage({ searchParams }: { searchParams?: { synced?: string; health?: string; rules?: string } }) {
  const summary = await getOperationalIntelligenceSummary();
  const { metrics } = summary;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Operational intelligence"
        title="Admin operations control center"
        description="Monitor deployment readiness, health snapshots, operational alerts, queue activity, automation scaffolds, backup freshness, and analytics capture from one control plane."
      />

      {searchParams?.synced ? <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Readiness alerts synced and a health snapshot was captured.</p> : null}
      {searchParams?.health ? <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">System health snapshot captured.</p> : null}
      {searchParams?.rules ? <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Default automation rule scaffolds are ready.</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OpsMetric label="Readiness" value={`${metrics.readinessScore}%`} detail="Environment and infrastructure" tone={metrics.readinessScore >= 85 ? "success" : metrics.readinessScore >= 65 ? "warning" : "danger"} />
        <OpsMetric label="Health score" value={metrics.latestHealthScore} detail="Latest captured snapshot" tone={metrics.latestHealthScore >= 85 ? "success" : metrics.latestHealthScore >= 65 ? "warning" : "danger"} />
        <OpsMetric label="Open alerts" value={metrics.openAlertCount} detail={`${metrics.criticalAlertCount} critical`} tone={metrics.criticalAlertCount > 0 ? "danger" : metrics.openAlertCount > 0 ? "warning" : "success"} />
        <OpsMetric label="Queue issues" value={metrics.failedJobCount} detail="Failed or retrying jobs" tone={metrics.failedJobCount > 0 ? "danger" : "success"} />
        <OpsMetric label="Automations" value={metrics.activeAutomationCount} detail="Active rule scaffolds" />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <OpsPanel
          title="Deployment readiness"
          eyebrow="Production checks"
          action={
            <form action={syncOperationalReadinessAction}>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700"><RefreshCcw size={16} /> Sync alerts</button>
            </form>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {summary.checks.map((check) => (
              <div key={check.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${check.ok ? "bg-emerald-100 text-emerald-700" : check.severity === "critical" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {check.ok ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-950">{check.label}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{check.detail}</p>
                    {check.actionHref ? <Link href={check.actionHref} className="mt-2 inline-flex text-xs font-black text-brand-700 hover:text-brand-900">{check.actionLabel || "Open"} →</Link> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel
          title="Control actions"
          eyebrow="Admin tools"
          action={
            <form action={captureSystemHealthAction}>
              <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Capture health</button>
            </form>
          }
        >
          <div className="grid gap-3">
            <OpsLinkCard href="/admin/backups" title="Backup and recovery" detail="Generate a backup, validate restore readiness, and review backup manifests." icon={<DatabaseBackup size={18} />} />
            <OpsLinkCard href="/admin/analytics" title="Analytics snapshots" detail="Capture and compare platform operating metrics over time." icon={<Activity size={18} />} />
            <OpsLinkCard href="/admin/audit" title="Audit explorer" detail="Review security, financial, recovery, and administrative changes." icon={<ShieldCheck size={18} />} />
            <form action={seedAutomationRulesAction}>
              <button className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm"><Bot size={18} /></span>
                <span><span className="block text-sm font-black text-slate-950">Seed automation scaffolds</span><span className="block text-xs font-semibold leading-5 text-slate-600">Create default alert/monitoring rule templates.</span></span>
              </button>
            </form>
          </div>
        </OpsPanel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <OpsPanel title="Operational alerts" eyebrow="Needs attention">
          <div className="space-y-3">
            {summary.alerts.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No operational alerts have been captured yet. Run readiness sync to populate the control center.</p> : summary.alerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border p-3 ${alertTone(alert.severity)}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black">{alert.title}</h3><span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">{alert.status}</span></div>
                    <p className="mt-1 text-xs font-semibold leading-5">{alert.message}</p>
                    {alert.actionHref ? <Link href={alert.actionHref} className="mt-2 inline-flex text-xs font-black underline underline-offset-4">{alert.actionLabel || "Open"}</Link> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Queue monitor" eyebrow="Background work">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Job</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Attempts</th><th className="px-3 py-2">Created</th></tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.queueJobs.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No queue jobs recorded yet. This monitor is ready for scheduled rent, autopay, backup, and webhook jobs.</td></tr> : summary.queueJobs.map((job) => (
                  <tr key={job.id}><td className="px-3 py-2 font-bold text-slate-950"><span className="block">{job.jobType}</span><span className="text-xs font-semibold text-slate-500">{job.queueName}</span></td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-black ${jobTone(job.status)}`}>{job.status}</span></td><td className="px-3 py-2 text-slate-700">{job.attempts}/{job.maxAttempts}</td><td className="px-3 py-2 text-xs text-slate-500">{job.createdAt.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsPanel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <OpsPanel title="Automation rules" eyebrow="Scaffolds">
          <div className="space-y-3">
            {summary.automationRules.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No automation scaffolds yet. Seed the recommended rules above to prepare alert routing and operational workflow automation.</p> : summary.automationRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950">{rule.name}</h3><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{rule.description || "No description yet."}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">{rule.status}</span></div>
                <p className="mt-2 text-xs font-mono text-slate-500">{rule.trigger} → {rule.action}</p>
              </div>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Recent health snapshots" eyebrow="Trend-ready">
          <div className="space-y-2">
            {summary.healthSnapshots.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No health snapshots yet. Capture one to establish an operational baseline.</p> : summary.healthSnapshots.map((snapshot) => (
              <div key={snapshot.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3"><div><p className="text-sm font-black text-slate-950">Score {snapshot.score}</p><p className="text-xs font-semibold text-slate-500">{snapshot.createdAt.toLocaleString()}</p></div><Clock3 size={18} className="text-slate-400" /></div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <OpsLinkCard href="/admin/branding" title="Branding previews" detail="Review public homepage, product identity, support settings, and launch toggles." icon={<ServerCog size={18} />} />
            <OpsLinkCard href="/admin/system" title="System configuration" detail="Check data import/export, environment, storage, version, and recommended commands." icon={<PlayCircle size={18} />} />
          </div>
        </OpsPanel>
      </section>
    </main>
  );
}
