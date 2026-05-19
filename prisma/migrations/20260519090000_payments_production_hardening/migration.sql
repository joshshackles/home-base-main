-- Payments production hardening: durable Stripe webhook idempotency,
-- receipt reconciliation, dispute tracking, and payout event visibility.

ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_UPDATED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_CLOSED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYOUT_PROCESSING';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYOUT_PAID';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYOUT_FAILED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'RECEIPT_AVAILABLE';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'WEBHOOK_PROCESSED';

DO $$ BEGIN
  CREATE TYPE "PaymentWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'SKIPPED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL DEFAULT false,
  "apiVersion" TEXT,
  "idempotencyKey" TEXT,
  "status" "PaymentWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStartedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_stripeEventId_key" ON "PaymentWebhookEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_status_receivedAt_idx" ON "PaymentWebhookEvent"("status", "receivedAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_type_idx" ON "PaymentWebhookEvent"("type");

ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "stripeReceiptUrl" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "stripeReceiptNumber" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "stripeRefundStatus" TEXT;
