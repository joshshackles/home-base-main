import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertContains(path: string, needle: string) {
  const contents = read(path);
  if (!contents.includes(needle)) throw new Error(`${path} is missing ${needle}`);
}

function assertNotContains(path: string, needle: string) {
  const contents = read(path);
  if (contents.includes(needle)) throw new Error(`${path} still contains ${needle}`);
}

assertContains("package.json", '"version": "4.61.4"');
assertContains("package.json", '"role-visibility-workflow-simplification:verify": "tsx scripts/verify-role-visibility-workflow-simplification.ts"');
assertContains("CHANGELOG.md", "## v4.61.4 - Homepage Reference Fidelity Pass");

assertContains("src/lib/role-capabilities.ts", "ROLE_CAPABILITY_MAP");
assertContains("src/lib/role-capabilities.ts", "minimum necessary interface");
assertContains("src/lib/role-capabilities.ts", '"applicant.dashboard"');
assertContains("src/lib/role-capabilities.ts", '"tenant.dashboard"');
assertContains("src/lib/role-capabilities.ts", '"landlord.dashboard"');
assertContains("src/lib/role-capabilities.ts", '"caseworker.clients"');
assertContains("src/lib/role-capabilities.ts", '"inspector.assignments"');
assertContains("src/lib/role-capabilities.ts", '"vendor.jobs"');
assertContains("src/lib/role-capabilities.ts", '"admin.command-center"');
assertContains("src/lib/role-capabilities.ts", '"super-admin.security"');
assertContains("src/lib/role-capabilities.ts", "filterNavGroupsByCapabilities");

assertContains("src/lib/role-capabilities.server.ts", "getUserCapabilitySet");
assertContains("src/lib/role-capabilities.server.ts", "requireWorkspaceAccess");
assertContains("src/lib/role-capabilities.server.ts", "requireCapability");
assertContains("src/lib/role-capabilities.server.ts", "AccountAccessRequestStatus.APPROVED");
assertContains("src/lib/role-capabilities.server.ts", "AccountAccessType.VENDOR");
assertContains("src/lib/role-capabilities.server.ts", "ConnectionRole.PREFERRED_VENDOR");
assertContains("src/lib/role-capabilities.server.ts", "redirect(getHomeForCapabilitySet");

assertContains("src/components/layout/DashboardShell.tsx", "capability?: RoleCapabilityKey");
assertContains("src/lib/navigation/first-release.ts", 'capability: "applicant.dashboard"');
assertContains("src/lib/navigation/first-release.ts", 'capability: "tenant.dashboard"');
assertContains("src/lib/navigation/first-release.ts", 'capability: "landlord.inbox"');
assertContains("src/lib/navigation/first-release.ts", 'capability: "super-admin.audit"');
assertNotContains("src/lib/navigation/first-release.ts", 'label: "Role Home"');
assertNotContains("src/lib/navigation/first-release.ts", 'href: "/landlord/leads"');

for (const path of [
  "src/app/applicant/layout.tsx",
  "src/app/tenant/layout.tsx",
  "src/app/landlord/layout.tsx",
  "src/app/inspector/layout.tsx",
  "src/app/vendor/layout.tsx",
  "src/app/admin/layout.tsx"
]) {
  assertContains(path, "requireWorkspaceAccess");
  assertContains(path, "filterNavGroupsByCapabilities");
}

assertNotContains("src/app/applicant/layout.tsx", '"TENANT"');
assertNotContains("src/lib/dashboard/permissions.ts", 'modules.add("landlord")');
assertContains("src/app/admin/audit/page.tsx", 'requireCapability("super-admin.audit"');
assertContains("src/app/admin/security/page.tsx", 'requireCapability("super-admin.security"');
assertContains("src/app/admin/security/events/page.tsx", 'requireCapability("super-admin.security"');
assertContains("src/lib/vendors/index.ts", "AccountAccessType.MAINTENANCE");
assertContains("docs/ROLE_VISIBILITY_WORKFLOW_SIMPLIFICATION.md", "minimum necessary interface");

console.log("Role visibility and workflow simplification verification passed.");
