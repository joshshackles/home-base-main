import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/tenant/layout.tsx",
    markers: [
      "Tenant portal",
      "Resident operations",
      "/tenant/payments",
      "/tenant/maintenance",
      "/tenant/lease",
      "/tenant/documents",
      "/tenant/inbox",
      "requireRole([\"TENANT\"], \"/tenant\")"
    ]
  },
  {
    file: "src/app/tenant/page.tsx",
    markers: [
      "buildDashboardForModule(user, \"tenant\")",
      "RoleDashboard",
      "requireRole([\"TENANT\"], \"/tenant\")"
    ]
  },
  {
    file: "src/app/tenant/_redirects.ts",
    markers: [
      "redirectTenantWorkflow",
      "requireRole([\"TENANT\"], \"/tenant\")",
      "redirect(target)"
    ]
  },
  {
    file: "src/lib/dashboard/role-config.ts",
    markers: ["tenant: \"/tenant\""]
  },
  {
    file: "src/lib/dashboard/role-dashboard.ts",
    markers: [
      "href: \"/tenant\"",
      "/tenant/payments",
      "/tenant/maintenance",
      "/tenant/leases",
      "/tenant/inbox",
      "/tenant/notices"
    ]
  },
  {
    file: "src/components/layout/DashboardShell.tsx",
    markers: ["Search,"]
  },
  {
    file: "docs/DEDICATED_TENANT_PORTAL.md",
    markers: [
      "Version: 4.39.0",
      "first-class `/tenant` portal",
      "No Fake Data"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.39.0 - Dedicated Tenant Portal"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.39.0\"", "dedicated-tenant-portal:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.39.0"]
  }
];

const redirectChecks: Array<{ file: string; target: string }> = [
  { file: "src/app/tenant/payments/page.tsx", target: "/applicant/payments" },
  { file: "src/app/tenant/maintenance/page.tsx", target: "/applicant/maintenance" },
  { file: "src/app/tenant/leases/page.tsx", target: "/applicant/leases" },
  { file: "src/app/tenant/lease/page.tsx", target: "/applicant/leases" },
  { file: "src/app/tenant/documents/page.tsx", target: "/applicant/documents" },
  { file: "src/app/tenant/notices/page.tsx", target: "/applicant/notices" },
  { file: "src/app/tenant/inspections/page.tsx", target: "/applicant/inspections" },
  { file: "src/app/tenant/calendar/page.tsx", target: "/applicant/calendar" },
  { file: "src/app/tenant/inbox/page.tsx", target: "/applicant/inbox" },
  { file: "src/app/tenant/notifications/page.tsx", target: "/applicant/notifications" },
  { file: "src/app/tenant/ledger/page.tsx", target: "/applicant/ledger" },
  { file: "src/app/tenant/tasks/page.tsx", target: "/applicant/tasks" }
];

const failures: string[] = [];

for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!text.includes(marker)) failures.push(`${check.file} is missing marker: ${marker}`);
  }
}

for (const check of redirectChecks) {
  const text = readFileSync(check.file, "utf8");
  if (!text.includes("redirectTenantWorkflow")) failures.push(`${check.file} does not use the protected tenant redirect helper.`);
  if (!text.includes(check.target)) failures.push(`${check.file} does not redirect to ${check.target}.`);
}

if (failures.length > 0) {
  console.error("Dedicated tenant portal verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Dedicated tenant portal verification passed.");
