import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

export function OpsMetric({ label, value, detail, tone = "default" }: { label: string; value: string | number; detail?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    danger: "border-rose-200 bg-rose-50 text-rose-950"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}

export function OpsPanel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function OpsLinkCard({ href, title, detail, icon }: { href: string; title: string; detail: string; icon?: ReactNode }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">{icon}</span>
        <ArrowUpRight size={16} className="text-slate-400 group-hover:text-brand-700" />
      </div>
      <h3 className="mt-3 text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{detail}</p>
    </Link>
  );
}
