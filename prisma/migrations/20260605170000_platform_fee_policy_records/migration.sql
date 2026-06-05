DO $$ BEGIN
  CREATE TYPE "PlatformFeePolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformFeePolicyRecord" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "percent" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "fixedCents" INTEGER NOT NULL DEFAULT 0,
  "appliesTo" TEXT NOT NULL DEFAULT 'stripe_rent_payments',
  "status" "PlatformFeePolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdById" TEXT,
  "auditNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformFeePolicyRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformFeePolicyRecord_status_appliesTo_idx" ON "PlatformFeePolicyRecord"("status", "appliesTo");
CREATE INDEX IF NOT EXISTS "PlatformFeePolicyRecord_effectiveFrom_idx" ON "PlatformFeePolicyRecord"("effectiveFrom");
CREATE INDEX IF NOT EXISTS "PlatformFeePolicyRecord_createdById_idx" ON "PlatformFeePolicyRecord"("createdById");
