import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/page.tsx",
    markers: [
      "Find housing faster. Manage rentals smarter.",
      "HomeSearchPanel",
      "AudiencePathways",
      "MarketplaceCredibility",
      "ProductPreview",
      "FeaturedListings",
      "TrustSection",
      "FinalCTA",
      "status: UnitStatus.AVAILABLE",
      "marketingStatus: \"ACTIVE\"",
      "The homepage is not showing demo rentals",
      "voucherFriendly",
      "minRent",
      "maxRent",
      "/marketplace",
      "/signup?intent=landlord"
    ]
  },
  {
    file: "docs/ENTERPRISE_PUBLIC_HOMEPAGE.md",
    markers: ["Version: 4.37.0", "Implemented Sections", "Data Behavior", "No fake live listings"]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.37.0 - Enterprise Public Homepage"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.37.0\"", "enterprise-homepage:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.37.0"]
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
  console.error("Enterprise homepage verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Enterprise homepage verification passed.");
