import { readFileSync } from "fs";

const checks: Array<[string, string]> = [
  ["src/lib/integrations-hub.ts", "QUICKBOOKS_SETUP_PROFILE"],
  ["src/lib/integrations-hub.ts", "createQuickBooksConnectionFromForm"],
  ["src/components/operations/IntegrationsHubModule.tsx", "QuickBooks setup wizard"],
  ["src/components/operations/IntegrationsHubModule.tsx", "Create QuickBooks connection"],
  ["src/app/admin/actions.ts", "createAdminQuickBooksConnectionAction"],
  ["src/app/landlord/actions.ts", "createLandlordQuickBooksConnectionAction"],
  ["src/app/admin/integrations/page.tsx", "createQuickBooksConnection"],
  ["src/app/landlord/integrations/page.tsx", "createQuickBooksConnection"]
];

for (const [file, token] of checks) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(token)) throw new Error(`${file} is missing ${token}`);
}

console.log("QuickBooks update 12.6 verification passed.");
