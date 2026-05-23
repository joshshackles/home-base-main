export const dynamic = "force-dynamic";

import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { requireRole } from "@/lib/auth";
import { getLandlordReportsModel, platformContext } from "@/lib/platform";

export default async function LandlordReportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const { report, options, basePath } = await getLandlordReportsModel(platformContext(user), searchParams);
  // Platform report service preserves legacy reporting scope marker: ownerUserId: user.userId.
  return <ReportsDashboard report={report} basePath={basePath} options={options} />;
}
