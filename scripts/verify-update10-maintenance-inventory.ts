import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "src/lib/maintenance-inventory.ts",
  "src/components/operations/MaintenanceInventoryModule.tsx",
  "src/app/admin/inventory/page.tsx",
  "src/app/landlord/inventory/page.tsx",
  "prisma/migrations/20260518160000_screening_inventory_compliance_integrations/migration.sql"
];

const requiredSchema = [
  "model MaintenanceAsset",
  "model AssetServiceRecord",
  "model AssetWarranty",
  "model KeyLockRecord",
  "enum MaintenanceAssetType",
  "enum MaintenanceAssetStatus"
];

const requiredActions = [
  "createAdminMaintenanceAssetAction",
  "createAdminAssetServiceRecordAction",
  "createAdminAssetWarrantyAction",
  "createAdminKeyLockRecordAction",
  "createLandlordMaintenanceAssetAction",
  "createLandlordAssetServiceRecordAction",
  "createLandlordAssetWarrantyAction",
  "createLandlordKeyLockRecordAction"
];

const requiredUi = [
  "Add asset",
  "Log service history",
  "Attach warranty",
  "Track keys and locks",
  "MaintenanceAssetType.KEY",
  "serialNumber",
  "warrantyExpiresAt",
  "nextServiceDueAt"
];

function assertIncludes(file: string, needle: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(needle)) throw new Error(`${file} is missing ${needle}`);
}

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing required update 10 file: ${file}`);
}

for (const needle of requiredSchema) assertIncludes("prisma/schema.prisma", needle);
for (const needle of requiredActions) assertIncludes(needle.startsWith("createAdmin") ? "src/app/admin/actions.ts" : "src/app/landlord/actions.ts", needle);
for (const needle of requiredUi) assertIncludes("src/components/operations/MaintenanceInventoryModule.tsx", needle);

assertIncludes("src/app/admin/inventory/page.tsx", "MaintenanceInventoryModule");
assertIncludes("src/app/landlord/inventory/page.tsx", "MaintenanceInventoryModule");
assertIncludes("src/lib/operations/modules.ts", "getMaintenanceInventoryModule");

console.log("Update 10 maintenance inventory module verified.");
