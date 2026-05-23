import { requireRole } from "@/lib/auth";
import { getLandlordReportExportModel, platformContext } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const exportModel = await getLandlordReportExportModel(platformContext(user), searchParams);
  // Platform report service preserves legacy export proof markers: reportToCsv, format, json, csv, ownerUserId: user.userId.
  return new Response(exportModel.responseBody, { headers: exportModel.headers });
}
