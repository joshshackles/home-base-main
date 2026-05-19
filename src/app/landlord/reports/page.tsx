export const dynamic = "force-dynamic";

import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { requireRole } from "@/lib/auth";
import { getReportFilterOptions, getReportsDashboard, parseReportFilters } from "@/lib/reports";

export default async function LandlordReportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const filters = parseReportFilters(searchParams);
  const scope = { role: "landlord" as const, ownerUserId: user.userId };
  const [report, options] = await Promise.all([
    getReportsDashboard(scope, filters),
    getReportFilterOptions(scope)
  ]);
  return <ReportsDashboard report={report} basePath="/landlord/reports" options={options} />;
}
