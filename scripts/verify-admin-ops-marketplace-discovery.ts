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
    throw new Error(`${path} is missing admin ops / marketplace discovery markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/ADMIN_OPS_MARKETPLACE_DISCOVERY.md");
assertIncludes("docs/ADMIN_OPS_MARKETPLACE_DISCOVERY.md", [
  "Admin Operations Authority",
  "Marketplace Production Discovery Polish",
  "`#access-requests`",
  "`#data-quality`",
  "`#blocked-workflows`",
  "`#failed-integrations`",
  "`#production-health`",
  "`#sample-data`",
  "`#security`",
  "`#audit-logs`",
  "admin-ops-marketplace-discovery:verify"
]);

assertIncludes("src/lib/navigation/first-release.ts", [
  "{ href: \"/admin#access-requests\", label: \"Access Requests\"",
  "{ href: \"/admin#data-quality\", label: \"Data Quality\"",
  "{ href: \"/admin#blocked-workflows\", label: \"Workflows\"",
  "{ href: \"/admin#failed-integrations\", label: \"Integrations\"",
  "{ href: \"/admin#production-health\", label: \"Health\"",
  "{ href: \"/admin#sample-data\", label: \"Sample Data\"",
  "admin: command center -> access/data quality/workflows/integrations/security/sample data/audit/health"
]);

assertIncludes("src/app/admin/layout.tsx", [
  "Authoritative platform operations",
  "quickCreateHref=\"/admin\""
]);

assertIncludes("src/components/admin/AdminCommandCenter.tsx", [
  "function OperationsDirectory",
  "Authoritative operations map",
  "Everything operational starts here.",
  "id=\"operations-directory\"",
  "id=\"access-requests\"",
  "id=\"data-quality\"",
  "id=\"blocked-workflows\"",
  "id=\"failed-integrations\"",
  "id=\"production-health\"",
  "id=\"sample-data\"",
  "id=\"security\"",
  "id=\"audit-logs\"",
  "/admin/command-center/drilldowns?key=applications-waiting-review"
]);

assertIncludes("src/app/marketplace/page.tsx", [
  "const quickDiscoveryLinks",
  "name=\"availableBy\"",
  "aria-label=\"Availability date\"",
  "Voucher-friendly",
  "Pet notes",
  "Utilities noted",
  "Available now",
  "Lowest rent",
  "Quality-gated listings.",
  "Search state is shareable.",
  "Privacy-aware location.",
  "href=\"/applicant/favorites\""
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.2\"",
  "\"admin-ops-marketplace-discovery:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.59.2"]);
assertIncludes("README.md", ["Current package version: **4.59.2**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.2 - Admin Command Center Null Date Fix"]);

console.log("Admin operations authority and marketplace discovery verification passed.");
