-- v3.9.0 Rental Ecosystem Rebuild
CREATE TYPE "RentalPropertyType" AS ENUM ('SINGLE_FAMILY', 'DUPLEX', 'APARTMENT', 'CONDO', 'TOWNHOME', 'ROOM', 'COMMERCIAL', 'OTHER');
CREATE TYPE "RentalMarketingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

ALTER TABLE "Unit"
  ADD COLUMN "rentalType" "RentalPropertyType" NOT NULL DEFAULT 'APARTMENT',
  ADD COLUMN "marketingStatus" "RentalMarketingStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "marketingHeadline" TEXT,
  ADD COLUMN "marketingHighlights" TEXT,
  ADD COLUMN "virtualTourUrl" TEXT,
  ADD COLUMN "videoTourUrl" TEXT,
  ADD COLUMN "walkScore" INTEGER,
  ADD COLUMN "transitScore" INTEGER;

CREATE INDEX "Unit_rentalType_idx" ON "Unit"("rentalType");
CREATE INDEX "Unit_marketingStatus_idx" ON "Unit"("marketingStatus");
