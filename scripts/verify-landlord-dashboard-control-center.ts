import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/landlord/page.tsx",
    markers: [
      "Landlord operating console",
      "Needs attention",
      "Recent messages and questions",
      "Applications pipeline",
      "Property and unit health",
      "Units needing action",
      "Maintenance snapshot",
      "unreadThreadCount",
      "missingListingCopy",
      "Reply to messages"
    ]
  },
  {
    file: "src/app/landlord/applications/page.tsx",
    markers: [
      "Review queue",
      "Signed packets",
      "Open packet",
      "Reply",
      "applicationDetail",
      "messageThreads",
      "householdMembers",
      "incomeSources"
    ]
  },
  {
    file: "src/app/landlord/units/page.tsx",
    markers: [
      "Search rentals",
      "Unit status",
      "All listings",
      "RentalMarketingStatus",
      "mode: \"insensitive\""
    ]
  },
  {
    file: "docs/LANDLORD_DASHBOARD_CONTROL_CENTER.md",
    markers: [
      "Version: 4.34.0",
      "Evaluation Summary",
      "Implemented Upgrade",
      "Remaining Follow-Up Opportunities"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.34.0 - Landlord Dashboard Control Center"]
  },
  {
    file: "package.json",
    markers: [
      "\"version\": \"4.34.0\"",
      "landlord-dashboard-control-center:verify"
    ]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.34.0"]
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
  console.error("Landlord dashboard control center verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Landlord dashboard control center verification passed.");
