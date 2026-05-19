import { existsSync, readFileSync } from "fs";

const requiredFiles = ["src/app/applicant/page.tsx", "docs/UPDATE_13_TENANT_HOME_DASHBOARD.md"];
const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) throw new Error(`Missing Update 13 files: ${missing.join(", ")}`);

const dashboard = readFileSync("src/app/applicant/page.tsx", "utf8");
const requiredDashboardContent = [
  "TenantHomeDashboard",
  "Your home dashboard",
  "Current rental",
  "Next payment",
  "Quick request",
  "createMaintenanceRequest",
  "recentPayments",
  "upcomingPayments",
  "openMaintenance",
  "upcomingInspections",
  "attentionNotices",
  "ApplicantSearchDashboard",
  "getTenantDashboardMode",
  "primaryUnit"
];

const missingContent = requiredDashboardContent.filter((needle) => !dashboard.includes(needle));
if (missingContent.length > 0) throw new Error(`Applicant dashboard is missing Update 13 tenant content: ${missingContent.join(", ")}`);

if (dashboard.includes("<TenantHomeDashboard") || dashboard.includes("<ApplicantSearchDashboard")) {
  throw new Error("Async dashboard subviews should be invoked directly, not rendered as JSX components.");
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
function semverAtLeast(version: string, minimum: string) {
  const parts = version.split(".").map((part) => Number(part));
  const minParts = minimum.split(".").map((part) => Number(part));
  for (let index = 0; index < minParts.length; index += 1) {
    if ((parts[index] ?? 0) > minParts[index]) return true;
    if ((parts[index] ?? 0) < minParts[index]) return false;
  }
  return true;
}

if (!semverAtLeast(packageJson.version, "4.13.0")) throw new Error(`Expected package version 4.13.0 or newer, found ${packageJson.version}`);
const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.13.0")) throw new Error("APP_VERSION must be 4.13.0 or newer.");

console.log("Update 13 tenant home dashboard verification passed.");
