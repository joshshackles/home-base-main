-- Operational intelligence platform: health snapshots, alerts, queue monitor, and automation scaffolding.
-- Written defensively so an interrupted preview attempt can be recovered safely on Vercel/Postgres.
DO $$ BEGIN
  CREATE TYPE "AdminOperationalAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AdminOperationalAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AdminQueueJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AdminAutomationRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AdminSystemHealthSnapshot" (
  "id" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "checks" JSONB NOT NULL,
  "summary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminSystemHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminOperationalAlert" (
  "id" TEXT NOT NULL,
  "severity" "AdminOperationalAlertSeverity" NOT NULL DEFAULT 'INFO',
  "status" "AdminOperationalAlertStatus" NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionHref" TEXT,
  "actionLabel" TEXT,
  "fingerprint" TEXT,
  "metadata" JSONB,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminOperationalAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminQueueJob" (
  "id" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "status" "AdminQueueJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "scheduledFor" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminQueueJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminAutomationRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "AdminAutomationRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "trigger" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "conditions" JSONB,
  "lastRunAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminOperationalAlert_fingerprint_key" ON "AdminOperationalAlert"("fingerprint");
CREATE INDEX IF NOT EXISTS "AdminSystemHealthSnapshot_createdAt_idx" ON "AdminSystemHealthSnapshot"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminSystemHealthSnapshot_score_idx" ON "AdminSystemHealthSnapshot"("score");
CREATE INDEX IF NOT EXISTS "AdminOperationalAlert_status_severity_idx" ON "AdminOperationalAlert"("status", "severity");
CREATE INDEX IF NOT EXISTS "AdminOperationalAlert_source_createdAt_idx" ON "AdminOperationalAlert"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminOperationalAlert_createdAt_idx" ON "AdminOperationalAlert"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminQueueJob_queueName_status_idx" ON "AdminQueueJob"("queueName", "status");
CREATE INDEX IF NOT EXISTS "AdminQueueJob_status_scheduledFor_idx" ON "AdminQueueJob"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "AdminQueueJob_createdAt_idx" ON "AdminQueueJob"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminAutomationRule_status_idx" ON "AdminAutomationRule"("status");
CREATE INDEX IF NOT EXISTS "AdminAutomationRule_trigger_idx" ON "AdminAutomationRule"("trigger");
