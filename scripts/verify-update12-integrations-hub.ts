import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/lib/integrations-hub.ts",
  "src/components/operations/IntegrationsHubModule.tsx",
  "src/app/admin/integrations/page.tsx",
  "src/app/landlord/integrations/page.tsx",
  "docs/UPDATE_12_INTEGRATIONS_HUB.md"
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing update 12 file: ${file}`);
}

const adminActions = fs.readFileSync(path.join(root, "src/app/admin/actions.ts"), "utf8");
const landlordActions = fs.readFileSync(path.join(root, "src/app/landlord/actions.ts"), "utf8");
const component = fs.readFileSync(path.join(root, "src/components/operations/IntegrationsHubModule.tsx"), "utf8");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

for (const token of [
  "createAdminIntegrationConnectionAction",
  "updateAdminIntegrationConnectionStatusAction",
  "createAdminIntegrationEventAction"
]) {
  if (!adminActions.includes(token)) throw new Error(`Admin action missing: ${token}`);
}

for (const token of [
  "createLandlordIntegrationConnectionAction",
  "updateLandlordIntegrationConnectionStatusAction",
  "createLandlordIntegrationEventAction"
]) {
  if (!landlordActions.includes(token)) throw new Error(`Landlord action missing: ${token}`);
}

for (const token of ["IntegrationConnection", "IntegrationEvent", "IntegrationProvider", "IntegrationConnectionStatus", "IntegrationEventStatus"]) {
  if (!schema.includes(token)) throw new Error(`Schema missing: ${token}`);
}

for (const token of ["Stripe", "Plaid", "Twilio", "QuickBooks", "Google Calendar", "Log event", "Update status"]) {
  if (!component.includes(token)) throw new Error(`Integrations UI missing: ${token}`);
}

console.log("Update 12 Integrations Hub verification passed.");
