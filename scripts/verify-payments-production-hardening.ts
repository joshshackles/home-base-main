import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, needle: string) {
  const body = read(file);
  if (!body.includes(needle)) throw new Error(`${file} is missing required marker: ${needle}`);
}

function assertExists(file: string) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

assertIncludes("package.json", "\"version\": \"4.21.0\"");
assertIncludes("src/lib/app-version.ts", "4.21.0");

assertIncludes("prisma/schema.prisma", "model PaymentWebhookEvent");
assertIncludes("prisma/schema.prisma", "enum PaymentWebhookProcessingStatus");
assertIncludes("prisma/schema.prisma", "stripeReceiptUrl String?");
assertIncludes("prisma/schema.prisma", "DISPUTE_OPENED");
assertIncludes("prisma/schema.prisma", "PAYOUT_PAID");
assertExists("prisma/migrations/20260519090000_payments_production_hardening/migration.sql");

assertIncludes("src/app/api/stripe/webhook/route.ts", "beginStripeWebhookEvent");
assertIncludes("src/app/api/stripe/webhook/route.ts", "markStripeWebhookProcessed");
assertIncludes("src/app/api/stripe/webhook/route.ts", "charge.dispute.created");
assertIncludes("src/app/api/stripe/webhook/route.ts", "transfer.created");
assertIncludes("src/app/api/stripe/webhook/route.ts", "payout.failed");

assertIncludes("src/lib/payments/production-hardening.ts", "reconcilePaidLedgerEntry");
assertIncludes("src/lib/payments/production-hardening.ts", "recordDispute");
assertIncludes("src/lib/payments/production-hardening.ts", "recordRefundFromCharge");
assertIncludes("src/lib/payments/production-hardening.ts", "getLandlordPaymentReconciliationCenter");
assertIncludes("src/lib/payments/financial-automation.ts", "MAX_AUTOPAY_FAILURES_BEFORE_PAUSE");
assertIncludes("src/lib/payments/financial-automation.ts", "Autopay paused after repeated failed payment recovery attempts.");

assertExists("src/app/landlord/payments/reconciliation/page.tsx");
assertIncludes("src/app/landlord/payments/page.tsx", "/landlord/payments/reconciliation");
assertIncludes("tests/e2e/workflow-matrix.spec.ts", "/landlord/payments/reconciliation");
assertExists("docs/PAYMENTS_PRODUCTION_HARDENING.md");
assertIncludes("CHANGELOG.md", "v4.21.0 - Payments Production Hardening");

console.log("Payments production hardening verification passed.");
