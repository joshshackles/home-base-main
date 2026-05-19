import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/lib/insurance-compliance.ts",
  "src/components/operations/InsuranceComplianceModule.tsx",
  "src/app/admin/compliance/page.tsx",
  "src/app/landlord/compliance/page.tsx"
];

const requiredSnippets: Array<[string, string]> = [
  ["src/lib/insurance-compliance.ts", "createInsurancePolicyFromForm"],
  ["src/lib/insurance-compliance.ts", "createCertificationRecordFromForm"],
  ["src/lib/insurance-compliance.ts", "createComplianceInspectionRequirementFromForm"],
  ["src/components/operations/InsuranceComplianceModule.tsx", "Renters insurance tracking"],
  ["src/components/operations/InsuranceComplianceModule.tsx", "Add certification"],
  ["src/components/operations/InsuranceComplianceModule.tsx", "Add inspection rule"],
  ["src/app/admin/actions.ts", "createAdminInsurancePolicyAction"],
  ["src/app/landlord/actions.ts", "createLandlordInsurancePolicyAction"],
  ["src/lib/operations/modules.ts", "properties, units, applications"]
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing update 11 file: ${file}`);
}

for (const [file, snippet] of requiredSnippets) {
  const contents = readFileSync(file, "utf8");
  if (!contents.includes(snippet)) throw new Error(`Missing update 11 snippet in ${file}: ${snippet}`);
}

console.log("Update 11 insurance/compliance module files are present and wired.");
