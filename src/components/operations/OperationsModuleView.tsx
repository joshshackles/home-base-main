import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { titleCase, money } from "@/lib/operations/modules";

type Metric = { label: string; value: string | number; tone?: "good" | "warn" | "neutral" };
type Row = { title: string; subtitle?: string | null; meta?: string | null; status?: string | null; href?: string };

function StatCard({ metric }: { metric: Metric }) {
  const tone = metric.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : metric.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-900";
  return <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}><div className="text-2xl font-black">{metric.value}</div><div className="mt-1 text-xs font-black uppercase tracking-wide opacity-70">{metric.label}</div></div>;
}

function ModuleSection({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.length ? rows.map((row, index) => (
          <div key={`${row.title}-${index}`} className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{row.status?.includes("ERROR") || row.status?.includes("EXPIRED") || row.status?.includes("MISSING") ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{row.title}</p>
              {row.subtitle ? <p className="truncate text-xs font-semibold text-slate-500">{row.subtitle}</p> : null}
              {row.meta ? <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.meta}</p> : null}
            </div>
            {row.status ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{titleCase(row.status)}</span> : null}
            {row.href ? <Link href={row.href} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ArrowRight size={15} /></Link> : null}
          </div>
        )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">{empty}</div>}
      </div>
    </section>
  );
}

export function OperationsModuleView({ title, eyebrow, description, metrics, sections }: { title: string; eyebrow: string; description: string; metrics: Metric[]; sections: Array<{ title: string; rows: Row[]; empty: string }> }) {
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <StatCard key={metric.label} metric={metric} />)}</div>
      <div className="grid gap-5 xl:grid-cols-2">{sections.map((section) => <ModuleSection key={section.title} {...section} />)}</div>
    </main>
  );
}

export function unitLabel(unit?: { unitNumber: string; property?: { name: string } | null } | null) {
  return unit ? `${unit.property?.name ?? "Property"} #${unit.unitNumber}` : "Portfolio";
}

export { money };
