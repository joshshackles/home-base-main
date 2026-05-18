import { requireRole } from "@/lib/auth";
import { getReportsDashboard, parseReportFilters, parseReportSection, reportToCsv } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireRole(["LANDLORD"], "/landlord/reports");
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const filters = parseReportFilters(searchParams);
  const section = parseReportSection(url.searchParams.get("section"));
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const report = await getReportsDashboard({ role: "landlord", ownerUserId: user.userId }, { ...filters, section });

  if (format === "json") {
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  }

  return new Response(reportToCsv(report, section), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="homebase-${section}-report.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
