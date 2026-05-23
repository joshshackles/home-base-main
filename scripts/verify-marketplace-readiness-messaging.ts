import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing marketplace readiness / messaging markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertNotIncludes(path: string, markers: string[]) {
  const source = read(path);
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`${path} still contains retired markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/MARKETPLACE_READINESS_UNIFIED_MESSAGING.md");
assertIncludes("docs/MARKETPLACE_READINESS_UNIFIED_MESSAGING.md", [
  "Marketplace Readiness",
  "Unified Messaging Canonicalization",
  "getPublicLocationLabel",
  "marketplace-readiness-messaging:verify"
]);

assertIncludes("src/lib/marketplace/listings.ts", [
  "MARKETPLACE_RESULT_LIMIT",
  "rentAmount: { gt: 0 }",
  "bathrooms: { gt: 0 }",
  "photos: { some: {} }",
  "getListingQualityGaps",
  "getPublicLocationLabel"
]);
assertNotIncludes("src/lib/marketplace/listings.ts", [
  "property: { addressLine: { contains: input.q"
]);

assertIncludes("src/components/UnitCard.tsx", [
  "getPublicLocationLabel(unit)"
]);
assertNotIncludes("src/components/UnitCard.tsx", [
  "{unit.property.addressLine}, {unit.property.zip}"
]);

assertIncludes("src/app/marketplace/[unitId]/page.tsx", [
  "getListingQualityGaps",
  "getPublicLocationLabel",
  "Exact address shared only when the rental team allows it",
  "Marketplace detail and address privacy",
  "Area map"
]);

assertIncludes("src/app/marketplace/page.tsx", [
  "Quality-gated listings.",
  "Privacy-aware location.",
  "Remove {chip.label}",
  "without exposing exact addresses",
  "getPublicLocationLabel(unit)"
]);

assertIncludes("src/app/marketplace/actions.ts", [
  "deleteMarketplaceSearch",
  "deleteMany",
  "where: { id: searchId, userId: user.userId }"
]);
assertIncludes("src/app/applicant/favorites/page.tsx", [
  "deleteMarketplaceSearch",
  "Saved search removed.",
  "Run search",
  "Remove"
]);

assertIncludes("src/lib/messaging/landlord-unified-inbox.ts", [
  "Compatibility facade",
  "buildUnifiedLandlordInbox as buildLandlordUnifiedInbox",
  "from \"@/lib/messaging/unified-landlord-inbox\""
]);
assertIncludes("src/app/landlord/inbox/page.tsx", [
  "from \"@/lib/messaging/unified-landlord-inbox\""
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.5\"",
  "\"marketplace-readiness-messaging:verify\"",
  "admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify"
]);
assertIncludes("src/lib/app-version.ts", ["4.61.5"]);
assertIncludes("README.md", ["Current package version: **4.61.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.5 - Version Consistency Metadata Cleanup"]);

console.log("Marketplace readiness and unified messaging canonicalization verification passed.");
