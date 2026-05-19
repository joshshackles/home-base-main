-- Applicant renter tools: favorites, richer renter profile, utilities, payroll, and payment planning.
CREATE TYPE "UtilityAccountStatus" AS ENUM ('SETUP_NEEDED', 'ACTIVE', 'PAUSED', 'CANCELLED');
CREATE TYPE "PayrollFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'OTHER');
CREATE TYPE "TenantPaymentStatus" AS ENUM ('PLANNED', 'SUBMITTED', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "TenantPaymentMethod" AS ENUM ('CASH', 'CHECK', 'MONEY_ORDER', 'CARD', 'ACH', 'OTHER');

ALTER TABLE "ApplicantProfile"
  ADD COLUMN "desiredBedrooms" INTEGER,
  ADD COLUMN "desiredBathrooms" DOUBLE PRECISION,
  ADD COLUMN "maxRent" INTEGER,
  ADD COLUMN "desiredMoveInDate" TIMESTAMP(3),
  ADD COLUMN "voucherHolder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pets" TEXT,
  ADD COLUMN "accessibilityNeeds" TEXT,
  ADD COLUMN "landlordReferences" TEXT,
  ADD COLUMN "employmentSummary" TEXT,
  ADD COLUMN "renterBio" TEXT;

CREATE TABLE "FavoriteRental" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FavoriteRental_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UtilityAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT,
  "applicationId" TEXT,
  "providerName" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "accountNumber" TEXT,
  "status" "UtilityAccountStatus" NOT NULL DEFAULT 'SETUP_NEEDED',
  "dueDayOfMonth" INTEGER,
  "averageAmount" INTEGER,
  "autopayEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UtilityAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employerName" TEXT NOT NULL,
  "frequency" "PayrollFrequency" NOT NULL DEFAULT 'BIWEEKLY',
  "nextPayDate" TIMESTAMP(3),
  "typicalAmount" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantPayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "applicationId" TEXT,
  "ledgerEntryId" TEXT,
  "amount" INTEGER NOT NULL,
  "method" "TenantPaymentMethod" NOT NULL DEFAULT 'ACH',
  "status" "TenantPaymentStatus" NOT NULL DEFAULT 'PLANNED',
  "dueDate" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "confirmation" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FavoriteRental_userId_unitId_key" ON "FavoriteRental"("userId", "unitId");
CREATE INDEX "FavoriteRental_userId_idx" ON "FavoriteRental"("userId");
CREATE INDEX "FavoriteRental_unitId_idx" ON "FavoriteRental"("unitId");
CREATE INDEX "FavoriteRental_createdAt_idx" ON "FavoriteRental"("createdAt");
CREATE INDEX "UtilityAccount_userId_idx" ON "UtilityAccount"("userId");
CREATE INDEX "UtilityAccount_unitId_idx" ON "UtilityAccount"("unitId");
CREATE INDEX "UtilityAccount_applicationId_idx" ON "UtilityAccount"("applicationId");
CREATE INDEX "UtilityAccount_status_idx" ON "UtilityAccount"("status");
CREATE INDEX "UtilityAccount_dueDayOfMonth_idx" ON "UtilityAccount"("dueDayOfMonth");
CREATE INDEX "PayrollReminder_userId_idx" ON "PayrollReminder"("userId");
CREATE INDEX "PayrollReminder_nextPayDate_idx" ON "PayrollReminder"("nextPayDate");
CREATE INDEX "TenantPayment_userId_idx" ON "TenantPayment"("userId");
CREATE INDEX "TenantPayment_unitId_idx" ON "TenantPayment"("unitId");
CREATE INDEX "TenantPayment_applicationId_idx" ON "TenantPayment"("applicationId");
CREATE INDEX "TenantPayment_ledgerEntryId_idx" ON "TenantPayment"("ledgerEntryId");
CREATE INDEX "TenantPayment_status_idx" ON "TenantPayment"("status");
CREATE INDEX "TenantPayment_dueDate_idx" ON "TenantPayment"("dueDate");

ALTER TABLE "FavoriteRental" ADD CONSTRAINT "FavoriteRental_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteRental" ADD CONSTRAINT "FavoriteRental_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UtilityAccount" ADD CONSTRAINT "UtilityAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UtilityAccount" ADD CONSTRAINT "UtilityAccount_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UtilityAccount" ADD CONSTRAINT "UtilityAccount_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollReminder" ADD CONSTRAINT "PayrollReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
