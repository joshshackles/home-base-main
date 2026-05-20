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
    throw new Error(`${path} is missing expanded-access scoping markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/EXPANDED_ACCESS_SCOPING.md");

assertIncludes("docs/EXPANDED_ACCESS_SCOPING.md", [
  "Property Manager & Expanded Access Scoping",
  "Approved `AccountAccessRequest` records let a user open the right workspace",
  "Property manager",
  "Caseworker / housing coordinator",
  "Inspector",
  "Maintenance/vendor",
  "canManageOwnerPortfolio"
]);

assertIncludes("src/lib/authorization.ts", [
  "ConnectionRole",
  "propertyManagerConnectionRoles",
  "housingSupportConnectionRoles",
  "maintenanceConnectionRoles",
  "inspectionConnectionRoles",
  "export function isLandlordOwner",
  "export async function canManageOwnerPortfolio",
  "async function canSupportHousingRecord",
  "async function canSupportMaintenanceRecord",
  "async function canSupportInspectionRecord",
  "propertyManagerUserId",
  "maintenanceUserId",
  "caseworkerUserId",
  "assignedRole: { in: roles }"
]);

assertIncludes("tests/unit/authorization.test.ts", [
  "allows a property manager to access only the owner portfolio they are connected to",
  "lets connected caseworkers support housing records without granting ledger access",
  "does not let inspector approval open unrelated inspections without assignment or scoped connection",
  "requires role-specific active profile connections before sharing connected unit access",
  "ConnectionRole.PROPERTY_MANAGER",
  "ConnectionRole.CASEWORKER"
]);

assertIncludes("scripts/verify-authorization-runtime-tests.ts", [
  "allows a property manager to access only the owner portfolio they are connected to",
  "lets connected caseworkers support housing records without granting ledger access",
  "does not let inspector approval open unrelated inspections"
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.1\"",
  "\"expanded-access:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.59.1"]);
assertIncludes("README.md", ["Current package version: **4.59.1**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.1 - Landlord Units Typecheck Fix"]);

console.log("Expanded access scoping verification passed.");
