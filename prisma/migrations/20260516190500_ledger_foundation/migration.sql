-- HomeBase MLS v2.0.0 ledger foundation
CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'PAYMENT', 'CREDIT', 'ADJUSTMENT');
CREATE TYPE "LedgerEntryStatus" AS ENUM ('POSTED', 'PENDING', 'VOIDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'MONEY_ORDER', 'CARD', 'ACH', 'OTHER');

CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "unitId" TEXT NOT NULL,
    "tenantUserId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT 'POSTED',
    "paymentMethod" "PaymentMethod",
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "memo" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LedgerEntry_applicationId_idx" ON "LedgerEntry"("applicationId");
CREATE INDEX "LedgerEntry_unitId_idx" ON "LedgerEntry"("unitId");
CREATE INDEX "LedgerEntry_tenantUserId_idx" ON "LedgerEntry"("tenantUserId");
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");
CREATE INDEX "LedgerEntry_status_idx" ON "LedgerEntry"("status");
CREATE INDEX "LedgerEntry_dueDate_idx" ON "LedgerEntry"("dueDate");
CREATE INDEX "LedgerEntry_postedAt_idx" ON "LedgerEntry"("postedAt");

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
