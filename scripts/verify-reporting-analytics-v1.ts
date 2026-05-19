import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/lib/reports/index.ts",
  "src/components/reports/ReportsDashboard.tsx",
  "src/components/reports/ReportDrilldown.tsx",
  "src/app/admin/reports/drilldown/page.tsx",
  "src/app/landlord/reports/drilldown/page.tsx",
  "src/app/admin/reports/export/route.ts",
  "src/app/landlord/reports/export/route.ts",
  "docs/REPORTING_ANALYTICS_V1.md",
  "src/lib/app-version.ts"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) throw new Error(`Missing reporting analytics v1 files: ${missingFiles.join(", ")}`);

function semverAtLeast(version: string, minimum: string) {
  const parts = version.split(".").map((part) => Number(part));
  const minimumParts = minimum.split(".").map((part) => Number(part));
  for (let index = 0; index < Math.max(parts.length, minimumParts.length); index += 1) {
    const actual = parts[index] ?? 0;
    const expected = minimumParts[index] ?? 0;
    if (actual > expected) return true;
    if (actual < expected) return false;
  }
  return true;
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string; scripts?: Record<string, string> };
if (!packageJson.version || !semverAtLeast(packageJson.version, "4.26.0")) throw new Error(`Expected package version 4.26.0 or newer, found ${packageJson.version ?? "missing"}`);
if (packageJson.scripts?.["reporting-analytics-v1:verify"] !== "tsx scripts/verify-reporting-analytics-v1.ts") throw new Error("Missing reporting-analytics-v1:verify package script.");

const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.26.0")) throw new Error("APP_VERSION must be 4.26.0 or newer.");

const reports = readFileSync("src/lib/reports/index.ts", "utf8");
for (const needle of [
  "delinquency",
  "cash_flow",
  "lead_conversion",
  "application_funnel",
  "maintenance_cost",
  "vendor_performance",
  "inspection_compliance",
  "vendorInvoiceWhere",
  "vendorPayoutWhere",
  "inspectionWhere",
  "complianceRequirementWhere",
  "buildVendorPerformanceRows",
  "reportTableForSection"
]) {
  if (!reports.includes(needle)) throw new Error(`Reports service missing: ${needle}`);
}

const dashboard = readFileSync("src/components/reports/ReportsDashboard.tsx", "utf8");
for (const needle of ["Drilldown", "Property", "Delinquency", "Cash flow", "Lead conversion", "Application funnel", "Maintenance cost", "Vendor performance", "Inspection compliance"]) {
  if (!dashboard.includes(needle)) throw new Error(`Reports dashboard missing: ${needle}`);
}

const drilldown = readFileSync("src/components/reports/ReportDrilldown.tsx", "utf8");
for (const needle of ["reportTableForSection", "Back to reports", "CSV", "JSON", "The same scoped dataset"]) {
  if (!drilldown.includes(needle)) throw new Error(`Report drilldown missing: ${needle}`);
}

for (const file of ["src/app/admin/reports/drilldown/page.tsx", "src/app/landlord/reports/drilldown/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  for (const needle of ["ReportDrilldown", "getReportsDashboard", "parseReportSection"]) {
    if (!source.includes(needle)) throw new Error(`${file} missing: ${needle}`);
  }
}

for (const file of ["src/app/admin/reports/export/route.ts", "src/app/landlord/reports/export/route.ts"]) {
  const source = readFileSync(file, "utf8");
  for (const needle of ["reportToCsv", "format", "json", "csv"]) {
    if (!source.includes(needle)) throw new Error(`${file} missing export marker: ${needle}`);
  }
}

for (const file of [
  "src/app/admin/reports/delinquency/page.tsx",
  "src/app/admin/reports/cash-flow/page.tsx",
  "src/app/admin/reports/lead-conversion/page.tsx",
  "src/app/admin/reports/application-funnel/page.tsx",
  "src/app/admin/reports/maintenance-cost/page.tsx",
  "src/app/admin/reports/vendor-performance/page.tsx",
  "src/app/admin/reports/inspection-compliance/page.tsx",
  "src/app/landlord/reports/delinquency/page.tsx",
  "src/app/landlord/reports/cash-flow/page.tsx",
  "src/app/landlord/reports/lead-conversion/page.tsx",
  "src/app/landlord/reports/application-funnel/page.tsx",
  "src/app/landlord/reports/maintenance-cost/page.tsx",
  "src/app/landlord/reports/vendor-performance/page.tsx",
  "src/app/landlord/reports/inspection-compliance/page.tsx"
]) {
  if (!existsSync(file)) throw new Error(`Missing report shortcut route: ${file}`);
}

const docs = readFileSync("docs/REPORTING_ANALYTICS_V1.md", "utf8");
for (const needle of ["Occupancy", "Delinquency", "Cash flow", "Lead conversion", "Application funnel", "Maintenance cost", "Vendor performance", "Inspection compliance", "Exports", "Drilldowns"]) {
  if (!docs.includes(needle)) throw new Error(`Docs missing: ${needle}`);
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes("v4.26.0 - Reporting & Analytics v1")) throw new Error("Changelog is missing v4.26.0 entry.");

console.log("Reporting & Analytics v1 verification passed.");
