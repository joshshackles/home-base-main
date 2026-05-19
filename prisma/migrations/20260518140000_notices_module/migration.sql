-- Module 6: Formal notices module
CREATE TYPE "FormalNoticeType" AS ENUM ('RENT_REMINDER', 'LATE_RENT', 'PAY_OR_QUIT', 'ENTRY_NOTICE', 'LEASE_RENEWAL', 'LEASE_NON_RENEWAL', 'MAINTENANCE_NOTICE', 'POLICY_NOTICE', 'MOVE_OUT_NOTICE', 'GENERAL');
CREATE TYPE "FormalNoticeStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'ACKNOWLEDGED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "FormalNoticeAudience" AS ENUM ('TENANT', 'LANDLORD', 'APPLICANT', 'STAFF', 'PUBLIC');

CREATE TABLE "FormalNotice" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "FormalNoticeType" NOT NULL DEFAULT 'GENERAL',
  "status" "FormalNoticeStatus" NOT NULL DEFAULT 'DRAFT',
  "audience" "FormalNoticeAudience" NOT NULL DEFAULT 'TENANT',
  "priority" INTEGER NOT NULL DEFAULT 2,
  "propertyId" TEXT,
  "unitId" TEXT,
  "applicationId" TEXT,
  "leasePacketId" TEXT,
  "recipientUserId" TEXT,
  "recipientName" TEXT,
  "recipientEmail" TEXT,
  "createdById" TEXT,
  "dueAt" TIMESTAMP(3),
  "effectiveAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "templateKey" TEXT,
  "deliveryChannel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormalNotice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormalNotice" ADD CONSTRAINT "FormalNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FormalNotice_status_type_idx" ON "FormalNotice"("status", "type");
CREATE INDEX "FormalNotice_audience_status_idx" ON "FormalNotice"("audience", "status");
CREATE INDEX "FormalNotice_propertyId_idx" ON "FormalNotice"("propertyId");
CREATE INDEX "FormalNotice_unitId_idx" ON "FormalNotice"("unitId");
CREATE INDEX "FormalNotice_applicationId_idx" ON "FormalNotice"("applicationId");
CREATE INDEX "FormalNotice_leasePacketId_idx" ON "FormalNotice"("leasePacketId");
CREATE INDEX "FormalNotice_recipientUserId_status_idx" ON "FormalNotice"("recipientUserId", "status");
CREATE INDEX "FormalNotice_recipientEmail_idx" ON "FormalNotice"("recipientEmail");
CREATE INDEX "FormalNotice_createdById_idx" ON "FormalNotice"("createdById");
CREATE INDEX "FormalNotice_dueAt_idx" ON "FormalNotice"("dueAt");
CREATE INDEX "FormalNotice_sentAt_idx" ON "FormalNotice"("sentAt");
CREATE INDEX "FormalNotice_createdAt_idx" ON "FormalNotice"("createdAt");
