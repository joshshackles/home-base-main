CREATE TYPE "StoredPaymentMethodType" AS ENUM ('US_BANK_ACCOUNT', 'CARD', 'OTHER');
CREATE TYPE "PaymentMethodVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED');
CREATE TYPE "ScheduledPaymentStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "LateFeeMode" AS ENUM ('NONE', 'FLAT', 'PERCENT', 'DAILY_FLAT');
CREATE TYPE "PaymentEventType" AS ENUM ('METHOD_ADDED', 'METHOD_VERIFIED', 'SCHEDULE_CREATED', 'SCHEDULE_CANCELLED', 'PAYMENT_STARTED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'LATE_FEE_APPLIED', 'RENT_ADJUSTED');

ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

CREATE TABLE "RenterPaymentMethod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "stripePaymentMethodId" TEXT NOT NULL,
  "type" "StoredPaymentMethodType" NOT NULL DEFAULT 'US_BANK_ACCOUNT',
  "brand" TEXT,
  "bankName" TEXT,
  "last4" TEXT,
  "nickname" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verificationStatus" "PaymentMethodVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenterPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentBillingPolicy" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "monthlyRent" INTEGER NOT NULL,
  "dueDayOfMonth" INTEGER NOT NULL DEFAULT 1,
  "graceDays" INTEGER NOT NULL DEFAULT 5,
  "lateFeeMode" "LateFeeMode" NOT NULL DEFAULT 'FLAT',
  "lateFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "dailyLateFee" INTEGER NOT NULL DEFAULT 0,
  "maxLateFee" INTEGER,
  "allowPartialPay" BOOLEAN NOT NULL DEFAULT true,
  "autopayAllowed" BOOLEAN NOT NULL DEFAULT true,
  "startsOn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentBillingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledPayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "stripePaymentMethodId" TEXT,
  "amount" INTEGER NOT NULL,
  "status" "ScheduledPaymentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "isAutopay" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "type" "PaymentEventType" NOT NULL,
  "userId" TEXT,
  "unitId" TEXT,
  "ledgerEntryId" TEXT,
  "stripeEventId" TEXT,
  "amount" INTEGER,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RenterPaymentMethod_stripePaymentMethodId_key" ON "RenterPaymentMethod"("stripePaymentMethodId");
CREATE INDEX "RenterPaymentMethod_userId_isDefault_idx" ON "RenterPaymentMethod"("userId", "isDefault");
CREATE INDEX "RenterPaymentMethod_verificationStatus_idx" ON "RenterPaymentMethod"("verificationStatus");
CREATE UNIQUE INDEX "RentBillingPolicy_unitId_key" ON "RentBillingPolicy"("unitId");
CREATE INDEX "RentBillingPolicy_dueDayOfMonth_idx" ON "RentBillingPolicy"("dueDayOfMonth");
CREATE INDEX "RentBillingPolicy_autopayAllowed_idx" ON "RentBillingPolicy"("autopayAllowed");
CREATE INDEX "ScheduledPayment_userId_status_idx" ON "ScheduledPayment"("userId", "status");
CREATE INDEX "ScheduledPayment_unitId_status_idx" ON "ScheduledPayment"("unitId", "status");
CREATE INDEX "ScheduledPayment_ledgerEntryId_idx" ON "ScheduledPayment"("ledgerEntryId");
CREATE INDEX "ScheduledPayment_scheduledFor_status_idx" ON "ScheduledPayment"("scheduledFor", "status");
CREATE UNIQUE INDEX "PaymentEvent_stripeEventId_key" ON "PaymentEvent"("stripeEventId");
CREATE INDEX "PaymentEvent_userId_createdAt_idx" ON "PaymentEvent"("userId", "createdAt");
CREATE INDEX "PaymentEvent_unitId_createdAt_idx" ON "PaymentEvent"("unitId", "createdAt");
CREATE INDEX "PaymentEvent_ledgerEntryId_idx" ON "PaymentEvent"("ledgerEntryId");
CREATE INDEX "PaymentEvent_type_idx" ON "PaymentEvent"("type");

ALTER TABLE "RenterPaymentMethod" ADD CONSTRAINT "RenterPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentBillingPolicy" ADD CONSTRAINT "RentBillingPolicy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
