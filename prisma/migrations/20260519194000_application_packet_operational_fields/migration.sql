ALTER TABLE "ApplicationDetail"
  ADD COLUMN IF NOT EXISTS "driversLicenseState" TEXT,
  ADD COLUMN IF NOT EXISTS "driversLicenseNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "voucherAgency" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleMake" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleColor" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleYear" TEXT,
  ADD COLUMN IF NOT EXISTS "licensePlateNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "licensePlateState" TEXT;

ALTER TABLE "ApplicantProfile"
  ADD COLUMN IF NOT EXISTS "driversLicenseState" TEXT,
  ADD COLUMN IF NOT EXISTS "driversLicenseNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "voucherAgency" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleMake" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleColor" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleYear" TEXT,
  ADD COLUMN IF NOT EXISTS "licensePlateNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "licensePlateState" TEXT;
