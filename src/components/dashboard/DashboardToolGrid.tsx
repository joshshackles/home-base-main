import Link from "next/link";
import type { RoleDashboardTool } from "@/lib/dashboard/role-dashboard";
import { DashboardIcon } from "@/components/dashboard/dashboard-icons";

export function DashboardToolGrid({ tools }: { tools: RoleDashboardTool[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => (
        <Link key={`${tool.module}-${tool.href}-${tool.title}`} href={tool.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <DashboardIcon name={tool.icon} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-black text-slate-950">{tool.title}</p>
              <p className="mt-0.5 text-[11px] font-black uppercase text-slate-500">{tool.module}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{tool.detail}</p>
        </Link>
      ))}
    </div>
  );
}
