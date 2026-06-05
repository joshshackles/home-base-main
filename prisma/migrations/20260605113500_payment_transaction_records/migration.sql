-- Payment transaction records: durable gross/platform-fee/net snapshots
-- linked to Stripe ids, ledger entries, units, tenants, and landlords.

DO $$ BEGIN
  CREATE TYPE "PaymentTransactionSource" AS ENUM ('CHECKOUT_SESSION', 'SCHEDULED_PAYMENT', 'PAYMENT_RETRY', 'WEBHOOK_RECONCILIATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentTransactionStatus" AS ENUM ('CHECKOUT_STARTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'DISPUTED', 'RECONCILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "source" "PaymentTransactionSource" NOT NULL,
  "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PROCESSING',
  "ledgerEntryId" TEXT,
  "unitId" TEXT NOT NULL,
  "tenantUserId" TEXT,
  "landlordUserId" TEXT,
  "grossAmount" INTEGER NOT NULL,
  "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "stripeFeeAmount" INTEGER,
  "netToLandlordAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "paymentMethod" "PaymentMethod",
  "platformFeePolicyId" TEXT,
  "platformFeePolicySnapshot" JSONB,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeChargeId" TEXT,
  "stripeTransferId" TEXT,
  "stripePaymentStatus" TEXT,
  "idempotencyKey" TEXT,
  "failureReason" TEXT,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_stripeCheckoutSessionId_key" ON "PaymentTransaction"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_stripePaymentIntentId_key" ON "PaymentTransaction"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_ledgerEntryId_idx" ON "PaymentTransaction"("ledgerEntryId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_unitId_status_idx" ON "PaymentTransaction"("unitId", "status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_tenantUserId_status_idx" ON "PaymentTransaction"("tenantUserId", "status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_landlordUserId_status_idx" ON "PaymentTransaction"("landlordUserId", "status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_source_createdAt_idx" ON "PaymentTransaction"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_stripePaymentStatus_idx" ON "PaymentTransaction"("stripePaymentStatus");

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_ledgerEntryId_fkey"
    FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_tenantUserId_fkey"
    FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_landlordUserId_fkey"
    FOREIGN KEY ("landlordUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
