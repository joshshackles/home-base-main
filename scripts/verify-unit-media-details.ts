import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(relativePath: string, needles: string[]) {
  const contents = read(relativePath);
  for (const needle of needles) {
    if (!contents.includes(needle)) {
      throw new Error(`${relativePath} is missing expected text: ${needle}`);
    }
  }
}

function assertExists(relativePath: string) {
  if (!existsSync(path.join(root, relativePath))) throw new Error(`${relativePath} does not exist.`);
}

assertContains("prisma/schema.prisma", [
  "model UnitPhoto",
  "photos       UnitPhoto[]",
  "schoolDistrict",
  "averageUtilityBill",
  "previousTenantNotes"
]);

assertExists("prisma/migrations/20260518000000_squashed_operational_foundation/migration.sql");
assertContains("prisma/migrations/20260518000000_squashed_operational_foundation/migration.sql", [
  "CREATE TABLE \"UnitPhoto\"",
  "schoolDistrict",
  "averageUtilityBill"
]);
assertExists("src/app/api/unit-photos/[id]/route.ts");

assertContains("src/app/landlord/actions.ts", [
  "MAX_UNIT_PHOTOS = 12",
  "uploadLandlordUnitPhotos",
  "setFeaturedLandlordUnitPhoto",
  "deleteLandlordUnitPhoto",
  "saveUploadedDocument"
]);

assertContains("src/components/landlord/LandlordUnitForm.tsx", [
  "schoolDistrict",
  "nearbyFeatures",
  "averageUtilityBill",
  "previousTenantNotes"
]);

assertContains("src/components/landlord/SingleFamilyHomeForm.tsx", [
  "School district",
  "Average utility bill",
  "Move-in fees",
  "Late fee policy"
]);

assertContains("src/app/landlord/units/page.tsx", [
  "photos:",
  "Open rental workspace",
  "/api/unit-photos/"
]);

assertContains("src/app/landlord/units/[id]/page.tsx", [
  "Upload Photos",
  "Featured photo",
  "Rent, Deposit, and Move-In Terms",
  "Tenant History",
  "Listing and Location Details"
]);

assertContains("src/components/UnitCard.tsx", [
  "unit.photos",
  "/api/unit-photos/",
  "utils"
]);

assertContains("src/app/marketplace/[unitId]/page.tsx", [
  "unit.photos",
  "School district",
  "Nearby features",
  "Move-in fees"
]);

assertContains("src/lib/data-portability.ts", ["unitPhotos"]);

console.log("Unit media and listing detail verification passed.");
