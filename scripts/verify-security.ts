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


assertText("src/lib/password.ts", "MIN_PASSWORD_LENGTH = 14", "password policy requires a stronger minimum length");
assertText("src/lib/password.ts", "validatePasswordStrength", "central password strength validator exists");
assertText("src/lib/password.ts", "admin12345", "old demo passwords are explicitly blocked");
assertText("prisma/seed.ts", "SEED_ADMIN_PASSWORD", "seed passwords can be supplied by environment variables");
assertText("prisma/seed.ts", "generatedSeedPassword", "seed script generates non-static temporary passwords");
assertText("prisma/seed.ts", "forcePasswordReset: true", "seed accounts are forced to change temporary passwords");
assertText("src/lib/auth.ts", "isActive", "auth checks account active state");
assertText("src/lib/auth.ts", "dbUser.role", "auth rechecks role from the database");
assertText("src/lib/auth.ts", "getRequiredAuthSecret", "auth fails closed when AUTH_SECRET is missing or unsafe");
assertText("src/lib/rate-limit.ts", "prisma.rateLimitBucket", "rate limiting is database-backed for serverless production");
assertText("prisma/schema.prisma", "model RateLimitBucket", "rate limit bucket table exists in schema");
assertText("src/lib/csv.ts", "neutralizeSpreadsheetFormula", "CSV export helper protects formula-like values");
assertText("src/lib/storage.ts", "readStoredDocument", "document downloads use the storage abstraction");
assertText("src/lib/storage.ts", "assertAllowedFileSignature", "document uploads verify file signatures");
assertText("next.config.mjs", 'bodySizeLimit: "12mb"', "server action body limit supports 10mb document uploads");

assertText("next.config.mjs", "Content-Security-Policy", "content security policy header is configured");
assertText("next.config.mjs", "Strict-Transport-Security", "HSTS header is configured");
assertText("next.config.mjs", "X-Frame-Options", "clickjacking protection header is configured");
assertText("next.config.mjs", "X-Content-Type-Options", "MIME sniffing protection header is configured");
assertText("next.config.mjs", "Referrer-Policy", "referrer policy header is configured");
assertText("next.config.mjs", "Permissions-Policy", "browser permissions policy header is configured");
assertText("next.config.mjs", "Cross-Origin-Opener-Policy", "cross-origin opener policy header is configured");
assertText("next.config.mjs", "poweredByHeader: false", "Next.js powered-by header is disabled");
assertText("next.config.mjs", "compress: true", "Next.js compression remains enabled");
assertText("prisma/schema.prisma", "@@unique([generatedFromScheduleId, generatedForPeriod])", "recurring charge duplicate protection exists in schema");
assertText("prisma/schema.prisma", "directUrl = env(\"DIRECT_URL\")", "Neon direct migration URL is configured");
assertText("src/app/admin/actions.ts", "VOIDED", "admin actions include voiding behavior for immutable financial corrections");

if (failed) process.exit(1);
console.log("Security/static verification passed.");
