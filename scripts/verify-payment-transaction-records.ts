import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing payment transaction markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

assertIncludes("prisma/schema.prisma", [
  "model PaymentTransaction",
  "enum PaymentTransactionSource",
  "enum PaymentTransactionStatus",
  "platformFeeAmount",
  "netToLandlordAmount",
  "platformFeePolicySnapshot",
  "stripePaymentIntentId",
  "tenantPaymentTransactions",
  "landlordPaymentTransactions"
]);

assertIncludes("prisma/migrations/20260605113500_payment_transaction_records/migration.sql", [
  "CREATE TABLE IF NOT EXISTS \"PaymentTransaction\"",
  "\"platformFeeAmount\" INTEGER NOT NULL DEFAULT 0",
  "\"netToLandlordAmount\" INTEGER NOT NULL",
  "\"platformFeePolicySnapshot\" JSONB",
  "PaymentTransaction_stripePaymentIntentId_key"
]);

assertIncludes("src/lib/payments/payment-transactions.ts", [
  "recordPaymentTransaction",
  "buildPaymentTransactionFinancials",
  "reconcilePaymentTransactionFromStripe",
  "markPaymentTransactionFailed",
  "markPaymentTransactionByIntent"
]);

assertIncludes("src/app/payments/actions.ts", [
  "recordPaymentTransaction",
  "PaymentTransactionSource.CHECKOUT_SESSION",
  "PaymentTransactionStatus.CHECKOUT_STARTED"
]);

assertIncludes("src/lib/payments/scheduled.ts", [
  "PaymentTransactionSource.SCHEDULED_PAYMENT",
  "recordPaymentTransaction",
  "PaymentTransactionStatus.SUCCEEDED"
]);

assertIncludes("src/lib/payments/financial-automation.ts", [
  "PaymentTransactionSource.PAYMENT_RETRY",
  "recordPaymentTransaction",
  "PaymentTransactionStatus.FAILED"
]);

assertIncludes("src/lib/payments/production-hardening.ts", [
  "reconcilePaymentTransactionFromStripe",
  "markPaymentTransactionFailed",
  "PaymentTransactionStatus.REFUNDED",
  "PaymentTransactionStatus.DISPUTED"
]);

assertIncludes("src/lib/platform/payments/queries.ts", [
  "paymentTransactionMetrics",
  "platformFeesTracked",
  "PaymentTransactionStatus.RECONCILED"
]);

assertIncludes("src/app/landlord/payments/page.tsx", [
  "Tracked transactions:",
  "tracked platform fees"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Payment Transaction Records",
  "gross amount",
  "net-to-landlord",
  "PaymentTransaction"
]);

assertIncludes("package.json", [
  "\"payment-transaction-records:verify\": \"tsx scripts/verify-payment-transaction-records.ts\""
]);

console.log("Payment transaction records verification passed.");
