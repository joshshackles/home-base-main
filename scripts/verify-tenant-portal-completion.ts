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
    throw new Error(`${path} is missing tenant portal markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`${path} still contains applicant-era tenant portal markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

const nativeTenantPages = [
  "src/app/tenant/lease/page.tsx",
  "src/app/tenant/leases/page.tsx",
  "src/app/tenant/payments/page.tsx",
  "src/app/tenant/ledger/page.tsx",
  "src/app/tenant/maintenance/page.tsx",
  "src/app/tenant/inbox/page.tsx",
  "src/app/tenant/documents/page.tsx",
  "src/app/tenant/notices/page.tsx",
  "src/app/tenant/inspections/page.tsx",
  "src/app/tenant/tasks/page.tsx",
  "src/app/tenant/calendar/page.tsx",
  "src/app/tenant/notifications/page.tsx"
] as const;

assertExists("docs/TENANT_PORTAL_COMPLETION.md");
assertIncludes("docs/TENANT_PORTAL_COMPLETION.md", [
  "Tenant Portal Completion",
  "Native Tenant Routes",
  "No Applicant Redirects",
  "`/tenant/lease`",
  "`/tenant/payments`",
  "`/tenant/maintenance`",
  "`/tenant/inbox`",
  "`/tenant/documents`",
  "`/tenant/notices`",
  "`/tenant/inspections`",
  "`/tenant/tasks`",
  "`/tenant/calendar`",
  "`/tenant/notifications`"
]);

for (const path of nativeTenantPages) {
  assertExists(path);
  assertIncludes(path, ["requireRole([\"TENANT\"]", "/tenant/"]);
  assertExcludes(path, ["redirectTenantWorkflow", "href=\"/applicant", "href='/applicant", "redirect(\"/applicant", "redirect('/applicant", "from \"../_redirects\""]);
}

assertIncludes("src/app/tenant/leases/[id]/page.tsx", [
  "requireRole([\"TENANT\"]",
  "/tenant/leases",
  "Back to leases"
]);

assertIncludes("src/components/documents/DocumentCenterView.tsx", [
  "basePath: \"admin\" | \"landlord\" | \"applicant\" | \"tenant\""
]);

assertIncludes("src/lib/documents/center.ts", [
  "base: \"admin\" | \"landlord\" | \"applicant\" | \"tenant\"",
  "base === \"tenant\" ? \"/tenant/lease\""
]);

assertIncludes("src/components/notices/NoticeCenterView.tsx", [
  "basePath: \"admin\" | \"landlord\" | \"applicant\" | \"tenant\"",
  "basePath === \"applicant\" || basePath === \"tenant\""
]);

assertIncludes("src/components/tasks/TaskCenterView.tsx", [
  "basePath: \"admin\" | \"landlord\" | \"applicant\" | \"tenant\"",
  "basePath !== \"applicant\" && basePath !== \"tenant\""
]);

assertIncludes("src/components/calendar/CalendarCenterView.tsx", [
  "basePath: \"admin\" | \"landlord\" | \"applicant\" | \"tenant\""
]);

assertIncludes("src/lib/navigation/first-release.ts", [
  "{ href: \"/tenant/lease\", label: \"Lease\"",
  "{ href: \"/tenant/payments\", label: \"Rent\"",
  "{ href: \"/tenant/maintenance\", label: \"Maintenance\"",
  "{ href: \"/tenant/documents\", label: \"Documents\"",
  "{ href: \"/tenant/notices\", label: \"Notices\"",
  "{ href: \"/tenant/inspections\", label: \"Inspections\"",
  "{ href: \"/tenant/ledger\", label: \"Ledger\"",
  "{ href: \"/tenant/inbox\", label: \"Inbox\"",
  "{ href: \"/tenant/tasks\", label: \"Tasks\"",
  "{ href: \"/tenant/calendar\", label: \"Calendar\"",
  "tenant: dashboard -> current lease/rent -> maintenance -> inbox -> documents/notices/inspections"
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.0\"",
  "\"tenant-portal:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.59.0"]);
assertIncludes("README.md", ["Current package version: **4.59.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.0 - Final Readiness Layer"]);

console.log("Tenant portal completion verification passed.");
