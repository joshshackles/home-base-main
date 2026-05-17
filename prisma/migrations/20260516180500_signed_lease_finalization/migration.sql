-- HomeBase MLS v1.6.0 signed lease finalization

ALTER TABLE "LeasePacket"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "finalDocumentId" TEXT,
ADD COLUMN "finalPdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN "reissuedFromId" TEXT,
ADD COLUMN "reissueReason" TEXT;

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'FINAL_LEASE_GENERATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'LEASE_REISSUED';
