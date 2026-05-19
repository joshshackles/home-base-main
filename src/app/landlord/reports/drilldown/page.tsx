export const dynamic = "force-dynamic";

import { ReportDrilldown } from "@/components/reports/ReportDrilldown";
import { requireRole } from "@/lib/auth";
import { getReportsDashboard, parseReportFilters, parseReportSection } from "@/lib/reports";

export default async function LandlordReportDrilldownPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const filters = parseReportFilters(searchParams);
  const section = parseReportSection(searchParams?.section);
  const report = await getReportsDashboard({ role: "landlord", ownerUserId: user.userId }, { ...filters, section });
  return <ReportDrilldown report={report} basePath="/landlord/reports" section={section} />;
}
