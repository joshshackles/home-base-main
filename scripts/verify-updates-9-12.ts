import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/app/admin/screening/page.tsx",
  "src/app/admin/inventory/page.tsx",
  "src/app/admin/compliance/page.tsx",
  "src/app/admin/integrations/page.tsx",
  "src/app/landlord/screening/page.tsx",
  "src/app/landlord/inventory/page.tsx",
  "src/app/landlord/compliance/page.tsx",
  "src/app/landlord/integrations/page.tsx",
  "src/lib/operations/modules.ts",
  "src/components/operations/OperationsModuleView.tsx",
  "prisma/migrations/20260518160000_screening_inventory_compliance_integrations/migration.sql",
  "docs/UPDATES_9_12_OPERATIONS_MODULES.md"
];

const schema = readFileSync("prisma/schema.prisma", "utf8");
const requiredSchemaTerms = [
  "model ScreeningPackage",
  "model ApplicantScreening",
  "model IncomeVerification",
  "model RentalHistoryVerification",
  "model ScreeningReference",
  "model BackgroundCheckRequest",
  "model MaintenanceAsset",
  "model AssetServiceRecord",
  "model AssetWarranty",
  "model KeyLockRecord",
  "model InsurancePolicy",
  "model CertificationRecord",
  "model ComplianceInspectionRequirement",
  "model IntegrationConnection",
  "model IntegrationEvent"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
const missingSchema = requiredSchemaTerms.filter((term) => !schema.includes(term));

if (missingFiles.length || missingSchema.length) {
  console.error("Updates 9-12 verification failed.");
  if (missingFiles.length) console.error("Missing files:", missingFiles.join(", "));
  if (missingSchema.length) console.error("Missing schema terms:", missingSchema.join(", "));
  process.exit(1);
}

console.log("Updates 9-12 verification passed: screening, inventory, compliance, and integrations modules are present.");
