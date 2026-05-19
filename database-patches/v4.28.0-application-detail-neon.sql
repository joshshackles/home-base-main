-- v4.28.0 Phase 2 rental application: structured applicant details and screening acknowledgements.
CREATE TABLE IF NOT EXISTS "ApplicationDetail" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "governmentIdType" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "emergencyContactRelation" TEXT,
  "currentHousingStartDate" TIMESTAMP(3),
  "previousAddress" TEXT,
  "previousLandlordName" TEXT,
  "previousLandlordPhone" TEXT,
  "reasonForMoving" TEXT,
  "requestedMoveInDate" TIMESTAMP(3),
  "voucherProgram" TEXT,
  "voucherCaseWorker" TEXT,
  "voucherCaseWorkerContact" TEXT,
  "vehicleInfo" TEXT,
  "petDetails" TEXT,
  "serviceAnimalAccommodation" TEXT,
  "hasPriorEviction" BOOLEAN NOT NULL DEFAULT false,
  "priorEvictionExplanation" TEXT,
  "hasCriminalHistory" BOOLEAN NOT NULL DEFAULT false,
  "criminalHistoryExplanation" TEXT,
  "hasOutstandingUtilities" BOOLEAN NOT NULL DEFAULT false,
  "outstandingUtilitiesExplanation" TEXT,
  "consentToScreening" BOOLEAN NOT NULL DEFAULT false,
  "informationCertified" BOOLEAN NOT NULL DEFAULT false,
  "applicantSignature" TEXT,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationDetail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationDetail_applicationId_key" ON "ApplicationDetail"("applicationId");
CREATE INDEX IF NOT EXISTS "ApplicationDetail_applicationId_idx" ON "ApplicationDetail"("applicationId");
CREATE INDEX IF NOT EXISTS "ApplicationDetail_signedAt_idx" ON "ApplicationDetail"("signedAt");

DO $$ BEGIN
  ALTER TABLE "ApplicationDetail" ADD CONSTRAINT "ApplicationDetail_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
