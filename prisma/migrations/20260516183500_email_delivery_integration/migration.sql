-- Add provider delivery tracking for signature notification emails.
ALTER TABLE "SignatureNotification" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "SignatureNotification" ADD COLUMN "provider" TEXT;
ALTER TABLE "SignatureNotification" ADD COLUMN "providerMessageId" TEXT;

CREATE INDEX "SignatureNotification_status_lastAttemptAt_idx" ON "SignatureNotification"("status", "lastAttemptAt");
