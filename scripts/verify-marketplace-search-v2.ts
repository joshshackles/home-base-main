import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "prisma/schema.prisma",
    markers: [
      "availableOn     DateTime?",
      "model SavedMarketplaceSearch",
      "savedMarketplaceSearches SavedMarketplaceSearch[]",
      "filters   Json"
    ]
  },
  {
    file: "prisma/migrations/20260519201000_marketplace_search_v2/migration.sql",
    markers: [
      "ALTER TABLE \"Unit\" ADD COLUMN \"availableOn\"",
      "CREATE TABLE \"SavedMarketplaceSearch\"",
      "SavedMarketplaceSearch_userId_fkey"
    ]
  },
  {
    file: "src/lib/marketplace/listings.ts",
    markers: [
      "availability?: string",
      "availableBy?: Date",
      "available-soonest",
      "AND: andFilters",
      "availableOn"
    ]
  },
  {
    file: "src/app/marketplace/actions.ts",
    markers: [
      "saveMarketplaceSearch",
      "requireUser(\"/marketplace\")",
      "prisma.savedMarketplaceSearch.create",
      "filters"
    ]
  },
  {
    file: "src/app/marketplace/page.tsx",
    markers: [
      "MarketplaceFilterForm",
      "Save Search",
      "Sign In to Save Search",
      "No exact matches",
      "Broader real matches",
      "availableBy",
      "savedSearches"
    ]
  },
  {
    file: "src/components/UnitCard.tsx",
    markers: [
      "availableOn?: Date | null",
      "availabilityLabel",
      "Available now",
      "/login?next=/marketplace"
    ]
  },
  {
    file: "src/app/applicant/favorites/page.tsx",
    markers: [
      "savedMarketplaceSearch.findMany",
      "Saved searches",
      "savedSearchHref"
    ]
  },
  {
    file: "docs/MARKETPLACE_SEARCH_V2.md",
    markers: [
      "Version: 4.41.0",
      "SavedMarketplaceSearch",
      "No Fake Data"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.41.0 - Marketplace Search v2"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.59.1\"", "marketplace-search-v2:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.59.1"]
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
  console.error("Marketplace Search v2 verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Marketplace Search v2 verification passed.");
