import Link from "next/link";
import { Activity } from "lucide-react";
import type { RoleDashboardActivity } from "@/lib/dashboard/role-dashboard";

function dotTone(tone: RoleDashboardActivity["tone"] = "slate") {
  if (tone === "red") return "bg-red-100 text-red-800";
  if (tone === "amber") return "bg-amber-100 text-amber-900";
  if (tone === "green") return "bg-emerald-100 text-emerald-800";
  if (tone === "blue") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

export function DashboardActivityFeed({ activity }: { activity: RoleDashboardActivity[] }) {
  if (activity.length === 0) return <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">No recent activity yet. New messages, applications, maintenance updates, and system events will appear here when work starts.</p>;

  return (
    <div className="space-y-2">
      {activity.slice(0, 8).map((item) => (
        <Link key={`${item.href}-${item.title}-${item.detail}`} href={item.href} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${dotTone(item.tone)}`}>
            <Activity size={15} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
            <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{item.detail}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
