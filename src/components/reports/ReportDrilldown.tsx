import Link from "next/link";
import { Download, FileJson } from "lucide-react";
import { AppCard, CompactTable, SectionHeader, StatusBadge } from "@/components/ui/system";
import { reportQueryString, reportTableForSection, type ReportSection, type ReportsDashboardDTO } from "@/lib/reports";

export function ReportDrilldown({ report, basePath, section }: { report: ReportsDashboardDTO; basePath: string; section: ReportSection }) {
  const table = reportTableForSection(report, section === "overview" ? "financial" : section);
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6">
      <div className="mb-4 rounded-[var(--hb-radius)] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="blue">Drilldown</StatusBadge>
              <StatusBadge tone="green">Export-ready</StatusBadge>
              <StatusBadge tone="slate">{report.scopeLabel}</StatusBadge>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{table.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{table.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}?${reportQueryString(report.filters, { section })}`}>Back to reports</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section, format: "csv" })}`}><Download size={14} /> CSV</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section, format: "json" })}`}><FileJson size={14} /> JSON</Link>
          </div>
        </div>
      </div>
      <AppCard>
        <SectionHeader title="Rows" detail="The same scoped dataset powers this drilldown and the CSV/JSON export route." count={table.rows.length} />
        <div className="mt-3">
          <CompactTable>
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
              <tr>{table.headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((row, index) => (
                <tr key={`${row[0]}-${index}`} className="hover:bg-slate-50/80">
                  {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-3 py-2 text-sm ${cellIndex === 0 ? "font-black text-slate-950" : "font-semibold text-slate-600"}`}>{cell}</td>)}
                </tr>
              ))}
              {table.rows.length === 0 ? <tr><td className="px-3 py-8 text-center text-sm font-semibold text-slate-500" colSpan={table.headers.length}>No drilldown rows for this date range.</td></tr> : null}
            </tbody>
          </CompactTable>
        </div>
      </AppCard>
    </main>
  );
}
