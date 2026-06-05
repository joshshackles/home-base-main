export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  DatabaseBackup,
  KeyRound,
  LockKeyhole,
  PlugZap,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { getAdminCommandCenterModel, type AdminSeverity } from "@/lib/admin/command-center";
import { requireSuperUser } from "@/lib/admin/permissions";

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toneForSeverity(severity: AdminSeverity | string): "slate" | "blue" | "green" | "amber" | "rose" {
  if (severity === "critical" || severity === "CRITICAL") return "rose";
  if (severity === "warning" || severity === "WARNING") return "amber";
  if (severity === "success") return "green";
  return "blue";
}

export default async function PlatformOperationsPage() {
  const access = await requireSuperUser("/admin/platform-operations");
  const model = await getAdminCommandCenterModel(access);

  const healthWarnings = model.productionHealth.filter((check) => !check.ok);
  const superUserLabel = access.bootstrapMode ? "Bootstrap super user" : "Super user";

  return (
    <main className="space-y-5">
      <CommandCenterHeader
        eyebrow="Super Admin Operations"
        title="Platform Console"
        description="Protected operational home for platform health, security, audit, integrations, backup/recovery, sample data, and high-risk governance tools."
        actionHref="/admin/security"
        actionLabel="Security"
        secondaryHref="/admin"
        secondaryLabel="Admin Command Center"
        icon={<ShieldCheck className="text-blue-700" size={32} />}
      />

      <CommandCenterSurface className="bg-slate-950 text-white">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">
                <LockKeyhole size={14} />
                {superUserLabel}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">Generated {dateLabel(model.generatedAt)}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight">High-risk tools are separated from normal admin operations.</h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
              Use this console for platform-level review. Actions that alter security, sample data, backup/recovery, credentials, or audit posture should be reasoned, confirmed, and recorded by their source workflow.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <Link href="/admin/audit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100">
              Audit Logs
              <ArrowRight size={15} />
            </Link>
            <Link href="/admin/system" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-black text-white hover:bg-white/10">
              System Health
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </CommandCenterSurface>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CommandCenterMetric label="Health warnings" value={model.metrics.productionWarnings} detail="Environment and readiness checks" href="#platform-health" icon={<Activity size={20} />} tone={model.metrics.productionWarnings ? "amber" : "green"} />
        <CommandCenterMetric label="Security alerts" value={model.metrics.criticalSecurityAlerts} detail="Recent security and critical ops" href="#security-audit" icon={<ShieldAlert size={20} />} tone={model.metrics.criticalSecurityAlerts ? "rose" : "green"} />
        <CommandCenterMetric label="Integration failures" value={model.metrics.failedIntegrations} detail="Events, providers, queue signals" href="#integrations-api" icon={<PlugZap size={20} />} tone={model.metrics.failedIntegrations ? "rose" : "green"} />
        <CommandCenterMetric label="Sample records" value={model.metrics.sampleDataRecords} detail="Sample-like DB records" href="#recovery-governance" icon={<Database size={20} />} tone={model.metrics.sampleDataRecords ? "amber" : "green"} />
        <CommandCenterMetric label="Audit entries" value={model.metrics.recentAuditActivity} detail="Recent platform trail" href="#security-audit" icon={<ShieldCheck size={20} />} tone="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <CommandCenterPanel id="platform-health" title="Platform Health" detail="Review launch-readiness checks before touching recovery, security, or data operations." actionHref="/admin/system" actionLabel="Open system page">
          {healthWarnings.length ? (
            <div className="space-y-3">
              {healthWarnings.map((check) => (
                <OperationRow key={check.key} title={check.label} detail={check.detail} status={check.severity} tone={toneForSeverity(check.severity)} href={check.actionHref ?? "/admin/system"} />
              ))}
            </div>
          ) : (
            <EmptyState title="No platform health warnings" detail="The current readiness checks do not report blocking configuration warnings." />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="risky-actions" title="Risky Action Guardrails" detail="Super-admin tools should keep high-risk work visible, intentional, and auditable." badge="Protected">
          <div className="grid gap-3">
            <OperationRow title="Support impersonation" detail="Start and end impersonation only through workflows that capture reason, expiration, banner state, and audit events." status="Reason required" tone="amber" href="/admin/users" />
            <OperationRow title="API keys and webhooks" detail="Raw keys and signing secrets must never be shown after creation; use prefixes, scopes, revocation, and delivery logs." status="Secret-safe" tone="blue" href="/admin/integrations" />
            <OperationRow title="Recovery operations" detail="Backups and restore requests should remain metadata-governed unless production recovery infrastructure is explicitly configured." status="Confirm" tone="rose" href="/admin/backups" />
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CommandCenterPanel id="integrations-api" title="Integrations, API & Webhooks" detail="Provider status, API/webhook controls, diagnostics, and failed events belong in a single enterprise settings mental model." actionHref="/admin/integrations" actionLabel="Open integrations">
          <div className="grid gap-3 sm:grid-cols-2">
            <OperationTile icon={<PlugZap size={20} />} title="Provider health" detail={`${model.metrics.failedIntegrations} failure signal${model.metrics.failedIntegrations === 1 ? "" : "s"} across integration events, connections, or jobs.`} href="/admin/integrations" />
            <OperationTile icon={<KeyRound size={20} />} title="API keys" detail="Review scope, prefix, created by, last used, expiration, and revocation status without exposing raw keys." href="/admin/integrations#api-keys" />
            <OperationTile icon={<RotateCcw size={20} />} title="Webhook delivery" detail="Inspect delivery attempts, failed responses, retry timing, and signing-secret status." href="/admin/integrations#webhooks" />
            <OperationTile icon={<AlertTriangle size={20} />} title="Diagnostics" detail="Use failed events and provider health checks before assuming a workflow issue is user error." href="/admin/integrations#events" />
          </div>
        </CommandCenterPanel>

        <CommandCenterPanel id="security-audit" title="Security & Audit" detail="Security events, elevated accounts, and audit activity stay in the super-admin operations layer." actionHref="/admin/audit" actionLabel="Open audit logs">
          <div className="grid gap-3">
            {model.securityAlerts.length ? model.securityAlerts.slice(0, 4).map((event) => (
              <OperationRow key={event.id} title={label(event.type)} detail={`${event.message} · ${event.email ?? "No user email"} · ${dateLabel(event.createdAt)}`} status="Security event" tone="amber" href="/admin/security/events" />
            )) : <EmptyState title="No recent security events" detail="Security events will appear here when the platform records sensitive authentication, access, or administrative activity." />}
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CommandCenterPanel id="recovery-governance" title="Recovery & Data Governance" detail="Keep imports, exports, backups, restore requests, sample data, and data-quality repairs intentional and visible.">
          <div className="space-y-3">
            <OperationRow title="Backup and recovery" detail="Use snapshots, manifests, checksums, and import/export controls from the system and backup pages." status="Governed" tone="blue" href="/admin/backups" />
            <OperationRow title="Sample data" detail={model.sampleData.detail} status={model.sampleData.databaseRecordCount ? "Review" : "Clear"} tone={model.sampleData.databaseRecordCount ? "amber" : "green"} href="/admin/system#sample-data" />
            <OperationRow title="Data quality" detail={`${model.metrics.dataQualityIssues} data quality signal${model.metrics.dataQualityIssues === 1 ? "" : "s"} are currently surfaced in the normal admin command center.`} status="Triage" tone={model.metrics.dataQualityIssues ? "amber" : "green"} href="/admin#data-quality" />
          </div>
        </CommandCenterPanel>

        <CommandCenterPanel id="operations-map" title="Platform Operations Map" detail="Super admins can still open normal admin workflows, but platform-only tools stay grouped here.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <OperationTile icon={<UsersRound size={20} />} title="Users and access" detail="Review elevated accounts, access requests, and role visibility." href="/admin/users" />
            <OperationTile icon={<DatabaseBackup size={20} />} title="Backups" detail="Open backup snapshots, exports, and restore request metadata." href="/admin/backups" />
            <OperationTile icon={<ShieldCheck size={20} />} title="Security" detail="Open security checklist and sensitive events." href="/admin/security" />
            <OperationTile icon={<Activity size={20} />} title="Queue and jobs" detail="Review admin queue jobs and operational readiness alerts." href="/admin/operations" />
            <OperationTile icon={<Sparkles size={20} />} title="Feature flags" detail="Review system, branding, and launch controls where currently configured." href="/admin/system" />
            <OperationTile icon={<Database size={20} />} title="Audit trail" detail="Search actor, entity, message, and action history." href="/admin/audit" />
          </div>
        </CommandCenterPanel>
      </section>
    </main>
  );
}

function OperationTile({ icon, title, detail, href }: { icon: ReactNode; title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">{icon}</span>
        <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-700" />
      </div>
      <p className="mt-3 font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{detail}</p>
    </Link>
  );
}

function OperationRow({ title, detail, status, tone, href }: { title: string; detail: string; status: string; tone: "slate" | "blue" | "green" | "amber" | "rose"; href: string }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700"
  }[tone];

  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${toneClass}`}>{status}</span>
      </div>
    </Link>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
    </div>
  );
}
