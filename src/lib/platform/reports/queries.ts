import { getReportFilterOptions, getReportsDashboard, parseReportFilters, parseReportSection, reportToCsv } from "@/lib/reports";
import { definePlatformQuery } from "@/lib/platform/service";

type ReportSearchParams = Record<string, string | string[] | undefined> | undefined;

function landlordReportScope(ownerUserId: string) {
  return { role: "landlord" as const, ownerUserId };
}

function firstParam(searchParams: ReportSearchParams, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const getLandlordReportsModel = definePlatformQuery(async (ctx, searchParams: ReportSearchParams) => {
  const filters = parseReportFilters(searchParams);
  const scope = landlordReportScope(ctx.actor.userId);
  const [report, options] = await Promise.all([
    getReportsDashboard(scope, filters),
    getReportFilterOptions(scope)
  ]);

  return { report, options, filters, basePath: "/landlord/reports" };
});

export const getLandlordReportDrilldownModel = definePlatformQuery(async (ctx, searchParams: ReportSearchParams) => {
  const filters = parseReportFilters(searchParams);
  const section = parseReportSection(searchParams?.section);
  const report = await getReportsDashboard(landlordReportScope(ctx.actor.userId), { ...filters, section });

  return { report, section, basePath: "/landlord/reports" };
});

export const getLandlordReportExportModel = definePlatformQuery(async (ctx, searchParams: ReportSearchParams) => {
  const filters = parseReportFilters(searchParams);
  const section = parseReportSection(searchParams?.section);
  const format = firstParam(searchParams, "format") === "json" ? "json" : "csv";
  const report = await getReportsDashboard(landlordReportScope(ctx.actor.userId), { ...filters, section });

  if (format === "json") {
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    };

    return {
      format,
      responseBody: JSON.stringify(report),
      headers
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="homebase-${section}-report.csv"`,
    "Cache-Control": "no-store"
  };

  return {
    format,
    responseBody: reportToCsv(report, section),
    headers
  };
});
