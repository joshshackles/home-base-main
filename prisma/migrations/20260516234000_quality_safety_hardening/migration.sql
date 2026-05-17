-- v2.4.0 quality and safety hardening
-- Adds source metadata for recurring charge generation so duplicates can be prevented at the database level.

ALTER TABLE "LedgerEntry" ADD COLUMN "generatedFromScheduleId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "generatedForPeriod" TEXT;

CREATE INDEX "LedgerEntry_generatedFromScheduleId_idx" ON "LedgerEntry"("generatedFromScheduleId");
CREATE UNIQUE INDEX "LedgerEntry_generatedFromScheduleId_generatedForPeriod_key" ON "LedgerEntry"("generatedFromScheduleId", "generatedForPeriod");
CREATE INDEX "PaymentPlanInstallment_linkedLedgerEntryId_idx" ON "PaymentPlanInstallment"("linkedLedgerEntryId");

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_generatedFromScheduleId_fkey" FOREIGN KEY ("generatedFromScheduleId") REFERENCES "RecurringChargeSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
