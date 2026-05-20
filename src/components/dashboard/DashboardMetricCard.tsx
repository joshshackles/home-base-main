import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { RoleDashboardMetric } from "@/lib/dashboard/role-dashboard";
import { DashboardIcon } from "@/components/dashboard/dashboard-icons";

function toneClass(tone: RoleDashboardMetric["tone"] = "slate") {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-950";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-950";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-950";
  return "border-slate-200 bg-white text-slate-950";
}

export function DashboardMetricCard({ metric }: { metric: RoleDashboardMetric }) {
  return (
    <Link href={metric.href} className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white ${toneClass(metric.tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">
          <DashboardIcon name={metric.icon} />
        </span>
        <ArrowUpRight size={16} className="opacity-60" />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-70">{metric.label}</p>
      <p className="mt-1 truncate text-3xl font-black">{metric.value}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold opacity-80">{metric.detail}</p>
    </Link>
  );
}
