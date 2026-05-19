DO $$ BEGIN
  CREATE TYPE "RentalLifecycleStatus" AS ENUM (
    'DRAFT',
    'COMING_SOON',
    'ACTIVE',
    'LEAD_ACTIVITY',
    'APPLICATION_PENDING',
    'LEASE_PENDING',
    'MOVE_IN_SCHEDULED',
    'OCCUPIED',
    'RENEWAL_PENDING',
    'NOTICE_GIVEN',
    'TURNOVER',
    'MAINTENANCE_HOLD',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "lifecycleStatus" "RentalLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Unit"
SET "lifecycleStatus" = CASE
  WHEN "status" = 'OCCUPIED' THEN 'OCCUPIED'::"RentalLifecycleStatus"
  WHEN "status" = 'PENDING' THEN 'APPLICATION_PENDING'::"RentalLifecycleStatus"
  WHEN "status" = 'UNAVAILABLE' THEN 'MAINTENANCE_HOLD'::"RentalLifecycleStatus"
  WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"RentalLifecycleStatus"
  ELSE 'ACTIVE'::"RentalLifecycleStatus"
END
WHERE "lifecycleStatus" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "Unit_lifecycleStatus_idx" ON "Unit"("lifecycleStatus");
