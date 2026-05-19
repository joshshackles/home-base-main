import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(relativePath: string, needles: string[]) {
  const contents = read(relativePath);
  for (const needle of needles) {
    if (!contents.includes(needle)) throw new Error(`${relativePath} is missing expected text: ${needle}`);
  }
}

function assertExists(relativePath: string) {
  if (!existsSync(path.join(root, relativePath))) throw new Error(`${relativePath} does not exist.`);
}

assertContains("prisma/schema.prisma", [
  "propertyManagerUserId",
  "maintenanceUserId",
  "caseworkerUserId",
  "UnitPropertyManagers",
  "UnitMaintenanceAssignees",
  "UnitCaseworkers"
]);
assertExists("prisma/migrations/20260518000000_squashed_operational_foundation/migration.sql");
assertContains("prisma/migrations/20260518000000_squashed_operational_foundation/migration.sql", [
  "propertyManagerUserId",
  "maintenanceUserId",
  "caseworkerUserId"
]);

assertContains("src/components/landlord/LandlordUnitForm.tsx", [
  "Rental photos",
  "type=\"file\"",
  "The first photo becomes the featured marketplace photo"
]);
assertContains("src/components/landlord/SingleFamilyHomeForm.tsx", [
  "Home photos",
  "type=\"file\""
]);

assertContains("src/app/landlord/actions.ts", [
  "assignLandlordUnitTenant",
  "status: UnitStatus.OCCUPIED",
  "reset-password?token=",
  "assignLandlordUnitStaff",
  "addLandlordUnitContact",
  "updateLandlordUnitTerms",
  "assignedToId: unit.maintenanceUserId"
]);

assertContains("src/app/landlord/units/[id]/page.tsx", [
  "Unit profile",
  "Assign Tenant",
  "Unlock and edit financial terms",
  "Add contact",
  "Assigned Support",
  "Messages are saved to the shared inbox thread"
]);

console.log("Landlord unit workflow verification passed.");
