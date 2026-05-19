-- Add landlord-managed tenant workflow fields to units.
ALTER TABLE "Unit"
  ADD COLUMN "tenantUserId" TEXT,
  ADD COLUMN "currentApplicationId" TEXT,
  ADD COLUMN "clientNotes" TEXT,
  ADD COLUMN "importantContacts" TEXT;

CREATE INDEX "Unit_tenantUserId_idx" ON "Unit"("tenantUserId");
CREATE INDEX "Unit_currentApplicationId_idx" ON "Unit"("currentApplicationId");

ALTER TABLE "Unit"
  ADD CONSTRAINT "Unit_tenantUserId_fkey"
  FOREIGN KEY ("tenantUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Unit"
  ADD CONSTRAINT "Unit_currentApplicationId_fkey"
  FOREIGN KEY ("currentApplicationId") REFERENCES "Application"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
