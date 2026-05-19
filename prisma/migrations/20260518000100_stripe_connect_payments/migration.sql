ALTER TABLE "User"
  ADD COLUMN "stripeConnectAccountId" TEXT,
  ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectLastSyncedAt" TIMESTAMP(3);

ALTER TABLE "LedgerEntry"
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "stripePaymentStatus" TEXT,
  ADD COLUMN "stripePaidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");
CREATE UNIQUE INDEX "LedgerEntry_stripeCheckoutSessionId_key" ON "LedgerEntry"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "LedgerEntry_stripePaymentIntentId_key" ON "LedgerEntry"("stripePaymentIntentId");
CREATE INDEX "LedgerEntry_stripePaymentStatus_idx" ON "LedgerEntry"("stripePaymentStatus");
