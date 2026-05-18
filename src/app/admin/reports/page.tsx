export const dynamic = "force-dynamic";

import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { requireRole } from "@/lib/auth";
import { getReportFilterOptions, getReportsDashboard, parseReportFilters } from "@/lib/reports";

export default async function AdminReportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await requireRole(["ADMIN"], "/admin/reports");
  const filters = parseReportFilters(searchParams);
  const [report, options] = await Promise.all([
    getReportsDashboard({ role: "admin" }, filters),
    getReportFilterOptions({ role: "admin" })
  ]);
  return <ReportsDashboard report={report} basePath="/admin/reports" options={options} />;
}
