-- HomeBase MLS v2.1.0 recurring charge schedules
CREATE TYPE "RecurringChargeFrequency" AS ENUM ('MONTHLY');

CREATE TABLE "RecurringChargeSchedule" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "unitId" TEXT NOT NULL,
    "tenantUserId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" "RecurringChargeFrequency" NOT NULL DEFAULT 'MONTHLY',
    "amount" INTEGER NOT NULL,
    "tenantPortionAmount" INTEGER,
    "subsidyPortionAmount" INTEGER,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringChargeSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringChargeSchedule_applicationId_idx" ON "RecurringChargeSchedule"("applicationId");
CREATE INDEX "RecurringChargeSchedule_unitId_idx" ON "RecurringChargeSchedule"("unitId");
CREATE INDEX "RecurringChargeSchedule_tenantUserId_idx" ON "RecurringChargeSchedule"("tenantUserId");
CREATE INDEX "RecurringChargeSchedule_isActive_idx" ON "RecurringChargeSchedule"("isActive");
CREATE INDEX "RecurringChargeSchedule_nextRunDate_idx" ON "RecurringChargeSchedule"("nextRunDate");

ALTER TABLE "RecurringChargeSchedule" ADD CONSTRAINT "RecurringChargeSchedule_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringChargeSchedule" ADD CONSTRAINT "RecurringChargeSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringChargeSchedule" ADD CONSTRAINT "RecurringChargeSchedule_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringChargeSchedule" ADD CONSTRAINT "RecurringChargeSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
