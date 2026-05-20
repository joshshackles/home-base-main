import { existsSync, readFileSync } from "node:fs";
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

function assertNotExists(path: string) {
  if (existsSync(join(root, path))) {
    throw new Error(`${path} should not be present in the first-release package.`);
  }
}

assertIncludes("package.json", [
  "\"version\": \"4.59.0\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run routes:check && npm run package:cleanliness && npm run typecheck && npm run test\"",
  "\"first-release:verify\"",
  "\"permission-matrix:verify\"",
  "\"authorization-runtime:verify\"",
  "\"protected-routes:verify\"",
  "\"middleware-static:verify\"",
  "\"environment-contract:verify\"",
  "\"expanded-access:verify\"",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify"
]);

assertIncludes("src/lib/navigation/first-release.ts", [
  "applicantNavGroups",
  "tenantNavGroups",
  "landlordNavGroups",
  "inspectorNavGroups",
  "vendorNavGroups",
  "adminNavGroups",
  "firstReleasePathways"
]);

for (const [path, marker] of [
  ["src/app/applicant/layout.tsx", "applicantNavGroups"],
  ["src/app/tenant/layout.tsx", "tenantNavGroups"],
  ["src/app/landlord/layout.tsx", "landlordNavGroups"],
  ["src/app/inspector/layout.tsx", "inspectorNavGroups"],
  ["src/app/vendor/layout.tsx", "vendorNavGroups"],
  ["src/app/admin/layout.tsx", "adminNavGroups"]
] as const) {
  assertIncludes(path, [marker, "quickCreateLabel"]);
}

assertIncludes("src/components/layout/DashboardShell.tsx", [
  "quickCreateLabel",
  "{quickCreateLabel}"
]);

assertIncludes("src/lib/authorization.ts", [
  "canAccessListing",
  "canAccessLead",
  "assertCanAccessListing",
  "assertCanAccessLead"
]);

assertIncludes("src/app/api/unit-photos/[id]/route.ts", [
  "canAccessUnit",
  "Photo not found."
]);

assertIncludes("src/lib/admin/permissions.ts", ["canManageAdminOperations"]);
assertIncludes("FIRST_RELEASE_CODEBASE_AUDIT.md", [
  "First-Release Product Pathways",
  "What Should Stay",
  "What Was Removed",
  "Live-Release Risks",
  "Recommended Final Architecture"
]);
assertIncludes("src/lib/app-version.ts", ["4.59.0"]);
assertIncludes("README.md", ["Current package version: **4.59.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.0 - Final Readiness Layer"]);

assertNotExists("src/components/dashboard/WorkhorseDashboard.tsx");
assertNotExists("tsconfig.tsbuildinfo");

console.log("First-release codebase readiness verification passed.");
