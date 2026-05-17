-- Track queued email retries durably so cron/manual sends can avoid hammering failed providers.
ALTER TABLE "SignatureNotification" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SignatureNotification" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX "SignatureNotification_status_nextAttemptAt_idx" ON "SignatureNotification"("status", "nextAttemptAt");
