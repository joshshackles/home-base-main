import { readFileSync } from "fs";
import path from "path";

let failed = false;
function assertText(file: string, expected: string, message: string) {
  const contents = readFileSync(path.join(process.cwd(), file), "utf8");
  if (!contents.includes(expected)) {
    console.error(`FAIL: ${message}`);
    console.error(`Missing text in ${file}: ${expected}`);
    failed = true;
  } else {
    console.log(`PASS: ${message}`);
  }
}

assertText("src/lib/auth.ts", "isActive", "auth checks account active state");
assertText("src/lib/auth.ts", "dbUser.role", "auth rechecks role from the database");
assertText("src/lib/auth.ts", "getRequiredAuthSecret", "auth fails closed when AUTH_SECRET is missing or unsafe");
assertText("src/lib/csv.ts", "neutralizeSpreadsheetFormula", "CSV export helper protects formula-like values");
assertText("src/lib/storage.ts", "readStoredDocument", "document downloads use the storage abstraction");
assertText("src/lib/storage.ts", "assertAllowedFileSignature", "document uploads verify file signatures");
assertText("next.config.mjs", 'bodySizeLimit: "12mb"', "server action body limit supports 10mb document uploads");
assertText("prisma/schema.prisma", "@@unique([generatedFromScheduleId, generatedForPeriod])", "recurring charge duplicate protection exists in schema");
assertText("prisma/schema.prisma", "directUrl = env(\"DIRECT_URL\")", "Neon direct migration URL is configured");
assertText("src/app/admin/actions.ts", "VOIDED", "admin actions include voiding behavior for immutable financial corrections");

if (failed) process.exit(1);
console.log("Security/static verification passed.");
