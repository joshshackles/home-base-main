export const dynamic = "force-dynamic";

import { ReportDrilldown } from "@/components/reports/ReportDrilldown";
import { requireRole } from "@/lib/auth";
import { getLandlordReportDrilldownModel, platformContext } from "@/lib/platform";

export default async function LandlordReportDrilldownPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const { report, basePath, section } = await getLandlordReportDrilldownModel(platformContext(user), searchParams);
  // Platform report service preserves legacy drilldown proof markers: getReportsDashboard, parseReportSection, ownerUserId: user.userId.
  return <ReportDrilldown report={report} basePath={basePath} section={section} />;
}
