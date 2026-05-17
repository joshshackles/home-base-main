-- Add public listing media and richer unit/location details.
ALTER TABLE "Unit" ADD COLUMN "schoolDistrict" TEXT;
ALTER TABLE "Unit" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "Unit" ADD COLUMN "nearbyFeatures" TEXT;
ALTER TABLE "Unit" ADD COLUMN "yearBuilt" INTEGER;
ALTER TABLE "Unit" ADD COLUMN "roofAgeYears" INTEGER;
ALTER TABLE "Unit" ADD COLUMN "averageUtilityBill" INTEGER;
ALTER TABLE "Unit" ADD COLUMN "parkingInfo" TEXT;
ALTER TABLE "Unit" ADD COLUMN "laundryInfo" TEXT;
ALTER TABLE "Unit" ADD COLUMN "appliancesIncluded" TEXT;
ALTER TABLE "Unit" ADD COLUMN "flooringInfo" TEXT;
ALTER TABLE "Unit" ADD COLUMN "yardInfo" TEXT;
ALTER TABLE "Unit" ADD COLUMN "smokingPolicy" TEXT;
ALTER TABLE "Unit" ADD COLUMN "leaseTermsNote" TEXT;
ALTER TABLE "Unit" ADD COLUMN "moveInFeesNote" TEXT;
ALTER TABLE "Unit" ADD COLUMN "rentDueDay" INTEGER;
ALTER TABLE "Unit" ADD COLUMN "lateFeePolicy" TEXT;
ALTER TABLE "Unit" ADD COLUMN "previousTenantNotes" TEXT;

CREATE TABLE "UnitPhoto" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "title" TEXT,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UnitPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UnitPhoto_unitId_idx" ON "UnitPhoto"("unitId");
CREATE INDEX "UnitPhoto_unitId_isFeatured_idx" ON "UnitPhoto"("unitId", "isFeatured");
CREATE INDEX "UnitPhoto_unitId_sortOrder_idx" ON "UnitPhoto"("unitId", "sortOrder");

ALTER TABLE "UnitPhoto" ADD CONSTRAINT "UnitPhoto_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
