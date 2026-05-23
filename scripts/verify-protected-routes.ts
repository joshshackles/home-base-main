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
    throw new Error(`${path} is missing protected-route markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`${path} still contains stale protected-route markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

assertExists("src/lib/security/protected-routes.ts");
assertExists("docs/PROTECTED_ROUTE_ACCESS_MANIFEST.md");

assertIncludes("src/lib/security/protected-routes.ts", [
  "PROTECTED_ROUTE_PREFIXES",
  "PROTECTED_ROUTE_MATCHERS",
  "\"/admin\"",
  "\"/landlord\"",
  "\"/applicant\"",
  "\"/tenant\"",
  "\"/vendor\"",
  "\"/inspector\"",
  "\"/account\"",
  "\"/dashboard\"",
  "\"/documents\""
]);

assertIncludes("src/middleware.ts", [
  "PROTECTED_ROUTE_PREFIXES",
  "request.nextUrl.pathname.startsWith(prefix)",
  "loginUrl.searchParams.set(\"next\", request.nextUrl.pathname)",
  "Keep this literal for Next.js static matcher analysis",
  "matcher: ["
]);
assertExcludes("src/middleware.ts", ["const protectedPrefixes = [", "matcher: PROTECTED_ROUTE_MATCHERS"]);

assertIncludes("src/app/admin/layout.tsx", ["requireWorkspaceAccess(\"admin\"", "filterNavGroupsByCapabilities"]);
assertIncludes("src/app/landlord/layout.tsx", ["requireWorkspaceAccess(\"landlord\"", "filterNavGroupsByCapabilities"]);
assertIncludes("src/app/applicant/layout.tsx", ["requireWorkspaceAccess(\"applicant\"", "filterNavGroupsByCapabilities"]);
assertIncludes("src/app/tenant/layout.tsx", ["requireWorkspaceAccess(\"tenant\"", "filterNavGroupsByCapabilities"]);
assertIncludes("src/app/vendor/layout.tsx", ["requireUser(\"/vendor\")", "assertVendorPortalAccess(user)"]);
assertIncludes("src/app/inspector/layout.tsx", ["requireWorkspaceAccess(\"inspector\"", "filterNavGroupsByCapabilities"]);
assertIncludes("src/app/dashboard/page.tsx", ["requireUser(\"/dashboard\")", "buildDashboardForUser"]);
assertIncludes("src/app/documents/page.tsx", ["getVerifiedCurrentUser", "redirect(\"/login?next=/documents\")"]);

assertIncludes("docs/PROTECTED_ROUTE_ACCESS_MANIFEST.md", [
  "Protected Route Access Manifest",
  "Middleware-Protected Workspaces",
  "Applicant routes now require applicant workspace access",
  "protected-routes:verify",
  "middleware-static:verify"
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.4\"",
  "\"protected-routes:verify\"",
  "\"middleware-static:verify\"",
  "\"environment-contract:verify\"",
  "\"expanded-access:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify && npm run admin-command-center-inspection-title-fix:verify && npm run lead-authorization-relation-fix:verify && npm run maintenance-priority-enum-fix:verify && npm run role-visibility-workflow-simplification:verify && npm run homepage-slider-marketplace-refresh:verify && npm run tenant-nav-minimum-fix:verify && npm run admin-branding-slide-search-param-fix:verify && npm run dashboard-shell-sparkles-icon-fix:verify && npm run homepage-reference-fidelity-pass:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.61.4"]);
assertIncludes("README.md", ["Current package version: **4.61.4**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.4 - Homepage Reference Fidelity Pass"]);

console.log("Protected route access verification passed.");
