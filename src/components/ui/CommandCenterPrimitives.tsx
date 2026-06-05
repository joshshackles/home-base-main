import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2 } from "lucide-react";

type CommandCenterHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  icon?: ReactNode;
  className?: string;
};

export function CommandCenterSurface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${className}`}>
      {children}
    </section>
  );
}

export function CommandCenterHeader({
  eyebrow = "Workspace",
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  icon,
  className = ""
}: CommandCenterHeaderProps) {
  return (
    <CommandCenterSurface className={className}>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-blue-100 via-white to-emerald-100 shadow-sm sm:h-20 sm:w-24">
            {icon ?? <Building2 className="text-blue-700" size={30} />}
          </div>
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p> : null}
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {description ? <p className="mt-1 line-clamp-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{description}</p> : null}
          </div>
        </div>
        {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryHref && secondaryLabel ? <CommandCenterButton href={secondaryHref}>{secondaryLabel}</CommandCenterButton> : null}
            {actionHref && actionLabel ? <CommandCenterButton href={actionHref} primary>{actionLabel}</CommandCenterButton> : null}
          </div>
        ) : null}
      </div>
    </CommandCenterSurface>
  );
}

export function CommandCenterButton({ href, children, primary = false, icon }: { href: string; children: ReactNode; primary?: boolean; icon?: ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        primary ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
      {!icon ? <ArrowRight size={15} /> : null}
    </Link>
  );
}

export function CommandCenterPanel({
  id,
  title,
  detail,
  actionHref,
  actionLabel,
  badge,
  children,
  className = ""
}: {
  id?: string;
  title: string;
  detail?: string;
  actionHref?: string;
  actionLabel?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          {detail ? <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{detail}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {badge ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{badge}</span> : null}
          {actionHref && actionLabel ? <Link href={actionHref} className="text-sm font-black text-blue-700 hover:text-blue-900">{actionLabel}</Link> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CommandCenterMetric({ label, value, detail, href, icon, tone = "slate" }: { label: string; value: ReactNode; detail?: string; href?: string; icon?: ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "rose" }) {
  const text = {
    slate: "text-slate-950",
    blue: "text-blue-900",
    green: "text-emerald-900",
    amber: "text-amber-900",
    rose: "text-rose-900"
  }[tone];
  const iconClass = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700"
  }[tone];
  const content = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-500">{label}</p>
          <p className={`mt-1 truncate text-2xl font-black ${text}`}>{value}</p>
          {detail ? <p className="mt-1 truncate text-xs font-semibold text-slate-500">{detail}</p> : null}
        </div>
        {icon ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span> : null}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
