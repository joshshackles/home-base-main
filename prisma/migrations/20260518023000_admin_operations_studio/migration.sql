-- Admin operations studio: branding controls, backup manifests, and analytics snapshots.
CREATE TYPE "AdminBackupStatus" AS ENUM ('REQUESTED', 'GENERATED', 'DOWNLOADED', 'RESTORE_STARTED', 'RESTORE_COMPLETED', 'FAILED', 'ARCHIVED');
CREATE TYPE "AdminBrandingThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
CREATE TYPE "AdminAnalyticsPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "AdminBrandingSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "productName" TEXT NOT NULL DEFAULT 'HomeBase',
  "shortName" TEXT NOT NULL DEFAULT 'HomeBase',
  "tagline" TEXT NOT NULL DEFAULT 'Housing operations platform',
  "homepageHeadline" TEXT NOT NULL DEFAULT 'The operating system for rental housing.',
  "homepageSubheadline" TEXT NOT NULL DEFAULT 'Listings, applications, messaging, maintenance, leases, ledgers, payments, and tenant operations in one secure platform.',
  "primaryColor" TEXT NOT NULL DEFAULT '#2563EB',
  "accentColor" TEXT NOT NULL DEFAULT '#10B981',
  "surfaceColor" TEXT NOT NULL DEFAULT '#0F172A',
  "logoMarkText" TEXT NOT NULL DEFAULT 'HB',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "supportEmail" TEXT,
  "themeMode" "AdminBrandingThemeMode" NOT NULL DEFAULT 'SYSTEM',
  "publicSignupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "marketplaceEnabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminBrandingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminBackupSnapshot" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "AdminBackupStatus" NOT NULL DEFAULT 'REQUESTED',
  "recordCounts" JSONB,
  "checksum" TEXT,
  "sizeBytes" INTEGER,
  "storageProvider" TEXT NOT NULL DEFAULT 'download',
  "storageKey" TEXT,
  "requestedById" TEXT,
  "requestedByEmail" TEXT,
  "downloadedAt" TIMESTAMP(3),
  "restoredAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminBackupSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "period" "AdminAnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
  "periodKey" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminAnalyticsSnapshot_period_periodKey_key" ON "AdminAnalyticsSnapshot"("period", "periodKey");
CREATE INDEX "AdminBackupSnapshot_status_createdAt_idx" ON "AdminBackupSnapshot"("status", "createdAt");
CREATE INDEX "AdminBackupSnapshot_requestedById_idx" ON "AdminBackupSnapshot"("requestedById");
CREATE INDEX "AdminAnalyticsSnapshot_period_createdAt_idx" ON "AdminAnalyticsSnapshot"("period", "createdAt");
