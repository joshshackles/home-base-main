import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/app/applicant/page.tsx",
  "docs/APPLICANT_TENANT_EXPERIENCE_UPGRADE.md",
  "CHANGELOG.md",
  "src/lib/app-version.ts"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) throw new Error(`Missing applicant/tenant experience files: ${missingFiles.join(", ")}`);

const dashboard = readFileSync("src/app/applicant/page.tsx", "utf8");
const requiredDashboardContent = [
  "Your guided housing journey",
  "Profile completeness",
  "Saved searches",
  "Reusable packet",
  "Move-in readiness",
  "Move-in checklist",
  "Rent calendar",
  "Manage utilities",
  "Maintenance center",
  "Documents & messages",
  "messageThreadCount",
  "UtilityAccountStatus.ACTIVE"
];

const missingDashboardContent = requiredDashboardContent.filter((needle) => !dashboard.includes(needle));
if (missingDashboardContent.length > 0) throw new Error(`Applicant dashboard is missing journey content: ${missingDashboardContent.join(", ")}`);

const docs = readFileSync("docs/APPLICANT_TENANT_EXPERIENCE_UPGRADE.md", "utf8");
for (const needle of ["Applicant journey", "Tenant journey", "profile completeness", "rent calendar", "utilities"]) {
  if (!docs.includes(needle)) throw new Error(`Experience docs are missing: ${needle}`);
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
if (!semverAtLeast(packageJson.version, "4.22.0")) throw new Error(`Expected package version 4.22.0 or newer, found ${packageJson.version}`);

const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.22.0")) throw new Error("APP_VERSION must be 4.22.0 or newer.");

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes("v4.22.0 - Applicant/Tenant Experience Upgrade")) throw new Error("Changelog is missing v4.22.0 entry.");

console.log("Applicant/tenant experience upgrade verification passed.");
