import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing payment reconciliation ops markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

function assertExists(file: string) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

assertExists("src/lib/payments/payment-reconciliation.ts");
assertIncludes("src/lib/payments/payment-reconciliation.ts", [
  "classifyPaymentTransactionException",
  "classifyPaymentWebhookException",
  "summarizePaymentTransactionMetrics",
  "summarizeWebhookMetrics",
  "getPaymentReconciliationOperations",
  "PaymentWebhookProcessingStatus.FAILED",
  "PaymentTransactionStatus.FAILED",
  "Platform fee anomaly"
]);

assertIncludes("src/lib/payments/production-hardening.ts", [
  "getPaymentReconciliationOperations",
  "operations",
  "transactionExceptionCount",
  "webhookFailureCount",
  "platformFeesTracked",
  "netToLandlordTracked"
]);

assertIncludes("src/app/landlord/payments/reconciliation/page.tsx", [
  "Payment operations queue",
  "Stripe event inbox",
  "Transaction ledger",
  "Tracked platform fees",
  "Net to landlords",
  "Webhook failures"
]);

assertIncludes("tests/unit/payment-reconciliation.test.ts", [
  "classifies failed transactions",
  "impossible fee snapshots",
  "summarizes tracked platform fees",
  "classifies failed and retried webhook events"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Payment Reconciliation Operations",
  "payment transaction ledger",
  "Stripe event inbox"
]);

assertIncludes("package.json", [
  "\"payment-reconciliation-ops:verify\": \"tsx scripts/verify-payment-reconciliation-ops.ts\""
]);

console.log("Payment reconciliation operations verification passed.");
