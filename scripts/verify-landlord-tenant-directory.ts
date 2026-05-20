import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/landlord/tenants/page.tsx",
    markers: [
      "Tenant Directory",
      "requireRole([\"LANDLORD\"]",
      "ownerScope",
      "unit: { property: ownerScope }",
      "Search by name, address, email, phone, property, or unit",
      "Share authorized",
      "Share pending",
      "Unread message",
      "Clear filters",
      "pageSize = 24",
      "profileCompleteness",
      "Reply to question"
    ]
  },
  {
    file: "src/app/landlord/tenants/[id]/page.tsx",
    markers: [
      "requireRole([\"LANDLORD\"]",
      "application-",
      "lead-",
      "occupancy-",
      "unit: { property: ownerScope }",
      "Reusable profile locked",
      "Limited lead view",
      "Application packet",
      "Household and income",
      "Reply to latest question"
    ]
  },
  {
    file: "src/app/landlord/layout.tsx",
    markers: ["/landlord/tenants", "Tenants"]
  },
  {
    file: "docs/LANDLORD_TENANT_DIRECTORY.md",
    markers: [
      "Version: 4.35.0",
      "Privacy Model",
      "Implemented Upgrade",
      "Remaining Follow-Up Opportunities"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.35.0 - Landlord Tenant Directory"]
  },
  {
    file: "package.json",
    markers: [
      "\"version\": \"4.35.0\"",
      "landlord-tenant-directory:verify"
    ]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.35.0"]
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
  console.error("Landlord tenant directory verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Landlord tenant directory verification passed.");
