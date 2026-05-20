import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/marketplace/page.tsx",
    markers: [
      "MapPinned",
      "viewMode",
      "Map preview",
      "List",
      "LocationPreviewPanel",
      "buildAreaGroups",
      "Map preview mode",
      "Exact interactive markers require latitude/longitude",
      "Future full map support should add geocoded latitude/longitude fields",
      "xl:grid-cols-[260px_minmax(0,1fr)_420px]"
    ]
  },
  {
    file: "docs/MARKETPLACE_MAP_LIST_EXPERIENCE.md",
    markers: [
      "Version: 4.42.0",
      "map-preview mode",
      "does not invent coordinates",
      "No Fake Data"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.42.0 - Marketplace Map/List Experience"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.61.2\"", "marketplace-map-list:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.61.2"]
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
  console.error("Marketplace map/list experience verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Marketplace map/list experience verification passed.");
