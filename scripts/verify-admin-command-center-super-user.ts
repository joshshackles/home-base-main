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

assertIncludes("prisma/schema.prisma", ["enum AccountAccessType", "SUPER_USER"]);
assertIncludes("prisma/migrations/20260520000000_add_super_user_access_type/migration.sql", ["ADD VALUE IF NOT EXISTS 'SUPER_USER'"]);

assertIncludes("src/lib/admin/permissions.ts", [
  "requireSuperUser",
  "canAccessAdminCommandCenter",
  "canManageSampleData",
  "canViewSecurityAlerts",
  "assertSuperUser",
  "AccountAccessType.SUPER_USER",
  "bootstrapMode"
]);

assertIncludes("src/lib/admin/command-center.ts", [
  "getAdminCommandCenterModel",
  "getDataQualityIssues",
  "getFailedIntegrationIssues",
  "getBlockedWorkflowIssues",
  "getDeploymentReadinessChecks",
  "sample-data",
  "securityEvent",
  "auditLog"
]);

assertIncludes("src/components/admin/AdminCommandCenter.tsx", [
  "Admin Command Center",
  "Access Requests",
  "Data Quality",
  "Failed Integrations",
  "Blocked Workflows",
  "Sample Data Controls",
  "Production Health",
  "Security Alerts",
  "Recent Audit Activity",
  "reviewAccountAccessAction"
]);

assertIncludes("src/app/admin/page.tsx", ["AdminCommandCenter", "requireAdmin", "getAdminCommandCenterModel"]);
assertIncludes("src/app/admin/command-center/page.tsx", ["requireSuperUser", "AdminCommandCenter"]);
assertIncludes("src/app/account/actions.ts", ["assertSuperUser", "isElevatedAccessType", "AccountAccessType.SUPER_USER"]);
assertIncludes("src/app/admin/layout.tsx", ["Command Center", "/admin/command-center", "Super User"]);
assertIncludes("scripts/check-routes.ts", ["/admin/command-center"]);
assertIncludes("src/lib/dashboard/role-config.ts", ["SUPER_USER: \"admin\""]);
assertIncludes("src/lib/validation.ts", ["Super user access must be granted"]);
assertIncludes("docs/ADMIN_COMMAND_CENTER_SUPER_USER.md", ["Version: 4.44.0", "Super User Model", "Server-Side Guards"]);
assertIncludes("package.json", ["\"version\": \"4.44.0\"", "\"admin-command-center-super-user:verify\""]);
assertIncludes("src/lib/app-version.ts", ["4.44.0"]);
assertIncludes("README.md", ["Current package version: **4.44.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.44.0 - Admin Command Center & Super User"]);

console.log("Admin command center and super user verification passed.");
