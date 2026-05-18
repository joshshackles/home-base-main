DO $$ BEGIN
  CREATE TYPE "OccupancyStatus" AS ENUM ('PENDING_MOVE_IN', 'ACTIVE', 'RENEWAL_PENDING', 'NOTICE_GIVEN', 'MOVE_OUT_SCHEDULED', 'FORMER', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RelationshipLifecycleEventType" AS ENUM ('APPLICATION_APPROVED', 'TENANT_ACTIVATED', 'LEASE_SIGNED', 'MOVE_IN_SCHEDULED', 'MOVE_IN_COMPLETED', 'RENEWAL_STARTED', 'NOTICE_GIVEN', 'MOVE_OUT_COMPLETED', 'RELATIONSHIP_ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Occupancy" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "applicationId" TEXT,
  "leasePacketId" TEXT,
  "status" "OccupancyStatus" NOT NULL DEFAULT 'PENDING_MOVE_IN',
  "relationship" "ConnectionRole" NOT NULL DEFAULT 'CONNECTED_RENTER',
  "lifecycleEvent" "RelationshipLifecycleEventType" NOT NULL DEFAULT 'TENANT_ACTIVATED',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "moveInDate" TIMESTAMP(3),
  "leaseStartDate" TIMESTAMP(3),
  "leaseEndDate" TIMESTAMP(3),
  "moveOutDate" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Occupancy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Occupancy_applicationId_userId_key" ON "Occupancy"("applicationId", "userId");
CREATE INDEX IF NOT EXISTS "Occupancy_userId_status_idx" ON "Occupancy"("userId", "status");
CREATE INDEX IF NOT EXISTS "Occupancy_unitId_status_idx" ON "Occupancy"("unitId", "status");
CREATE INDEX IF NOT EXISTS "Occupancy_applicationId_idx" ON "Occupancy"("applicationId");
CREATE INDEX IF NOT EXISTS "Occupancy_leasePacketId_idx" ON "Occupancy"("leasePacketId");
CREATE INDEX IF NOT EXISTS "Occupancy_status_startedAt_idx" ON "Occupancy"("status", "startedAt");

DO $$ BEGIN
  ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
