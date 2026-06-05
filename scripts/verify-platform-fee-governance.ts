import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing platform fee governance markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

assertIncludes("src/lib/payments/platform-fee-policy.ts", [
  "PlatformFeePolicy",
  "getActivePlatformFeePolicy",
  "calculatePlatformFeeAmount",
  "buildPlatformFeeSnapshot",
  "STRIPE_PLATFORM_FEE_PERCENT",
  "STRIPE_PLATFORM_FEE_FIXED_CENTS",
  "platformFeeAmount"
]);

assertIncludes("src/lib/stripe.ts", [
  "getActivePlatformFeePolicy",
  "calculatePlatformFeeAmount",
  "getPlatformApplicationFeePercent",
  "getPlatformApplicationFeeAmount"
]);

assertIncludes("src/app/payments/actions.ts", [
  "buildPlatformFeeSnapshot",
  "platformFeeSnapshot",
  "paymentMetadata",
  "application_fee_amount"
]);

assertIncludes("src/lib/payments/scheduled.ts", [
  "buildPlatformFeeSnapshot",
  "platformFeeSnapshot",
  "application_fee_amount",
  "...platformFeeSnapshot"
]);

assertIncludes("src/lib/payments/financial-automation.ts", [
  "buildPlatformFeeSnapshot",
  "platformFeeSnapshot",
  "application_fee_amount",
  "...platformFeeSnapshot"
]);

assertIncludes("src/lib/platform/payments/queries.ts", [
  "getActivePlatformFeePolicy",
  "platformFeePolicy",
  "platformFeePercent"
]);

assertIncludes("src/app/landlord/payments/page.tsx", [
  "Active platform fee policy",
  "platformFeePolicy.source",
  "platformFeePolicy.id",
  "platformFeePolicy.auditNote"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Platform Fee Governance",
  "policy id",
  "platformFeeSnapshot",
  "application_fee_amount"
]);

assertIncludes("tests/unit/platform-fee-policy.test.ts", [
  "defaults to a one percent HomeBase application fee",
  "uses configured percent and fixed cents",
  "buildPlatformFeeSnapshot"
]);

assertIncludes("package.json", [
  "\"platform-fee-governance:verify\": \"tsx scripts/verify-platform-fee-governance.ts\""
]);

console.log("Platform fee governance verification passed.");
