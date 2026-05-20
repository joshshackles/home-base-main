export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/permissions";
import { getAdminCommandCenterDrilldown } from "@/lib/admin/command-center";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusClass(status?: string) {
  if (!status) return "border-slate-200 bg-slate-100 text-slate-700";
  if (["FAILED", "ERROR", "CRITICAL", "DENIED", "CANCELLED"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-800";
  if (["PENDING", "SUBMITTED", "WAITING", "WAITING_ON_STAFF", "WAITING_ON_VENDOR", "RETRYING", "DRAFT"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (["ACTIVE", "APPROVED", "COMPLETED", "HEALTHY"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminCommandCenterDrilldownPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await requireAdmin("/admin/command-center/drilldowns");
  const key = first(searchParams?.key) || "unknown";
  const drilldown = await getAdminCommandCenterDrilldown(key);
  const q = first(searchParams?.q).trim().toLowerCase();
  const records = q
    ? drilldown.records.filter((record) => `${record.title} ${record.detail} ${record.status ?? ""}`.toLowerCase().includes(q))
    : drilldown.records;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/admin/command-center" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">
          <ArrowLeft size={15} />
          Command Center
        </Link>
      </div>

      <AdminPageHeader
        eyebrow="Command center drilldown"
        title={drilldown.title}
        description={drilldown.description}
        actionHref={drilldown.sourceHref}
        actionLabel="Open source area"
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Records</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{drilldown.records.length}</p>
          <p className="mt-1 text-sm text-slate-600">Connected records returned by the drilldown query.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <form action="/admin/command-center/drilldowns" className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="key" value={key} />
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input name="q" defaultValue={q} className="min-h-12 w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Search this drilldown" />
            </label>
            <button className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800">Search</button>
          </form>
        </div>
      </section>

      {records.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
          <h2 className="mt-4 text-2xl font-black text-slate-950">No records in this drilldown</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">There are no matching records right now. If you searched, clear the search to see the full connected set.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/admin/command-center/drilldowns?key=${encodeURIComponent(key)}`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Clear search</Link>
            <Link href={drilldown.sourceHref} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">Open source area</Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-slate-950">{record.title}</h2>
                    {record.status ? <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass(record.status)}`}>{label(record.status)}</span> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{record.detail}</p>
                  <p className="mt-2 break-all text-xs font-bold text-slate-400">{record.id}{record.updatedAt ? ` / ${record.updatedAt.toLocaleDateString()}` : ""}</p>
                </div>
                <Link href={record.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
                  Open
                  <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
