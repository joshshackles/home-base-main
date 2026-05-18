-- v3.5.1 hotfix: complete VendorPayout <-> Application relation.
ALTER TABLE "VendorPayout" ADD COLUMN "applicationId" TEXT;

ALTER TABLE "VendorPayout"
  ADD CONSTRAINT "VendorPayout_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VendorPayout_applicationId_idx" ON "VendorPayout"("applicationId");
