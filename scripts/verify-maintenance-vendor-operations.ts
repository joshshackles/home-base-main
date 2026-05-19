import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/app/vendor-actions.ts",
  "src/lib/vendors/index.ts",
  "src/components/vendors/VendorPortalView.tsx",
  "src/components/vendors/VendorCenterView.tsx",
  "src/app/landlord/maintenance/page.tsx",
  "docs/REAL_MAINTENANCE_VENDOR_OPERATIONS.md",
  "src/lib/app-version.ts"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) throw new Error(`Missing maintenance/vendor operations files: ${missingFiles.join(", ")}`);

const actions = readFileSync("src/app/vendor-actions.ts", "utf8");
for (const needle of ["acceptVendorMaintenanceJob", "uploadVendorMaintenancePhoto", "createVendorEstimate", "createRecurringMaintenanceTask", "VendorPayoutStatus.APPROVAL_REQUIRED"]) {
  if (!actions.includes(needle)) throw new Error(`Vendor actions missing: ${needle}`);
}

const vendorLib = readFileSync("src/lib/vendors/index.ts", "utf8");
for (const needle of ["slaDueAt", "unassignedJobs", "waitingVendorAcceptance", "slaBreaches", "payoutEligibleInvoices", "recurringTasks"]) {
  if (!vendorLib.includes(needle)) throw new Error(`Vendor data helper missing: ${needle}`);
}

const portal = readFileSync("src/components/vendors/VendorPortalView.tsx", "utf8");
for (const needle of ["Mobile field mode", "Accept job", "Upload photo", "Submit estimate", "Payout eligible", "Photo updates"]) {
  if (!portal.includes(needle)) throw new Error(`Vendor portal missing: ${needle}`);
}

const center = readFileSync("src/components/vendors/VendorCenterView.tsx", "utf8");
for (const needle of ["Assignment queues and SLA tracking", "Recurring maintenance", "Needs assignment", "Awaiting vendor acceptance", "SLA risk", "Payout eligible"]) {
  if (!center.includes(needle)) throw new Error(`Vendor center missing: ${needle}`);
}

const maintenance = readFileSync("src/app/landlord/maintenance/page.tsx", "utf8");
for (const needle of ["Vendor ops", "SLA risk", "Estimates", "Recurring", "field updates"]) {
  if (!maintenance.includes(needle)) throw new Error(`Maintenance page missing: ${needle}`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
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
if (!semverAtLeast(packageJson.version, "4.24.0")) throw new Error(`Expected package version 4.24.0 or newer, found ${packageJson.version}`);

const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.24.0")) throw new Error("APP_VERSION must be 4.24.0 or newer.");

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes("v4.24.0 - Real Maintenance/Vendor Operations")) throw new Error("Changelog is missing v4.24.0 entry.");

console.log("Real maintenance/vendor operations verification passed.");
