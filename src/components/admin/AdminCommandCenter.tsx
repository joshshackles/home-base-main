import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Database, DatabaseBackup, LockKeyhole, PlugZap, ShieldAlert, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";
import { reviewAccountAccessAction } from "@/app/account/actions";
import { captureSystemHealthAction, syncOperationalReadinessAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsMetric, OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import type { AdminCommandCenterIssue, AdminCommandCenterModel, AdminSeverity } from "@/lib/admin/command-center";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeClass(severity: AdminSeverity | string) {
  if (severity === "critical" || severity === "CRITICAL") return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "warning" || severity === "WARNING") return "border-amber-200 bg-amber-50 text-amber-900";
  if (severity === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <CheckCircle2 className="mx-auto text-slate-400" size={24} />
      <h3 className="mt-3 font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function IssueList({ issues }: { issues: AdminCommandCenterIssue[] }) {
  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <Link key={issue.key} href={issue.href} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-950">{issue.title}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${badgeClass(issue.severity)}`}>{issue.severity}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{issue.detail}</p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:min-w-[140px]">
              <span className="text-2xl font-black text-slate-950">{issue.count}</span>
              <span className="inline-flex items-center gap-1 text-sm font-black text-brand-700">{issue.actionLabel}<ArrowRight size={14} /></span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AccessRequestsPanel({ model }: { model: AdminCommandCenterModel }) {
  return (
    <OpsPanel title="Access Requests" eyebrow="Permission queue">
      {model.accessRequests.length === 0 ? (
        <EmptyState title="Access requests are clear" detail="New role or account-access requests are listed here for admin review." />
      ) : (
        <div className="space-y-3">
          {model.accessRequests.map((request) => {
            const elevated = request.type === "ADMIN" || request.type === "SUPER_USER";
            const canReview = !elevated || model.access.isSuperUser;
            return (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{request.user.name || request.user.email}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${elevated ? "border-rose-200 bg-rose-50 text-rose-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{label(request.type)}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">{label(request.user.role)}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-600">{request.user.email}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{request.reason || "No reason provided."}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{request.organization || "No organization"} - requested {dateLabel(request.createdAt)}</p>
                  </div>
                  {canReview ? (
                    <div className="grid min-w-[220px] gap-2">
                      <form action={reviewAccountAccessAction} className="flex gap-2">
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <input type="hidden" name="reviewNote" value="Approved from Admin Command Center." />
                        <button className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700">Approve</button>
                      </form>
                      <form action={reviewAccountAccessAction} className="flex gap-2">
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="DECLINED" />
                        <input type="hidden" name="reviewNote" value="Declined from Admin Command Center." />
                        <button className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Decline</button>
                      </form>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Super user required to review elevated access.</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </OpsPanel>
  );
}

function ProductionHealthPanel({ model }: { model: AdminCommandCenterModel }) {
  return (
    <OpsPanel
      title="Production Health"
      eyebrow="Safe configuration view"
      action={
        model.access.isSuperUser ? (
          <div className="flex flex-wrap gap-2">
            <form action={syncOperationalReadinessAction}><button className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white hover:bg-brand-700">Sync alerts</button></form>
            <form action={captureSystemHealthAction}><button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Capture health</button></form>
          </div>
        ) : null
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {model.productionHealth.map((check) => (
          <div key={check.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${check.ok ? "bg-emerald-100 text-emerald-700" : check.severity === "critical" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                {check.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-950">{check.label}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${check.ok ? badgeClass("success") : badgeClass(check.severity)}`}>{check.ok ? "Healthy" : check.severity}</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{check.detail}</p>
                {check.actionHref ? <Link href={check.actionHref} className="mt-2 inline-flex text-xs font-black text-brand-700 hover:text-brand-900">{check.actionLabel || "Open"} <ArrowRight size={13} /></Link> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </OpsPanel>
  );
}

function SampleDataPanel({ model }: { model: AdminCommandCenterModel }) {
  return (
    <OpsPanel title="Sample Data Controls" eyebrow="Super-user safety">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">{model.sampleData.databaseRecordCount > 0 ? "Sample-like records detected" : "No sample-like database records detected"}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{model.sampleData.detail}</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Sample payload: {model.sampleData.payloadAvailable ? "Available" : "Missing"}</p>
          </div>
          {model.access.isSuperUser ? (
            <a href="/admin/system/sample-data" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">
              <DatabaseBackup size={15} />
              Download sample payload
            </a>
          ) : (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900">Super user only</span>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <OpsMetric label="Detected sample DB records" value={model.sampleData.databaseRecordCount} detail="IDs or emails matching sample markers" tone={model.sampleData.databaseRecordCount > 0 ? "warning" : "success"} />
          <OpsMetric label="Payload tables" value={Object.keys(model.sampleData.payloadRecordCounts).length} detail="Downloadable sample sections" />
          <OpsMetric label="Cleanup control" value={model.sampleData.cleanupAvailable ? "Enabled" : "Disabled"} detail="Disabled until sample records are fully tagged" tone="warning" />
        </div>
      </div>
    </OpsPanel>
  );
}

function SecurityPanel({ model }: { model: AdminCommandCenterModel }) {
  if (!model.access.isSuperUser) {
    return (
      <OpsPanel title="Security Alerts" eyebrow="Super-user protected">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
          Security events, elevated user grants, and sensitive audit detail are only shown to platform super users.
        </div>
      </OpsPanel>
    );
  }

  return (
    <OpsPanel title="Security Alerts" eyebrow="Sensitive operations">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase text-slate-500">Recent security events</h3>
          {model.securityAlerts.length === 0 ? <EmptyState title="No security events in this view" detail="Recent security alerts are listed here when the audit stream records a relevant event." /> : model.securityAlerts.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <ShieldAlert size={17} className="mt-0.5 text-amber-600" />
                <div>
                  <p className="text-sm font-black text-slate-950">{label(event.type)}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{event.message}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{event.email || "No email"} - {dateLabel(event.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase text-slate-500">Elevated users</h3>
          {model.elevatedUsers.length === 0 ? <EmptyState title="No elevated users in this view" detail="Admin and super-user assignments are listed here when present." /> : model.elevatedUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="font-black text-slate-950">{user.name || user.email}</p>
              <p className="text-sm font-bold text-slate-600">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">{label(user.role)}</span>
                {user.elevatedAccess.map((type) => <span key={`${user.id}-${type}`} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black uppercase text-rose-700">{label(type)}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </OpsPanel>
  );
}

function OperationsDirectory({ model }: { model: AdminCommandCenterModel }) {
  const sections = [
    { href: "#access-requests", title: "Access requests", detail: "Review pending landlord, vendor, inspector, caseworker, admin, and super-user requests.", count: model.metrics.pendingAccessRequests, icon: <Users size={18} /> },
    { href: "#data-quality", title: "Data quality", detail: "Open missing listing details, incomplete profiles, orphan context, and setup cleanup queues.", count: model.metrics.dataQualityIssues, icon: <Database size={18} /> },
    { href: "#payment-operations", title: "Payment operations", detail: "Review Stripe setup, platform fees, webhooks, failed transactions, and revenue risk.", count: model.metrics.paymentOperations, icon: <Activity size={18} /> },
    { href: "#blocked-workflows", title: "Blocked workflows", detail: "Find stuck applications, leases, messages, maintenance, inspections, and tasks.", count: model.metrics.blockedWorkflows, icon: <Wrench size={18} /> },
    { href: "#failed-integrations", title: "Integrations", detail: "Diagnose failed syncs, disabled providers, failed jobs, and connection errors.", count: model.metrics.failedIntegrations, icon: <PlugZap size={18} /> },
    { href: "#production-health", title: "Production health", detail: "Review safe environment, storage, cron, runtime, and deployment readiness checks.", count: model.metrics.productionWarnings, icon: <Activity size={18} /> },
    { href: "#sample-data", title: "Sample data", detail: "Check demo payload availability and sample-like records before production use.", count: model.metrics.sampleDataRecords, icon: <DatabaseBackup size={18} /> },
    { href: "#security", title: "Security", detail: "Inspect recent security events, elevated users, and super-user-only controls.", count: model.metrics.criticalSecurityAlerts, icon: <ShieldAlert size={18} /> },
    { href: "#audit-logs", title: "Audit logs", detail: "Review recent platform trail entries without leaving the command center.", count: model.metrics.recentAuditActivity, icon: <ShieldCheck size={18} /> }
  ];

  return (
    <section id="operations-directory" className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">Authoritative operations map</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Start with the highest-risk operational queues.</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Use these sections for triage, then open drilldowns or source tools when action is needed.</p>
        </div>
        <Link href="/admin/command-center/drilldowns?key=applications-waiting-review" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
          Open a drilldown
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">{section.icon}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${section.count > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{section.count}</span>
            </div>
            <h3 className="mt-3 font-black text-slate-950">{section.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{section.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdminCommandCenter({ model }: { model: AdminCommandCenterModel }) {
  const superText = model.access.isSuperUser ? (model.access.bootstrapMode ? "Bootstrap super user" : "Super user") : "Admin";

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Platform operations"
        title="Admin Command Center"
        description="Review access requests, data quality, failed integrations, blocked workflows, production health, security alerts, and audit activity from one admin hub."
      />

      <section className="mb-5 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase"><LockKeyhole size={14} /> {superText}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">Generated {dateLabel(model.generatedAt)}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black">Operations needing attention are prioritized first.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Normal admins can use the command center for visibility. Super-user-only sections protect security events, elevated access, sample payload controls, and sensitive platform operations.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
            <Link href="/admin/operations" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100"><Activity size={15} /> Operations</Link>
            <Link href="/admin/security" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10"><ShieldCheck size={15} /> Security</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric label="Pending access" value={model.metrics.pendingAccessRequests} detail="Role and account access requests" tone={model.metrics.pendingAccessRequests > 0 ? "warning" : "success"} />
        <OpsMetric label="Security alerts" value={model.metrics.criticalSecurityAlerts} detail="Recent security events and critical ops alerts" tone={model.metrics.criticalSecurityAlerts > 0 ? "danger" : "success"} />
        <OpsMetric label="Failed integrations" value={model.metrics.failedIntegrations} detail="Failed sync, webhook, connection, or queue signals" tone={model.metrics.failedIntegrations > 0 ? "danger" : "success"} />
        <OpsMetric label="Blocked workflows" value={model.metrics.blockedWorkflows} detail="Applications, messages, leases, inspections, tasks" tone={model.metrics.blockedWorkflows > 0 ? "warning" : "success"} />
        <OpsMetric label="Data quality issues" value={model.metrics.dataQualityIssues} detail="Records needing cleanup or completion" tone={model.metrics.dataQualityIssues > 0 ? "warning" : "success"} />
        <OpsMetric label="Payment operations" value={model.metrics.paymentOperations} detail="Stripe setup, webhook, fee, and transaction risk" tone={model.metrics.paymentOperations > 0 ? "warning" : "success"} />
        <OpsMetric label="Production warnings" value={model.metrics.productionWarnings} detail="Environment and readiness checks" tone={model.metrics.productionWarnings > 0 ? "warning" : "success"} />
        <OpsMetric label="Sample records" value={model.metrics.sampleDataRecords} detail="Detected sample-like DB records" tone={model.metrics.sampleDataRecords > 0 ? "warning" : "success"} />
        <OpsMetric label="Audit activity" value={model.metrics.recentAuditActivity} detail="Recent platform audit entries" />
      </section>

      <OperationsDirectory model={model} />

      <section id="access-requests" className="mt-5 scroll-mt-24 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <AccessRequestsPanel model={model} />
        <OpsPanel title="Admin Quick Actions" eyebrow="Command shortcuts">
          <div className="grid gap-3">
            {model.quickActions.map((action) => {
              const locked = action.superUserOnly && !model.access.isSuperUser;
              return locked ? (
                <div key={action.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70">
                  <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 text-slate-400" size={18} /><div><h3 className="font-black text-slate-950">{action.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p><p className="mt-2 text-xs font-black uppercase text-amber-700">Super user only</p></div></div>
                </div>
              ) : (
                <Link key={action.title} href={action.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{action.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p></div><ArrowRight className="shrink-0 text-brand-700" size={18} /></div>
                </Link>
              );
            })}
          </div>
        </OpsPanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="data-quality" className="scroll-mt-24">
        <OpsPanel title="Data Quality" eyebrow="Cleanup queue">
          <IssueList issues={model.dataQuality} />
        </OpsPanel>
        </div>
        <div id="payment-operations" className="scroll-mt-24">
        <OpsPanel title="Payment Operations" eyebrow="Stripe and fee readiness">
          <IssueList issues={model.paymentOperations} />
        </OpsPanel>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="blocked-workflows" className="scroll-mt-24">
        <OpsPanel title="Blocked Workflows" eyebrow="Stuck work">
          <IssueList issues={model.blockedWorkflows} />
        </OpsPanel>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="failed-integrations" className="scroll-mt-24">
        <OpsPanel title="Failed Integrations" eyebrow="Real connection health">
          <IssueList issues={model.failedIntegrations} />
        </OpsPanel>
        </div>
        <div id="operational-alerts" className="scroll-mt-24">
        <OpsPanel title="Operational Alerts" eyebrow="Platform warnings">
          <div className="space-y-3">
            {model.operationalAlerts.length === 0 ? <EmptyState title="No operational alerts" detail="Run readiness sync or review source tools when you want to refresh environment, queue, and workflow alert status." /> : model.operationalAlerts.map((alert) => (
              <Link key={alert.id} href={alert.actionHref || "/admin/operations"} className={`block rounded-2xl border p-4 ${badgeClass(alert.severity)}`}>
                <div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{alert.title}</h3><span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase">{alert.status}</span></div><p className="mt-1 text-sm leading-6">{alert.message}</p><p className="mt-2 text-xs font-black uppercase">{alert.source} - {dateLabel(alert.createdAt)}</p></div></div>
              </Link>
            ))}
          </div>
        </OpsPanel>
        </div>
      </section>

      <section id="production-health" className="mt-5 scroll-mt-24">
        <ProductionHealthPanel model={model} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="sample-data" className="scroll-mt-24">
        <SampleDataPanel model={model} />
        </div>
        <div id="security" className="scroll-mt-24">
        <SecurityPanel model={model} />
        </div>
      </section>

      <section id="audit-logs" className="mt-5 scroll-mt-24 grid gap-5 xl:grid-cols-2">
        <OpsPanel title="Recent Audit Activity" eyebrow="Platform trail">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Record</th><th className="px-3 py-2">Time</th></tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {model.auditActivity.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No audit activity recorded yet.</td></tr> : model.auditActivity.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-3 py-2"><span className="block font-bold text-slate-950">{event.actorEmail || "System"}</span><span className="text-xs text-slate-500">{event.actorRole ? label(event.actorRole) : "No role"}</span></td>
                    <td className="px-3 py-2 font-bold text-slate-700">{label(event.action)}</td>
                    <td className="px-3 py-2"><span className="block font-bold text-slate-950">{event.entityType}</span><span className="line-clamp-1 text-xs text-slate-500">{event.message}</span></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{dateLabel(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsPanel>

        <OpsPanel title="Operations Map" eyebrow="What is connected">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Users className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Users and access</h3><p className="mt-1 text-sm leading-6 text-slate-600">Pending requests, elevated grants, role visibility, and user actions.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Database className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Data quality</h3><p className="mt-1 text-sm leading-6 text-slate-600">Listing, profile, maintenance, message, and setup completeness checks.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><PlugZap className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Integrations</h3><p className="mt-1 text-sm leading-6 text-slate-600">Connections, events, queue failures, diagnostics, and disabled providers.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Wrench className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Workflows</h3><p className="mt-1 text-sm leading-6 text-slate-600">Applications, leases, messages, inspections, maintenance, and tasks.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><ShieldCheck className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Security</h3><p className="mt-1 text-sm leading-6 text-slate-600">Security events, elevated users, audit trail, and protected platform controls.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Sparkles className="text-brand-700" size={20} /><h3 className="mt-3 font-black text-slate-950">Launch readiness</h3><p className="mt-1 text-sm leading-6 text-slate-600">Safe health labels without exposing secrets or raw environment values.</p></div>
          </div>
        </OpsPanel>
      </section>
    </main>
  );
}
