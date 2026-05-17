-- HomeBase MLS v1.7.0 signature notifications and expiration

ALTER TYPE "SignatureStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_REMINDER_QUEUED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_EXPIRED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_EXPIRATION_EXTENDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REMIND';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPIRE';

CREATE TYPE "SignatureNotificationType" AS ENUM ('INITIAL', 'REMINDER', 'EXPIRATION_WARNING', 'EXPIRED');
CREATE TYPE "SignatureNotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "SignatureRequest"
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastReminderAt" TIMESTAMP(3),
ADD COLUMN "lastNotificationAt" TIMESTAMP(3);

CREATE TABLE "SignatureNotification" (
  "id" TEXT NOT NULL,
  "signatureRequestId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "type" "SignatureNotificationType" NOT NULL DEFAULT 'INITIAL',
  "status" "SignatureNotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignatureNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SignatureRequest_expiresAt_idx" ON "SignatureRequest"("expiresAt");
CREATE INDEX "SignatureNotification_signatureRequestId_idx" ON "SignatureNotification"("signatureRequestId");
CREATE INDEX "SignatureNotification_recipientEmail_idx" ON "SignatureNotification"("recipientEmail");
CREATE INDEX "SignatureNotification_type_idx" ON "SignatureNotification"("type");
CREATE INDEX "SignatureNotification_status_idx" ON "SignatureNotification"("status");
CREATE INDEX "SignatureNotification_createdAt_idx" ON "SignatureNotification"("createdAt");

ALTER TABLE "SignatureNotification" ADD CONSTRAINT "SignatureNotification_signatureRequestId_fkey" FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignatureNotification" ADD CONSTRAINT "SignatureNotification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
