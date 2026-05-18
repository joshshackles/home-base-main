import Link from "next/link";
import type { LedgerEntryStatus, LedgerEntryType } from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import { ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";

export type LedgerMetric = {
  label: string;
  value: string;
  detail?: string;
  href?: string;
  tone?: "slate" | "emerald" | "amber" | "rose" | "brand";
};

const metricToneClass: Record<NonNullable<LedgerMetric["tone"]>, string> = {
  slate: "text-slate-950 bg-white ring-slate-200",
  emerald: "text-emerald-800 bg-emerald-50 ring-emerald-200",
  amber: "text-amber-800 bg-amber-50 ring-amber-200",
  rose: "text-rose-800 bg-rose-50 ring-rose-200",
  brand: "text-brand-800 bg-brand-50 ring-brand-200"
};

export function LedgerMetricGrid({ metrics }: { metrics: LedgerMetric[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const body = (
          <>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
            <p className={`mt-1 text-2xl font-black leading-none ${metric.tone === "emerald" ? "text-emerald-700" : metric.tone === "rose" ? "text-rose-700" : metric.tone === "amber" ? "text-amber-700" : "text-slate-950"}`}>{metric.value}</p>
            {metric.detail ? <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metric.detail}</p> : null}
          </>
        );
        const className = `rounded-2xl p-4 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${metricToneClass[metric.tone ?? "slate"]}`;
        return metric.href ? <Link key={metric.label} href={metric.href} className={className}>{body}</Link> : <div key={metric.label} className={className}>{body}</div>;
      })}
    </section>
  );
}

export function LedgerStatusPill({ status }: { status: LedgerEntryStatus }) {
  const className = status === "VOIDED"
    ? "bg-rose-50 text-rose-700 ring-rose-200"
    : status === "PENDING"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide ring-1 ${className}`}>{ledgerStatusLabel(status)}</span>;
}

export function LedgerTypePill({ type }: { type: LedgerEntryType }) {
  const className = type === "PAYMENT" || type === "CREDIT" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-700 ring-slate-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide ring-1 ${className}`}>{ledgerTypeLabel(type)}</span>;
}

export function LedgerQuickLinks({ links }: { links: Array<{ href: string; label: string; primary?: boolean }> }) {
  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Ledger actions">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={link.primary ? "shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700" : "shrink-0 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"}>{link.label}</Link>
      ))}
    </nav>
  );
}

export function LedgerAmount({ amount, isCredit, muted = false }: { amount: number; isCredit: boolean; muted?: boolean }) {
  return <span className={`font-black ${muted ? "text-slate-400 line-through" : isCredit ? "text-emerald-700" : "text-slate-950"}`}>{formatCurrency(Math.abs(amount))}</span>;
}
