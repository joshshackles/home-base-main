import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, Inbox, Plus, Search } from "lucide-react";

type Tone = "slate" | "blue" | "green" | "amber" | "red";

const toneClasses: Record<Tone, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700"
};

export function AppCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[var(--hb-radius)] border border-slate-200 bg-white p-[var(--hb-card-padding)] shadow-sm ${className}`}>{children}</section>;
}

export function SectionHeader({ title, detail, action, count }: { title: string; detail?: string; action?: ReactNode; count?: string | number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black tracking-tight text-slate-950">{title}</h2>
          {count !== undefined ? <StatusBadge tone="slate">{count}</StatusBadge> : null}
        </div>
        {detail ? <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricTile({ label, value, detail, href, tone = "blue" }: { label: string; value: ReactNode; detail?: string; href?: string; tone?: Tone }) {
  const body = (
    <div className="h-full rounded-[var(--hb-radius)] border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
        {href ? <ArrowUpRight size={15} className="text-slate-400" /> : null}
      </div>
      <p className={`mt-2 truncate text-2xl font-black ${tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-slate-950"}`}>{value}</p>
      {detail ? <p className="mt-1 truncate text-xs font-semibold text-slate-500">{detail}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function StatusBadge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${toneClasses[tone]}`}>{children}</span>;
}

export function statusLabel(value: string | null | undefined) {
  if (!value) return "Not Started";
  const labels: Record<string, string> = {
    STARTED: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    DENIED: "Denied",
    WITHDRAWN: "Withdrawn",
    DRAFT: "Draft",
    ACTIVE: "Active",
    PAUSED: "Paused",
    ARCHIVED: "Archived",
    NEW: "New",
    CONTACTED: "Replied",
    APPLICATION_STARTED: "Application Started",
    OPEN: "Open",
    WAITING_ON_STAFF: "Needs Reply",
    WAITING_ON_APPLICANT: "Waiting on Applicant",
    CLOSED: "Closed",
    IN_PROGRESS: "In Progress",
    WAITING_ON_TENANT: "Waiting on Tenant",
    WAITING_ON_VENDOR: "Waiting on Vendor",
    COMPLETED: "Completed",
    SCHEDULED: "Scheduled",
    PASSED: "Passed",
    FAILED: "Failed",
    NEEDS_REINSPECTION: "Reinspection Needed",
    PENDING: "Pending",
    DECLINED: "Denied",
    CANCELLED: "Cancelled",
    HEALTHY: "Healthy",
    WARNING: "Warning",
    CRITICAL: "Critical",
    BLOCKED: "Blocked",
    ERROR: "Error",
    CONNECTED: "Connected",
    CONFIGURED: "Configured",
    NOT_CONFIGURED: "Not Configured",
    DISABLED: "Disabled",
    SUCCESS: "Success",
    SKIPPED: "Skipped"
  };
  return labels[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(value: string | null | undefined): Tone {
  if (!value) return "slate";
  if (["APPROVED", "ACTIVE", "PASSED", "COMPLETED", "SIGNED", "CONNECTED", "CONFIGURED", "SUCCESS", "HEALTHY"].includes(value)) return "green";
  if (["SUBMITTED", "UNDER_REVIEW", "OPEN", "IN_PROGRESS", "SCHEDULED", "APPLICATION_STARTED", "WAITING_ON_APPLICANT"].includes(value)) return "blue";
  if (["PENDING", "WAITING_ON_STAFF", "WAITING_ON_TENANT", "WAITING_ON_VENDOR", "NEEDS_REINSPECTION", "WARNING", "PAUSED", "DRAFT", "STARTED", "NOT_CONFIGURED", "SKIPPED"].includes(value)) return "amber";
  if (["DENIED", "DECLINED", "FAILED", "ERROR", "CRITICAL", "BLOCKED", "CANCELLED", "VOIDED", "EXPIRED", "ARCHIVED", "DISABLED"].includes(value)) return "red";
  return "slate";
}

export function WorkflowStatusBadge({ status, className = "" }: { status: string | null | undefined; className?: string }) {
  return <span className={className}><StatusBadge tone={statusTone(status)}>{statusLabel(status)}</StatusBadge></span>;
}

export function QuickActionButton({ href, children, icon = <Plus size={15} /> }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700">{icon}{children}</Link>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-[var(--hb-radius)] border border-slate-200 bg-white p-2 shadow-sm">{children}</div>;
}

export function EmptyState({ title, detail, action, icon }: { title: string; detail: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--hb-radius)] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">{icon ?? <Inbox size={24} />}</div>
      <h3 className="mt-3 text-base font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProductPageHeader({ eyebrow, title, description, actionHref, actionLabel, secondaryHref, secondaryLabel }: { eyebrow?: string; title: string; description: string; actionHref?: string; actionLabel?: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <header className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        </div>
        {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {secondaryHref && secondaryLabel ? <Link href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-900 hover:bg-slate-50">{secondaryLabel}</Link> : null}
            {actionHref && actionLabel ? <Link href={actionHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">{actionLabel}<ArrowRight size={15} /></Link> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function FirstRunChecklist({ title, detail, items, actionHref, actionLabel }: { title: string; detail: string; items: string[]; actionHref: string; actionLabel: string }) {
  return (
    <section className="rounded-[var(--hb-radius)] border border-blue-200 bg-blue-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">First run</p>
          <h2 className="mt-2 text-xl font-black text-blue-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">{detail}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map((item) => <p key={item} className="flex items-start gap-2 text-sm font-bold text-blue-950"><CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={16} />{item}</p>)}
          </div>
        </div>
        <Link href={actionHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">{actionLabel}<ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}

export function CompactTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-[var(--hb-radius)] border border-slate-200 bg-white"><table className="min-w-full divide-y divide-slate-100 text-sm">{children}</table></div>;
}

export function ActivityTimeline({ items }: { items: Array<{ title: string; detail?: string; tone?: Tone; href?: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const row = (
          <div className="flex gap-3 rounded-[var(--hb-radius)] border border-slate-200 bg-white p-3">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === "green" ? "bg-emerald-500" : item.tone === "amber" ? "bg-amber-500" : item.tone === "red" ? "bg-red-500" : "bg-blue-600"}`} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
              {item.detail ? <span className="block truncate text-xs text-slate-600">{item.detail}</span> : null}
            </span>
          </div>
        );
        return item.href ? <Link key={`${item.title}-${item.href}`} href={item.href}>{row}</Link> : <div key={item.title}>{row}</div>;
      })}
    </div>
  );
}

export function SystemTabs({ tabs }: { tabs: Array<{ href: string; label: string; active?: boolean }> }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1">
      {tabs.map((tab) => <Link key={tab.href} href={tab.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black ${tab.active ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white/70"}`}>{tab.label}</Link>)}
    </nav>
  );
}

export function DrawerPanel({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="rounded-[var(--hb-radius)] border border-slate-200 bg-white p-3 shadow-sm"><SectionHeader title={title} /> <div className="mt-3">{children}</div></aside>;
}

export function DataGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-[var(--hb-gap)] sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function CommandPalette({ compact = false, actions = [
  { label: "Create unit", href: "/landlord/rentals/new" },
  { label: "Assign tenant", href: "/landlord/applications" },
  { label: "Send message", href: "/landlord/inbox" },
  { label: "Collect payment", href: "/landlord/payments" },
  { label: "Open ledger", href: "/landlord/ledger" }
] }: { compact?: boolean; actions?: Array<{ label: string; href: string }> }) {
  return (
    <div className={`${compact ? "block" : "hidden lg:block"} rounded-xl border border-slate-700 bg-slate-900 p-2 text-white shadow-xl`}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
        <Search size={14} />
        <span className="font-semibold">Command palette</span>
        <kbd className="ml-auto rounded border border-slate-700 px-1.5 py-0.5 text-[10px]">Cmd K</kbd>
      </div>
      <div className="mt-2 grid gap-1">
        {actions.map((action) => <Link key={`${action.label}-${action.href}`} href={action.href} className="rounded-lg px-3 py-1.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800">{action.label}</Link>)}
      </div>
    </div>
  );
}
