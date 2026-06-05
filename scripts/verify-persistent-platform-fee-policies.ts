import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing persistent platform fee policy markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

function assertExists(file: string) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

assertIncludes("prisma/schema.prisma", [
  "enum PlatformFeePolicyStatus",
  "model PlatformFeePolicyRecord",
  "percent       Float",
  "fixedCents    Int",
  "@@index([status, appliesTo])"
]);
assertExists("prisma/migrations/20260605170000_platform_fee_policy_records/migration.sql");

assertIncludes("src/lib/payments/platform-fee-policy.ts", [
  "getActivePlatformFeePolicyForPayments",
  "createActivePlatformFeePolicy",
  "normalizePlatformFeePolicyInput",
  "PlatformFeePolicyStatus.ACTIVE",
  "source: \"database\""
]);

assertIncludes("src/app/payments/actions.ts", [
  "getActivePlatformFeePolicyForPayments",
  "calculatePlatformFeeAmount(entry.amount, platformFeePolicy)",
  "platformFeePolicy"
]);
assertIncludes("src/lib/payments/scheduled.ts", [
  "getActivePlatformFeePolicyForPayments",
  "calculatePlatformFeeAmount(payment.amount, platformFeePolicy)",
  "platformFeePolicy"
]);
assertIncludes("src/lib/payments/financial-automation.ts", [
  "getActivePlatformFeePolicyForPayments",
  "calculatePlatformFeeAmount(retry.amount, platformFeePolicy)",
  "platformFeePolicy"
]);

assertExists("src/app/admin/payments/platform-revenue/actions.ts");
assertIncludes("src/app/admin/payments/platform-revenue/actions.ts", [
  "createActivePlatformFeePolicyAction",
  "createActivePlatformFeePolicy",
  "PlatformFeePolicyRecord"
]);
assertIncludes("src/app/admin/payments/platform-revenue/page.tsx", [
  "Set active platform fee",
  "Policy history",
  "Activate fee policy",
  "database fee policies"
]);

assertIncludes("tests/unit/platform-fee-policy.test.ts", [
  "normalizes persistent fee policy input",
  "rejects unsafe persistent fee policy values"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Persistent Platform Fee Policies",
  "PlatformFeePolicyRecord",
  "database-backed policy"
]);

assertIncludes("package.json", [
  "\"persistent-platform-fee-policies:verify\": \"tsx scripts/verify-persistent-platform-fee-policies.ts\""
]);

console.log("Persistent platform fee policy verification passed.");
