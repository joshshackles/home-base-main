import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "src/components/operations/InsuranceComplianceModule.tsx",
  "src/app/admin/documents/page.tsx",
  "src/app/landlord/documents/page.tsx",
  "src/components/tasks/TaskCenterView.tsx",
  "src/components/calendar/CalendarCenterView.tsx",
  "src/components/notices/NoticeCenterView.tsx",
  "src/components/reports/ReportsDashboard.tsx",
  "src/app/admin/rentals/[id]/page.tsx",
  "src/app/landlord/rentals/[id]/page.tsx"
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing unified rental file: ${file}`);
}

const insurance = readFileSync("src/components/operations/InsuranceComplianceModule.tsx", "utf8");
if (!insurance.includes('Field label="Applies to"') || insurance.includes('PropertySelect')) {
  throw new Error("Insurance/compliance must expose one Applies to rental selector, not separate property selectors.");
}

const documents = readFileSync("src/app/admin/documents/page.tsx", "utf8") + readFileSync("src/app/landlord/documents/page.tsx", "utf8");
if (!documents.includes('Portfolio-wide') || documents.includes('No property group')) {
  throw new Error("Document upload must support portfolio-wide/rental scope without a separate property group field.");
}

const reports = readFileSync("src/components/reports/ReportsDashboard.tsx", "utf8");
if (reports.includes('All properties') || reports.includes('name="propertyId"')) {
  throw new Error("Reports dashboard should not expose a separate property filter.");
}

console.log("Unified rental experience verification passed.");
