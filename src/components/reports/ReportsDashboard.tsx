import Link from "next/link";
import { BarChart3, CalendarClock, Download, FileJson, Filter, ShieldCheck, TrendingUp } from "lucide-react";
import { ActionBar, AppCard, CompactTable, DataGrid, MetricTile, SectionHeader, StatusBadge, SystemTabs } from "@/components/ui/system";
import { reportQueryString, toInputDate, type ReportFilters, type ReportSection, type ReportsDashboardDTO } from "@/lib/reports";

const sections: Array<{ key: ReportSection; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "financial", label: "Financial" },
  { key: "occupancy", label: "Occupancy" },
  { key: "delinquency", label: "Delinquency" },
  { key: "cash_flow", label: "Cash flow" },
  { key: "leasing", label: "Leasing" },
  { key: "lead_conversion", label: "Lead conversion" },
  { key: "application_funnel", label: "Application funnel" },
  { key: "maintenance", label: "Maintenance" },
  { key: "maintenance_cost", label: "Maintenance cost" },
  { key: "vendor_performance", label: "Vendor performance" },
  { key: "inspection_compliance", label: "Inspection compliance" },
  { key: "communications", label: "Communications" }
];

export function ReportsDashboard({ report, basePath, options }: { report: ReportsDashboardDTO; basePath: string; options: { properties: Array<{ id: string; label: string }>; rentals: Array<{ id: string; label: string }> } }) {
  const activeSection = report.filters.section;
  const currentTable = getActiveTable(report, activeSection);
  const quickReports = [
    { label: "Financial health", detail: `${formatMoney(report.financial.outstanding)} outstanding`, section: "financial" as const, tone: report.financial.overdue > 0 ? "amber" : "green" },
    { label: "Occupancy", detail: `${report.occupancy.occupancyRate}% occupied`, section: "occupancy" as const, tone: report.occupancy.occupancyRate < 90 ? "amber" : "green" },
    { label: "Leasing funnel", detail: `${report.leasing.conversionRate}% conversion`, section: "lead_conversion" as const, tone: "blue" },
    { label: "Maintenance", detail: `${report.maintenance.open} open work orders`, section: "maintenance" as const, tone: report.maintenance.urgent > 0 ? "red" : "blue" }
  ];

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="blue">Reports</StatusBadge>
              <StatusBadge tone="green">Scoped portfolio data</StatusBadge>
              <StatusBadge tone="slate">{report.scopeLabel}</StatusBadge>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Portfolio Reports & Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review financial health, occupancy, leasing conversion, maintenance workload, vendor performance, inspections, and communication activity from one operator-grade reporting hub.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100" href={`${basePath}/drilldown?${reportQueryString(report.filters, { section: activeSection })}`}><BarChart3 size={14} /> Drilldown</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section: activeSection, format: "csv" })}`}><Download size={14} /> CSV</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" href={`${basePath}/export?${reportQueryString(report.filters, { section: activeSection, format: "json" })}`}><FileJson size={14} /> JSON</Link>
          </div>
        </div>
      </div>

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        {quickReports.map((item) => (
          <Link
            key={item.label}
            href={`${basePath}?${reportQueryString(report.filters, { section: item.section })}`}
            className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.section === activeSection ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
            <p className="mt-2 text-sm font-bold text-slate-700">{item.detail}</p>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${item.tone === "red" ? "bg-rose-100 text-rose-700" : item.tone === "amber" ? "bg-amber-100 text-amber-800" : item.tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
              Open report
            </span>
          </Link>
        ))}
      </section>

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
            Property
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" name="propertyId" defaultValue={report.filters.propertyId ?? ""}>
              <option value="">All properties</option>
              {options.properties.map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}
            </select>
          </label>
          <label className="grid min-w-[220px] gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            Rental
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" name="rentalId" defaultValue={report.filters.rentalId ?? ""}>
              <option value="">Portfolio-wide</option>
              {options.rentals.map((rental) => <option key={rental.id} value={rental.id}>{rental.label}</option>)}
            </select>
          </label>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit"><Filter size={15} /> Apply filters</button>
          <Link className="rounded-xl px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100" href={basePath}>Reset</Link>
        </form>
      </ActionBar>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 className="font-black text-slate-950">Export governance</h2>
              <p className="mt-1 text-sm text-slate-600">CSV and JSON exports use the same portfolio scope and filters shown here. Treat exports as sensitive operational records and keep them tied to business purpose.</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden="true" />
            <div>
              <h2 className="font-black text-slate-950">Saved reports</h2>
              <p className="mt-1 text-sm text-slate-600">Use filters to prepare owner updates, weekly leasing reviews, monthly financial checks, and maintenance performance summaries. Scheduled delivery can be wired once provider settings are live.</p>
            </div>
          </div>
        </div>
      </section>

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
            <div className="hidden md:block">
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
            <div className="grid gap-3 md:hidden">
              {currentTable.rows.map((row, index) => (
                <div key={`${row[0]}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-base font-black text-slate-950">{row[0]}</p>
                  <div className="mt-3 grid gap-2">
                    {row.slice(1, 5).map((cell, cellIndex) => (
                      <div key={`${cell}-${cellIndex}`} className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-bold text-slate-500">{currentTable.headers[cellIndex + 1]}</span>
                        <span className="text-right font-black text-slate-800">{cell}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {currentTable.rows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No report rows for this date range.</div> : null}
            </div>
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
  if (section === "delinquency") return report.delinquency.rows;
  if (section === "cash_flow") return report.cashFlow.rows;
  if (section === "leasing") return report.leasing.recentRows;
  if (section === "lead_conversion") return report.leadConversion.rows;
  if (section === "application_funnel") return report.applicationFunnel.rows;
  if (section === "maintenance") return report.maintenance.recentRows;
  if (section === "maintenance_cost") return report.maintenanceCost.rows;
  if (section === "vendor_performance") return report.vendorPerformance.rows;
  if (section === "inspection_compliance") return report.inspectionCompliance.rows;
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
  if (section === "delinquency") return [
    { label: "Overdue entries", value: report.delinquency.overdueCount },
    { label: "Delinquency rate", value: report.delinquency.delinquencyRate },
    { label: "Overdue balance", value: Math.round(report.delinquency.overdueBalance / 1000) }
  ];
  if (section === "cash_flow") return [
    { label: "Inflow", value: Math.round(report.cashFlow.inflow / 1000) },
    { label: "Outflow", value: Math.round(report.cashFlow.outflow / 1000) },
    { label: "Net", value: Math.round(report.cashFlow.net / 1000) }
  ];
  if (section === "leasing") return report.leasing.statusRows;
  if (section === "lead_conversion") return [
    { label: "Leads", value: report.leadConversion.leads },
    { label: "Contacted", value: report.leadConversion.contacted },
    { label: "Application started", value: report.leadConversion.applicationStarted },
    { label: "Closed", value: report.leadConversion.closed }
  ];
  if (section === "application_funnel") return [
    { label: "Started", value: report.applicationFunnel.started },
    { label: "Submitted", value: report.applicationFunnel.submitted },
    { label: "Under review", value: report.applicationFunnel.underReview },
    { label: "Approved", value: report.applicationFunnel.approved },
    { label: "Denied", value: report.applicationFunnel.denied },
    { label: "Withdrawn", value: report.applicationFunnel.withdrawn }
  ];
  if (section === "maintenance") return report.maintenance.statusRows;
  if (section === "maintenance_cost") return [
    { label: "Invoice total", value: Math.round(report.maintenanceCost.invoiceTotal / 1000) },
    { label: "Payout total", value: Math.round(report.maintenanceCost.payoutTotal / 1000) },
    { label: "Average cost", value: Math.round(report.maintenanceCost.averageCost / 100) }
  ];
  if (section === "vendor_performance") return [
    { label: "Active vendors", value: report.vendorPerformance.activeVendors },
    { label: "Submitted invoices", value: report.vendorPerformance.submittedInvoices },
    { label: "Paid payouts", value: report.vendorPerformance.paidPayouts },
    { label: "Average invoice", value: Math.round(report.vendorPerformance.averageInvoice / 100) }
  ];
  if (section === "inspection_compliance") return [
    { label: "Requirements", value: report.inspectionCompliance.inspectionsDue },
    { label: "Passed", value: report.inspectionCompliance.inspectionsPassed },
    { label: "Failed/reinspect", value: report.inspectionCompliance.inspectionsFailed },
    { label: "Compliance risk", value: report.inspectionCompliance.complianceRisk }
  ];
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
