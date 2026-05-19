CREATE TYPE "AccountAccessType" AS ENUM (
  'LANDLORD',
  'PROPERTY_MANAGER',
  'CASEWORKER',
  'INSPECTOR',
  'MAINTENANCE',
  'VENDOR',
  'ADMIN'
);

CREATE TYPE "AccountAccessRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'DECLINED',
  'CANCELLED'
);

CREATE TABLE "AccountAccessRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AccountAccessType" NOT NULL,
  "status" "AccountAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "organization" TEXT,
  "reason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountAccessRequest_status_type_idx" ON "AccountAccessRequest"("status", "type");
CREATE INDEX "AccountAccessRequest_userId_type_status_idx" ON "AccountAccessRequest"("userId", "type", "status");
CREATE INDEX "AccountAccessRequest_reviewedById_idx" ON "AccountAccessRequest"("reviewedById");

ALTER TABLE "AccountAccessRequest"
  ADD CONSTRAINT "AccountAccessRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountAccessRequest"
  ADD CONSTRAINT "AccountAccessRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
