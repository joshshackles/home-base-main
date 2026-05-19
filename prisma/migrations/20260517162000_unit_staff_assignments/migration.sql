-- Unit-level tenant support assignments.
ALTER TABLE "Unit" ADD COLUMN "propertyManagerUserId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "maintenanceUserId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "caseworkerUserId" TEXT;

CREATE INDEX "Unit_propertyManagerUserId_idx" ON "Unit"("propertyManagerUserId");
CREATE INDEX "Unit_maintenanceUserId_idx" ON "Unit"("maintenanceUserId");
CREATE INDEX "Unit_caseworkerUserId_idx" ON "Unit"("caseworkerUserId");

ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyManagerUserId_fkey" FOREIGN KEY ("propertyManagerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_maintenanceUserId_fkey" FOREIGN KEY ("maintenanceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_caseworkerUserId_fkey" FOREIGN KEY ("caseworkerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
