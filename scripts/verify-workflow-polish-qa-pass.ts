import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/components/ui/system/index.tsx", [
  "statusLabel",
  "statusTone",
  "WorkflowStatusBadge",
  "ProductPageHeader",
  "FirstRunChecklist",
  "First run"
]);

assertIncludes("src/app/marketplace/page.tsx", [
  "Save Search",
  "Sign In to Save Search",
  "Saved Searches:",
  "Clear all filters",
  "No exact matches found.",
  "View All Rentals",
  "Open Broader Search"
]);

assertIncludes("src/app/applicant/apply/[unitId]/page.tsx", ["Authorize and Submit Application"]);

assertIncludes("src/app/landlord/tenants/page.tsx", [
  "WorkflowStatusBadge",
  "No authorized tenant records yet",
  "View Application",
  "Open Message",
  "Reply in Inbox"
]);

assertIncludes("src/app/landlord/maintenance/page.tsx", [
  "ProductPageHeader",
  "WorkflowStatusBadge",
  "No maintenance requests yet",
  "Update Work Order",
  "Send Maintenance Reply",
  "statusLabel(status)"
]);

assertIncludes("src/components/dashboard/RoleDashboard.tsx", [
  "Review Needs Attention",
  "Open Next Action"
]);

assertIncludes("src/components/dashboard/DashboardActivityFeed.tsx", [
  "No recent activity yet."
]);

assertIncludes("docs/WORKFLOW_POLISH_QA_PASS.md", [
  "Version: 4.45.0",
  "Shared Product Language",
  "Polished Workflows",
  "QA Focus"
]);

assertIncludes("package.json", [
  "\"version\": \"4.45.0\"",
  "\"workflow-polish-qa-pass:verify\""
]);
assertIncludes("src/lib/app-version.ts", ["4.45.0"]);
assertIncludes("README.md", ["Current package version: **4.45.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.45.0 - Workflow Polish & QA Pass"]);

console.log("Workflow polish QA pass verification passed.");
