import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { RoleDashboardItem } from "@/lib/dashboard/role-dashboard";

function taskTone(tone?: RoleDashboardItem["tone"]) {
  if (tone === "urgent") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-white text-slate-900";
}

export function DashboardTaskList({ items, emptyTitle, emptyDetail }: { items: RoleDashboardItem[]; emptyTitle: string; emptyDetail: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
        <p className="mt-3 font-black text-slate-950">{emptyTitle}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{emptyDetail}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
      {items.map((item) => (
        <Link key={`${item.title}-${item.href}`} href={item.href} className="grid gap-3 bg-white p-4 transition hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center">
          <span className="min-w-0">
            <span className="block truncate font-black text-slate-950">{item.title}</span>
            <span className="mt-1 block line-clamp-2 text-sm leading-6 text-slate-600">{item.detail}</span>
            {item.meta ? <span className="mt-1 block text-xs font-bold text-slate-500">{item.meta}</span> : null}
          </span>
          <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black uppercase ${taskTone(item.tone)}`}>{item.cta}</span>
        </Link>
      ))}
    </div>
  );
}
