import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing mobile/drilldown markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/MOBILE_FLOW_ADMIN_DRILLDOWNS.md");
assertIncludes("docs/MOBILE_FLOW_ADMIN_DRILLDOWNS.md", [
  "Mobile Flow QA & Admin Command Center Drilldowns",
  "Phone-First Flow Updates",
  "Admin Command Center Drilldowns",
  "mobile-flow-drilldowns:verify"
]);

assertIncludes("src/lib/admin/command-center.ts", [
  "export type AdminCommandCenterDrilldown",
  "commandCenterDrilldownHref",
  "export async function getAdminCommandCenterDrilldown",
  "active-units-missing-photos",
  "failed-integration-events",
  "applications-waiting-review",
  "old-access-requests"
]);

assertIncludes("src/app/admin/command-center/drilldowns/page.tsx", [
  "requireAdmin(\"/admin/command-center/drilldowns\")",
  "getAdminCommandCenterDrilldown",
  "Open source area",
  "min-h-12",
  "grid gap-3"
]);

assertIncludes("src/components/admin/AdminCommandCenter.tsx", [
  "px-3 py-4 sm:px-6 sm:py-6",
  "overflow-x-auto",
  "min-w-[760px]"
]);

assertIncludes("src/components/admin/AdminPageHeader.tsx", [
  "text-3xl font-black",
  "inline-flex min-h-11"
]);

assertIncludes("src/app/landlord/inbox/page.tsx", [
  "hidden lg:block",
  "#conversation",
  "Back to inbox"
]);

assertIncludes("src/app/marketplace/[unitId]/page.tsx", [
  "min-h-[18rem]",
  "scroll-mt-20",
  "fixed inset-x-0 bottom-0"
]);

assertIncludes("src/app/applicant/apply/[unitId]/page.tsx", [
  "px-3 py-5",
  "text-3xl font-black",
  "min-h-12 rounded-2xl bg-blue-600"
]);

assertIncludes("src/app/landlord/tenants/page.tsx", [
  "px-3 py-6",
  "break-words text-xl",
  "grid-cols-2 gap-2 sm:grid-cols-4"
]);

assertIncludes("src/app/landlord/maintenance/page.tsx", [
  "px-3 py-6",
  "grid grid-cols-2 gap-3 md:grid-cols-5",
  "min-h-12 rounded-2xl bg-brand-600"
]);

assertIncludes("src/components/vendors/VendorPortalView.tsx", [
  "px-3 py-4",
  "min-h-11 rounded-xl bg-blue-600"
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.5\"",
  "\"mobile-flow-drilldowns:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify && npm run admin-command-center-inspection-title-fix:verify && npm run lead-authorization-relation-fix:verify && npm run maintenance-priority-enum-fix:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.59.5"]);
assertIncludes("README.md", ["Current package version: **4.59.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.5 - Maintenance Priority Enum Fix"]);

console.log("Mobile flow and admin drilldown verification passed.");
