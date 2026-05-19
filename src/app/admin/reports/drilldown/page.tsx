export const dynamic = "force-dynamic";

import { ReportDrilldown } from "@/components/reports/ReportDrilldown";
import { requireRole } from "@/lib/auth";
import { getReportsDashboard, parseReportFilters, parseReportSection } from "@/lib/reports";

export default async function AdminReportDrilldownPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await requireRole(["ADMIN"], "/admin/reports");
  const filters = parseReportFilters(searchParams);
  const section = parseReportSection(searchParams?.section);
  const report = await getReportsDashboard({ role: "admin" }, { ...filters, section });
  return <ReportDrilldown report={report} basePath="/admin/reports" section={section} />;
}
