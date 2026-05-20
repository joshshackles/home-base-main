import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/lib/dashboard/role-config.ts",
    markers: ["UserRole", "AccountAccessType", "roleToPrimaryModule", "accessTypeToModule", "PROPERTY_MANAGER", "MAINTENANCE"]
  },
  {
    file: "src/lib/dashboard/permissions.ts",
    markers: ["getUserDashboardAccess", "APPROVED", "canAccessDashboardModule", "getDashboardHomeForRole"]
  },
  {
    file: "src/lib/dashboard/role-dashboard.ts",
    markers: [
      "buildDashboardForUser",
      "buildDashboardForModule",
      "buildApplicantDashboard",
      "buildTenantDashboard",
      "buildLandlordDashboard",
      "buildInspectorDashboard",
      "buildVendorDashboard",
      "buildAdminDashboard",
      "propertyManagerUserId: user.userId",
      "assignedToId: user.userId",
      "getVendorPortal(user.userId)"
    ]
  },
  {
    file: "src/components/dashboard/RoleDashboard.tsx",
    markers: ["Needs attention", "Tools and shortcuts", "Account access", "approved account access", "Workflow map"]
  },
  {
    file: "src/app/dashboard/page.tsx",
    markers: ["requireUser", "buildDashboardForUser", "RoleDashboard"]
  },
  {
    file: "src/app/inspector/page.tsx",
    markers: ["requireRole([\"INSPECTOR\"]", "buildDashboardForModule", "RoleDashboard"]
  },
  {
    file: "src/app/inspector/layout.tsx",
    markers: ["requireRole([\"INSPECTOR\"]", "DashboardShell", "Inspection workflow"]
  },
  {
    file: "src/app/admin/page.tsx",
    markers: ["buildDashboardForModule", "\"admin\"", "RoleDashboard"]
  },
  {
    file: "src/app/vendor/page.tsx",
    markers: ["buildDashboardForModule", "\"vendor\"", "RoleDashboard"]
  },
  {
    file: "docs/ROLE_BASED_DASHBOARD_SYSTEM.md",
    markers: ["Version: 4.36.0", "Server-Side Permission Rules", "/dashboard"]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.36.0 - Role-Based Dashboard System"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.36.0\"", "role-dashboard-system:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.36.0"]
  }
];

const failures: string[] = [];

for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!text.includes(marker)) failures.push(`${check.file} is missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Role dashboard system verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Role dashboard system verification passed.");
