import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing payment operational alert markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

function assertExists(file: string) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

assertExists("src/lib/payments/payment-operational-alerts.ts");
assertIncludes("src/lib/payments/payment-operational-alerts.ts", [
  "buildPaymentOperationalIssues",
  "getPaymentOperationalIssues",
  "stripeSecretConfigured",
  "webhookSecretConfigured",
  "failedTransactions",
  "failedWebhooks",
  "revenueRiskTransactions"
]);

assertIncludes("src/lib/admin/command-center.ts", [
  "getPaymentOperationalIssues",
  "paymentOperations",
  "Review payment operations"
]);

assertIncludes("src/components/admin/AdminCommandCenter.tsx", [
  "Payment operations",
  "Payment Operations",
  "Stripe setup, webhook, fee, and transaction risk",
  "#payment-operations"
]);

assertIncludes("tests/unit/payment-operational-alerts.test.ts", [
  "marks missing Stripe setup as critical",
  "surfaces failed payment and webhook risk",
  "platform fee revenue is disabled"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Payment Operational Alerts",
  "Admin Command Center",
  "failed Stripe webhooks"
]);

assertIncludes("package.json", [
  "\"payment-operational-alerts:verify\": \"tsx scripts/verify-payment-operational-alerts.ts\""
]);

console.log("Payment operational alerts verification passed.");
