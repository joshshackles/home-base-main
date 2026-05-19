import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/integrations-hub.ts",
  "src/components/operations/IntegrationsHubModule.tsx",
  "src/app/admin/integrations/page.tsx",
  "src/app/landlord/integrations/page.tsx"
];

for (const file of requiredFiles) {
  const content = readFileSync(file, "utf8");
  if (!content.trim()) throw new Error(`${file} is empty.`);
}

const hub = readFileSync("src/lib/integrations-hub.ts", "utf8");
const ui = readFileSync("src/components/operations/IntegrationsHubModule.tsx", "utf8");
const admin = readFileSync("src/app/admin/actions.ts", "utf8");
const landlord = readFileSync("src/app/landlord/actions.ts", "utf8");

for (const marker of [
  "getIntegrationReadinessCatalog",
  "runIntegrationDiagnosticFromForm",
  "assertNoSecretLikeConfig",
  "STRIPE_WEBHOOK_SECRET",
  "QUICKBOOKS_CLIENT_SECRET",
  "SCREENING_PROVIDER_API_KEY"
]) {
  if (!hub.includes(marker)) throw new Error(`Missing integration hub marker: ${marker}`);
}

for (const marker of ["Update 12.5", "Provider readiness catalog", "Run readiness diagnostic", "Missing env vars", "Webhook endpoint"]) {
  if (!ui.includes(marker)) throw new Error(`Missing UI marker: ${marker}`);
}

if (!admin.includes("runAdminIntegrationDiagnosticAction")) throw new Error("Admin diagnostic action missing.");
if (!landlord.includes("runLandlordIntegrationDiagnosticAction")) throw new Error("Landlord diagnostic action missing.");

console.log("Update 12.5 integrations control center verification passed.");
