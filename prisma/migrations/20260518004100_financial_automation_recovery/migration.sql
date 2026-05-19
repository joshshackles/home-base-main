-- Phase 1 rental financial automation: autopay, retry recovery, adjustments, owner statements.
-- These guarded enum creates let Vercel recover from the earlier failed migration attempt.
DO $$ BEGIN
  CREATE TYPE "AutoPayEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentRetryAttemptStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialAdjustmentType" AS ENUM ('CREDIT', 'WAIVER', 'REFUND', 'RENT_ADJUSTMENT', 'MANUAL_CHARGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OwnerStatementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'EXPORTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialPermission" AS ENUM ('VIEW_FINANCIALS', 'COLLECT_PAYMENTS', 'REFUND_PAYMENTS', 'WAIVE_FEES', 'EDIT_RENT', 'EXPORT_STATEMENTS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RETRY_SCHEDULED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RETRY_SUCCEEDED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RETRY_FAILED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'AUTOPAY_ENABLED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'AUTOPAY_PAUSED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'AUTOPAY_CANCELLED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'RENT_GENERATED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'STATEMENT_GENERATED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ADJUSTMENT_CREATED';
ALTER TYPE "PaymentEventType" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

CREATE TABLE "AutoPayEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "stripePaymentMethodId" TEXT NOT NULL,
  "backupPaymentMethodId" TEXT,
  "status" "AutoPayEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "amountLimit" INTEGER,
  "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
  "nextRunDate" TIMESTAMP(3) NOT NULL,
  "lastRunDate" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutoPayEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRetryAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "scheduledPaymentId" TEXT,
  "stripePaymentMethodId" TEXT,
  "backupPaymentMethodId" TEXT,
  "amount" INTEGER NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "status" "PaymentRetryAttemptStatus" NOT NULL DEFAULT 'SCHEDULED',
  "nextAttemptAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRetryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAdjustment" (
  "id" TEXT NOT NULL,
  "type" "FinancialAdjustmentType" NOT NULL,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "actorUserId" TEXT,
  "tenantUserId" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "stripeRefundId" TEXT,
  "stripePaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerStatement" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "unitId" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "OwnerStatementStatus" NOT NULL DEFAULT 'DRAFT',
  "grossCharges" INTEGER NOT NULL DEFAULT 0,
  "collectedPayments" INTEGER NOT NULL DEFAULT 0,
  "creditsAndRefunds" INTEGER NOT NULL DEFAULT 0,
  "outstandingBalance" INTEGER NOT NULL DEFAULT 0,
  "generatedById" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "exportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerStatementItem" (
  "id" TEXT NOT NULL,
  "ownerStatementId" TEXT NOT NULL,
  "ledgerEntryId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerStatementItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoPayEnrollment_userId_unitId_key" ON "AutoPayEnrollment"("userId", "unitId");
CREATE INDEX "AutoPayEnrollment_status_nextRunDate_idx" ON "AutoPayEnrollment"("status", "nextRunDate");
CREATE INDEX "AutoPayEnrollment_unitId_status_idx" ON "AutoPayEnrollment"("unitId", "status");
CREATE UNIQUE INDEX "PaymentRetryAttempt_ledgerEntryId_attemptNumber_key" ON "PaymentRetryAttempt"("ledgerEntryId", "attemptNumber");
CREATE INDEX "PaymentRetryAttempt_status_nextAttemptAt_idx" ON "PaymentRetryAttempt"("status", "nextAttemptAt");
CREATE INDEX "PaymentRetryAttempt_userId_status_idx" ON "PaymentRetryAttempt"("userId", "status");
CREATE INDEX "PaymentRetryAttempt_unitId_status_idx" ON "PaymentRetryAttempt"("unitId", "status");
CREATE UNIQUE INDEX "FinancialAdjustment_stripeRefundId_key" ON "FinancialAdjustment"("stripeRefundId");
CREATE INDEX "FinancialAdjustment_unitId_createdAt_idx" ON "FinancialAdjustment"("unitId", "createdAt");
CREATE INDEX "FinancialAdjustment_ledgerEntryId_idx" ON "FinancialAdjustment"("ledgerEntryId");
CREATE INDEX "FinancialAdjustment_actorUserId_idx" ON "FinancialAdjustment"("actorUserId");
CREATE INDEX "FinancialAdjustment_type_idx" ON "FinancialAdjustment"("type");
CREATE UNIQUE INDEX "OwnerStatement_ownerUserId_unitId_periodStart_periodEnd_key" ON "OwnerStatement"("ownerUserId", "unitId", "periodStart", "periodEnd");
CREATE INDEX "OwnerStatement_ownerUserId_periodStart_idx" ON "OwnerStatement"("ownerUserId", "periodStart");
CREATE INDEX "OwnerStatement_status_idx" ON "OwnerStatement"("status");
CREATE UNIQUE INDEX "OwnerStatementItem_ownerStatementId_ledgerEntryId_key" ON "OwnerStatementItem"("ownerStatementId", "ledgerEntryId");
CREATE INDEX "OwnerStatementItem_ledgerEntryId_idx" ON "OwnerStatementItem"("ledgerEntryId");

ALTER TABLE "AutoPayEnrollment" ADD CONSTRAINT "AutoPayEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutoPayEnrollment" ADD CONSTRAINT "AutoPayEnrollment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutoPayEnrollment" ADD CONSTRAINT "AutoPayEnrollment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRetryAttempt" ADD CONSTRAINT "PaymentRetryAttempt_scheduledPaymentId_fkey" FOREIGN KEY ("scheduledPaymentId") REFERENCES "ScheduledPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerStatementItem" ADD CONSTRAINT "OwnerStatementItem_ownerStatementId_fkey" FOREIGN KEY ("ownerStatementId") REFERENCES "OwnerStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerStatementItem" ADD CONSTRAINT "OwnerStatementItem_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
