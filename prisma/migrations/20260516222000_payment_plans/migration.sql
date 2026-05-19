-- HomeBase MLS v2.2.0 - payment plans and balance aging workflow
CREATE TYPE "PaymentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');
CREATE TYPE "PaymentPlanInstallmentStatus" AS ENUM ('DUE', 'PAID', 'MISSED', 'WAIVED');

CREATE TABLE "PaymentPlan" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT,
  "unitId" TEXT NOT NULL,
  "tenantUserId" TEXT,
  "name" TEXT NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "installmentAmount" INTEGER NOT NULL,
  "dueDayOfMonth" INTEGER NOT NULL DEFAULT 1,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" "PaymentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdById" TEXT,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "defaultedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentPlanInstallment" (
  "id" TEXT NOT NULL,
  "paymentPlanId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PaymentPlanInstallmentStatus" NOT NULL DEFAULT 'DUE',
  "paidAt" TIMESTAMP(3),
  "linkedLedgerEntryId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentPlanInstallment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentPlan_applicationId_idx" ON "PaymentPlan"("applicationId");
CREATE INDEX "PaymentPlan_unitId_idx" ON "PaymentPlan"("unitId");
CREATE INDEX "PaymentPlan_tenantUserId_idx" ON "PaymentPlan"("tenantUserId");
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");
CREATE INDEX "PaymentPlan_startDate_idx" ON "PaymentPlan"("startDate");

CREATE INDEX "PaymentPlanInstallment_paymentPlanId_idx" ON "PaymentPlanInstallment"("paymentPlanId");
CREATE INDEX "PaymentPlanInstallment_status_idx" ON "PaymentPlanInstallment"("status");
CREATE INDEX "PaymentPlanInstallment_dueDate_idx" ON "PaymentPlanInstallment"("dueDate");

ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentPlanInstallment" ADD CONSTRAINT "PaymentPlanInstallment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
