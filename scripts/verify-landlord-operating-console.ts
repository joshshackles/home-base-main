import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/app/landlord/units/[id]/page.tsx",
  "docs/LANDLORD_OPERATING_CONSOLE.md",
  "CHANGELOG.md",
  "src/lib/app-version.ts"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) throw new Error(`Missing landlord operating console files: ${missingFiles.join(", ")}`);

const page = readFileSync("src/app/landlord/units/[id]/page.tsx", "utf8");
const requiredPageContent = [
  "Landlord Operating Console",
  "Listing Health",
  "listingHealthScore",
  "Needs Attention",
  "Pipeline",
  "Tenant",
  "Rent, Deposit, and Move-In Terms",
  "Ledger",
  "Repairs",
  "Important Contacts",
  "Inspections",
  "Documents",
  "Client Notes",
  "Rental Timeline",
  "timelineItems",
  "ConsoleLink"
];

const missingPageContent = requiredPageContent.filter((needle) => !page.includes(needle));
if (missingPageContent.length > 0) throw new Error(`Landlord rental page is missing console content: ${missingPageContent.join(", ")}`);

const docs = readFileSync("docs/LANDLORD_OPERATING_CONSOLE.md", "utf8");
for (const needle of ["listing health", "leads and applications", "tenant record", "ledger", "timeline"]) {
  if (!docs.includes(needle)) throw new Error(`Landlord console docs are missing: ${needle}`);
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
if (!semverAtLeast(packageJson.version, "4.23.0")) throw new Error(`Expected package version 4.23.0 or newer, found ${packageJson.version}`);

const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.23.0")) throw new Error("APP_VERSION must be 4.23.0 or newer.");

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes("v4.23.0 - Landlord Operating Console")) throw new Error("Changelog is missing v4.23.0 entry.");

console.log("Landlord operating console verification passed.");
