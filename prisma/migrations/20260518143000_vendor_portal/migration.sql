-- Module 7: Vendor Portal
CREATE TYPE "VendorInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "VendorInvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');
CREATE TYPE "VendorWorkLogStatus" AS ENUM ('NOTE', 'EN_ROUTE', 'ON_SITE', 'BLOCKED', 'COMPLETED');

CREATE TABLE "VendorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "unitId" TEXT,
  "companyName" TEXT NOT NULL,
  "trade" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "insuranceExpiresAt" TIMESTAMP(3),
  "licenseNumber" TEXT,
  "hourlyRate" INTEGER,
  "inviteStatus" "VendorInviteStatus" NOT NULL DEFAULT 'ACCEPTED',
  "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorWorkLog" (
  "id" TEXT NOT NULL,
  "vendorUserId" TEXT NOT NULL,
  "vendorProfileId" TEXT,
  "maintenanceRequestId" TEXT,
  "status" "VendorWorkLogStatus" NOT NULL DEFAULT 'NOTE',
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "laborMinutes" INTEGER,
  "materialsCost" INTEGER,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorWorkLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorInvoice" (
  "id" TEXT NOT NULL,
  "vendorUserId" TEXT NOT NULL,
  "vendorProfileId" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "unitId" TEXT,
  "maintenanceRequestId" TEXT,
  "vendorPayoutId" TEXT,
  "invoiceNumber" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" INTEGER NOT NULL,
  "status" "VendorInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "VendorProfile"("userId");
CREATE INDEX "VendorProfile_ownerUserId_isActive_idx" ON "VendorProfile"("ownerUserId", "isActive");
CREATE INDEX "VendorProfile_userId_idx" ON "VendorProfile"("userId");
CREATE INDEX "VendorProfile_unitId_idx" ON "VendorProfile"("unitId");
CREATE INDEX "VendorProfile_trade_idx" ON "VendorProfile"("trade");
CREATE INDEX "VendorProfile_inviteStatus_idx" ON "VendorProfile"("inviteStatus");
CREATE INDEX "VendorWorkLog_vendorUserId_createdAt_idx" ON "VendorWorkLog"("vendorUserId", "createdAt");
CREATE INDEX "VendorWorkLog_vendorProfileId_idx" ON "VendorWorkLog"("vendorProfileId");
CREATE INDEX "VendorWorkLog_maintenanceRequestId_idx" ON "VendorWorkLog"("maintenanceRequestId");
CREATE INDEX "VendorWorkLog_status_idx" ON "VendorWorkLog"("status");
CREATE INDEX "VendorInvoice_vendorUserId_status_idx" ON "VendorInvoice"("vendorUserId", "status");
CREATE INDEX "VendorInvoice_ownerUserId_status_idx" ON "VendorInvoice"("ownerUserId", "status");
CREATE INDEX "VendorInvoice_unitId_idx" ON "VendorInvoice"("unitId");
CREATE INDEX "VendorInvoice_maintenanceRequestId_idx" ON "VendorInvoice"("maintenanceRequestId");
CREATE INDEX "VendorInvoice_vendorPayoutId_idx" ON "VendorInvoice"("vendorPayoutId");
CREATE INDEX "VendorInvoice_createdAt_idx" ON "VendorInvoice"("createdAt");

ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorWorkLog" ADD CONSTRAINT "VendorWorkLog_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorWorkLog" ADD CONSTRAINT "VendorWorkLog_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorWorkLog" ADD CONSTRAINT "VendorWorkLog_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorWorkLog" ADD CONSTRAINT "VendorWorkLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
