import Link from "next/link";
import { BarChart3, Download, FileJson, Filter, TrendingUp } from "lucide-react";
import { ActionBar, AppCard, CompactTable, DataGrid, MetricTile, SectionHeader, StatusBadge, SystemTabs } from "@/components/ui/system";
import { reportQueryString, toInputDate, type ReportFilters, type ReportSection, type ReportsDashboardDTO } from "@/lib/reports";

const sections: Array<{ key: ReportSection; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "financial", label: "Financial" },
  { key: "occupancy", label: "Occupancy" },
  { key: "leasing", label: "Leasing" },
  { key: "maintenance", label: "Maintenance" },
  { key: "communications", label: "Communications" }
];

export function ReportsDashboard({ report, basePath, options }: { report: ReportsDashboardDTO; basePath: string; options: { rentals: Array<{ id: string; label: string }> } }) {
  const activeSection = report.filters.section;
  const currentTable = getActiveTable(report, activeSection);
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6">
      <div className="mb-4 rounded-[var(--hb-radius)] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="blue">Reports</StatusBadge>
              <StatusBadge tone="green">Live Prisma data</StatusBadge>
              <StatusBadge tone="slate">{report.scopeLabel}</StatusBadge>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Reports & Analytics Suite</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Real operational, financial, leasing, maintenance, occupancy, and communication reporting with scoped exports and Vercel-safe aggregate queries.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section: activeSection, format: "csv" })}`}><Download size={14} /> CSV</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section: activeSection, format: "json" })}`}><FileJson size={14} /> JSON</Link>
          </div>
        </div>
      </div>

      <ActionBar>
        <form className="flex w-full flex-wrap items-end gap-2" action={basePath}>
          <input type="hidden" name="section" value={activeSection} />
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            From
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" type="date" name="from" defaultValue={toInputDate(report.filters.from)} />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            To
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" type="date" name="to" defaultValue={toInputDate(report.filters.to)} />
          </label>
          <label className="grid min-w-[220px] gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            Rental
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" name="rentalId" defaultValue={report.filters.rentalId ?? ""}>
              <option value="">Portfolio-wide</option>
              {options.rentals.map((rental) => <option key={rental.id} value={rental.id}>{rental.label}</option>)}
            </select>
          </label>
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit"><Filter size={15} /> Apply filters</button>
          <Link className="rounded-xl px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100" href={basePath}>Reset</Link>
        </form>
      </ActionBar>

      <div className="mt-4">
        <SystemTabs tabs={sections.map((section) => ({ href: `${basePath}?${reportQueryString(report.filters, { section: section.key })}`, label: section.label, active: section.key === activeSection }))} />
      </div>

      <div className="mt-4">
        <DataGrid>
          {report.metrics.map((metric) => <MetricTile key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} tone={metric.tone} />)}
        </DataGrid>
      </div>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AppCard>
          <SectionHeader title="Revenue trend" detail="Payment and credit volume across the most recent six-month reporting window." action={<TrendingUp size={18} className="text-blue-600" />} />
          <div className="mt-4 grid h-56 grid-cols-6 items-end gap-2 rounded-2xl bg-slate-50 p-3">
            {report.financial.trend.map((point) => <TrendBar key={point.label} point={point} max={Math.max(1, ...report.financial.trend.map((row) => row.value))} />)}
          </div>
        </AppCard>
        <AppCard>
          <SectionHeader title="Report focus" detail="Fast status breakdown for the active module." action={<BarChart3 size={18} className="text-blue-600" />} />
          <div className="mt-4 grid gap-2">
            {getActiveBreakdown(report, activeSection).map((point) => (
              <div key={point.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="font-black text-slate-800">{point.label}</span><span className="font-black text-slate-950">{point.value}</span></div>
                <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(4, Math.min(100, point.value * 12))}%` }} /></div>
              </div>
            ))}
          </div>
        </AppCard>
      </section>

      <section className="mt-4">
        <AppCard>
          <SectionHeader title={currentTable.title} detail={currentTable.description} count={currentTable.rows.length} />
          <div className="mt-3">
            <CompactTable>
              <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>{currentTable.headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTable.rows.map((row, index) => (
                  <tr key={`${row[0]}-${index}`} className="hover:bg-slate-50/80">
                    {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-3 py-2 text-sm ${cellIndex === 0 ? "font-black text-slate-950" : "font-semibold text-slate-600"}`}>{cell}</td>)}
                  </tr>
                ))}
                {currentTable.rows.length === 0 ? <tr><td className="px-3 py-8 text-center text-sm font-semibold text-slate-500" colSpan={currentTable.headers.length}>No report rows for this date range.</td></tr> : null}
              </tbody>
            </CompactTable>
          </div>
        </AppCard>
      </section>
    </main>
  );
}

function TrendBar({ point, max }: { point: { label: string; value: number }; max: number }) {
  const height = Math.max(8, Math.round((point.value / max) * 100));
  return (
    <div className="flex h-full flex-col justify-end gap-2 text-center">
      <div className="flex flex-1 items-end rounded-xl bg-white p-1 shadow-inner"><div className="w-full rounded-lg bg-blue-600" style={{ height: `${height}%` }} /></div>
      <div><p className="text-[11px] font-black text-slate-500">{point.label}</p><p className="truncate text-[11px] font-bold text-slate-800">{new Intl.NumberFormat("en-US", { notation: "compact" }).format(point.value)}</p></div>
    </div>
  );
}

function getActiveTable(report: ReportsDashboardDTO, section: ReportSection) {
  if (section === "occupancy") return report.occupancy.rows;
  if (section === "leasing") return report.leasing.recentRows;
  if (section === "maintenance") return report.maintenance.recentRows;
  if (section === "communications") return report.communications.recentRows;
  return {
    title: "Financial summary",
    description: "Revenue and balance health for the selected reporting period.",
    headers: ["Metric", "Value", "Detail"],
    rows: [
      ["Collected", formatMoney(report.financial.collected), `${report.financial.collectionRate}% collection rate`],
      ["Posted charges", formatMoney(report.financial.charges), "Charges and adjustments"],
      ["Outstanding", formatMoney(report.financial.outstanding), `${formatMoney(report.financial.overdue)} overdue`],
      ["Occupancy", `${report.occupancy.occupancyRate}%`, `${report.occupancy.occupied}/${report.occupancy.totalRentals} occupied`]
    ]
  };
}

function getActiveBreakdown(report: ReportsDashboardDTO, section: ReportSection) {
  if (section === "occupancy") return [
    { label: "Occupied", value: report.occupancy.occupied },
    { label: "Available", value: report.occupancy.available },
    { label: "Pending", value: report.occupancy.pending },
    { label: "Unavailable", value: report.occupancy.unavailable }
  ];
  if (section === "leasing") return report.leasing.statusRows;
  if (section === "maintenance") return report.maintenance.statusRows;
  if (section === "communications") return report.communications.statusRows;
  return [
    { label: "Collection rate", value: report.financial.collectionRate },
    { label: "Outstanding balance", value: Math.round(report.financial.outstanding / 1000) },
    { label: "Overdue balance", value: Math.round(report.financial.overdue / 1000) },
    { label: "Occupancy rate", value: report.occupancy.occupancyRate }
  ];
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
