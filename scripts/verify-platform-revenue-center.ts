import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing platform revenue markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

function assertExists(file: string) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

assertExists("src/lib/payments/platform-revenue.ts");
assertIncludes("src/lib/payments/platform-revenue.ts", [
  "summarizePlatformRevenue",
  "classifyPlatformRevenueReadiness",
  "buildMonthlyPlatformRevenue",
  "getPlatformRevenueCenter",
  "PaymentTransactionStatus.RECONCILED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
]);

assertExists("src/app/admin/payments/platform-revenue/page.tsx");
assertIncludes("src/app/admin/payments/platform-revenue/page.tsx", [
  "HomeBase Fee Revenue",
  "Stripe platform setup",
  "Gross rent volume",
  "HomeBase revenue",
  "Net to landlords",
  "Recent fee-bearing transactions"
]);

assertIncludes("src/app/admin/ledger/page.tsx", [
  "/admin/payments/platform-revenue",
  "Platform fees"
]);

assertIncludes("tests/unit/platform-revenue.test.ts", [
  "summarizes fee-bearing transactions",
  "monthly platform revenue",
  "platform fee collection"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Platform Revenue Center",
  "/admin/payments/platform-revenue",
  "HomeBase application-fee revenue"
]);

assertIncludes("package.json", [
  "\"platform-revenue-center:verify\": \"tsx scripts/verify-platform-revenue-center.ts\""
]);

console.log("Platform revenue center verification passed.");
