CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');
CREATE TYPE "NotificationTemplateKey" AS ENUM ('GENERAL_ANNOUNCEMENT', 'PAYMENT_REMINDER', 'PAYMENT_FAILED', 'LEASE_READY', 'MAINTENANCE_UPDATE', 'APPLICATION_UPDATE', 'TOUR_REMINDER', 'SYSTEM_ALERT');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'READ', 'FAILED', 'DISMISSED', 'CANCELLED');
CREATE TYPE "NotificationPreferenceFrequency" AS ENUM ('INSTANT', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'DISABLED');

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "key" "NotificationTemplateKey" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" "NotificationTemplateKey" NOT NULL,
  "inAppFrequency" "NotificationPreferenceFrequency" NOT NULL DEFAULT 'INSTANT',
  "emailFrequency" "NotificationPreferenceFrequency" NOT NULL DEFAULT 'INSTANT',
  "smsFrequency" "NotificationPreferenceFrequency" NOT NULL DEFAULT 'DISABLED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "templateId" TEXT,
  "key" "NotificationTemplateKey" NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionHref" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 2,
  "createdById" TEXT,
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "provider" TEXT,
  "providerMessageId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_key_channel_key" ON "NotificationTemplate"("key", "channel");
CREATE INDEX "NotificationTemplate_key_idx" ON "NotificationTemplate"("key");
CREATE INDEX "NotificationTemplate_channel_isActive_idx" ON "NotificationTemplate"("channel", "isActive");
CREATE UNIQUE INDEX "NotificationPreference_userId_key_key" ON "NotificationPreference"("userId", "key");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_key_idx" ON "NotificationPreference"("key");
CREATE INDEX "NotificationDelivery_recipientUserId_status_idx" ON "NotificationDelivery"("recipientUserId", "status");
CREATE INDEX "NotificationDelivery_recipientEmail_idx" ON "NotificationDelivery"("recipientEmail");
CREATE INDEX "NotificationDelivery_key_idx" ON "NotificationDelivery"("key");
CREATE INDEX "NotificationDelivery_channel_status_idx" ON "NotificationDelivery"("channel", "status");
CREATE INDEX "NotificationDelivery_entityType_entityId_idx" ON "NotificationDelivery"("entityType", "entityId");
CREATE INDEX "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
