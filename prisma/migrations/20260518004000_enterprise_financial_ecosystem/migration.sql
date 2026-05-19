-- v3.4.0 enterprise financial ecosystem
CREATE TYPE "PaymentDisputeStatus" AS ENUM ('NEEDS_RESPONSE','UNDER_REVIEW','WON','LOST','CLOSED');
CREATE TYPE "VendorPayoutStatus" AS ENUM ('DRAFT','APPROVAL_REQUIRED','APPROVED','PROCESSING','PAID','FAILED','CANCELLED');
CREATE TYPE "SecurityDepositStatus" AS ENUM ('DUE','HELD','PARTIALLY_RELEASED','RELEASED','DISPUTED');
CREATE TYPE "AccountingExportType" AS ENUM ('QUICKBOOKS_CSV','XERO_CSV','OWNER_STATEMENT_CSV','PORTFOLIO_SUMMARY_CSV');
CREATE TYPE "AccountingExportStatus" AS ENUM ('GENERATED','DOWNLOADED','ARCHIVED');
CREATE TYPE "CreditReportingStatus" AS ENUM ('NOT_ELIGIBLE','READY','EXPORTED','SUPPRESSED');
CREATE TYPE "FinancialRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

CREATE TABLE "PaymentDispute" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerUserId" TEXT NOT NULL,
  "unitId" TEXT,
  "ledgerEntryId" TEXT,
  "stripeDisputeId" TEXT,
  "stripeChargeId" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "status" "PaymentDisputeStatus" NOT NULL DEFAULT 'NEEDS_RESPONSE',
  "evidenceDueBy" TIMESTAMP(3),
  "evidenceSubmittedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentDispute_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentDispute_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PaymentDispute_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentDispute_stripeDisputeId_key" ON "PaymentDispute"("stripeDisputeId");
CREATE INDEX "PaymentDispute_ownerUserId_status_idx" ON "PaymentDispute"("ownerUserId", "status");
CREATE INDEX "PaymentDispute_unitId_idx" ON "PaymentDispute"("unitId");
CREATE INDEX "PaymentDispute_ledgerEntryId_idx" ON "PaymentDispute"("ledgerEntryId");
CREATE INDEX "PaymentDispute_evidenceDueBy_idx" ON "PaymentDispute"("evidenceDueBy");

CREATE TABLE "VendorPayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerUserId" TEXT NOT NULL,
  "vendorUserId" TEXT,
  "unitId" TEXT,
  "maintenanceRequestId" TEXT,
  "ledgerEntryId" TEXT,
  "stripeTransferId" TEXT,
  "amount" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "status" "VendorPayoutStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorPayout_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VendorPayout_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VendorPayout_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VendorPayout_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VendorPayout_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VendorPayout_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VendorPayout_stripeTransferId_key" ON "VendorPayout"("stripeTransferId");
CREATE INDEX "VendorPayout_ownerUserId_status_idx" ON "VendorPayout"("ownerUserId", "status");
CREATE INDEX "VendorPayout_vendorUserId_status_idx" ON "VendorPayout"("vendorUserId", "status");
CREATE INDEX "VendorPayout_unitId_idx" ON "VendorPayout"("unitId");
CREATE INDEX "VendorPayout_maintenanceRequestId_idx" ON "VendorPayout"("maintenanceRequestId");

CREATE TABLE "SecurityDepositAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantUserId" TEXT,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "amountRequired" INTEGER NOT NULL,
  "amountHeld" INTEGER NOT NULL DEFAULT 0,
  "amountReleased" INTEGER NOT NULL DEFAULT 0,
  "deductions" INTEGER NOT NULL DEFAULT 0,
  "status" "SecurityDepositStatus" NOT NULL DEFAULT 'DUE',
  "dueDate" TIMESTAMP(3),
  "heldAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "reconciliationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityDepositAccount_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SecurityDepositAccount_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SecurityDepositAccount_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "SecurityDepositAccount_tenantUserId_status_idx" ON "SecurityDepositAccount"("tenantUserId", "status");
CREATE INDEX "SecurityDepositAccount_unitId_status_idx" ON "SecurityDepositAccount"("unitId", "status");

CREATE TABLE "AccountingExport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerUserId" TEXT NOT NULL,
  "generatedById" TEXT,
  "unitId" TEXT,
  "type" "AccountingExportType" NOT NULL,
  "status" "AccountingExportStatus" NOT NULL DEFAULT 'GENERATED',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "downloadedAt" TIMESTAMP(3),
  CONSTRAINT "AccountingExport_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingExport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingExport_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AccountingExport_ownerUserId_createdAt_idx" ON "AccountingExport"("ownerUserId", "createdAt");
CREATE INDEX "AccountingExport_type_status_idx" ON "AccountingExport"("type", "status");

CREATE TABLE "CreditReportingRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantUserId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "period" TEXT NOT NULL,
  "amountDue" INTEGER NOT NULL,
  "amountPaid" INTEGER NOT NULL DEFAULT 0,
  "paidOnTime" BOOLEAN NOT NULL DEFAULT false,
  "status" "CreditReportingStatus" NOT NULL DEFAULT 'READY',
  "exportedAt" TIMESTAMP(3),
  "suppressedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditReportingRecord_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreditReportingRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreditReportingRecord_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CreditReportingRecord_tenantUserId_unitId_period_key" ON "CreditReportingRecord"("tenantUserId", "unitId", "period");
CREATE INDEX "CreditReportingRecord_status_period_idx" ON "CreditReportingRecord"("status", "period");

CREATE TABLE "FinancialInsightSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "unitId" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "riskLevel" "FinancialRiskLevel" NOT NULL DEFAULT 'LOW',
  "score" INTEGER NOT NULL DEFAULT 0,
  "delinquentBalance" INTEGER NOT NULL DEFAULT 0,
  "projectedCashflow" INTEGER NOT NULL DEFAULT 0,
  "recommendation" TEXT NOT NULL,
  "reasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialInsightSnapshot_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FinancialInsightSnapshot_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FinancialInsightSnapshot_ownerUserId_createdAt_idx" ON "FinancialInsightSnapshot"("ownerUserId", "createdAt");
CREATE INDEX "FinancialInsightSnapshot_unitId_idx" ON "FinancialInsightSnapshot"("unitId");
CREATE INDEX "FinancialInsightSnapshot_riskLevel_idx" ON "FinancialInsightSnapshot"("riskLevel");
