ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VENDOR';

CREATE TABLE IF NOT EXISTS "VendorInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerUserId" TEXT NOT NULL,
  "unitId" TEXT,
  "email" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT,
  "trade" TEXT NOT NULL,
  "phone" TEXT,
  "licenseNumber" TEXT,
  "insuranceExpiresAt" TIMESTAMP(3),
  "hourlyRate" INTEGER,
  "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" "VendorInviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedByUserId" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorInvitation_tokenHash_key" ON "VendorInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "VendorInvitation_ownerUserId_status_idx" ON "VendorInvitation"("ownerUserId", "status");
CREATE INDEX IF NOT EXISTS "VendorInvitation_email_status_idx" ON "VendorInvitation"("email", "status");
CREATE INDEX IF NOT EXISTS "VendorInvitation_unitId_idx" ON "VendorInvitation"("unitId");
CREATE INDEX IF NOT EXISTS "VendorInvitation_acceptedByUserId_idx" ON "VendorInvitation"("acceptedByUserId");

ALTER TABLE "VendorInvitation" ADD CONSTRAINT "VendorInvitation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvitation" ADD CONSTRAINT "VendorInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvitation" ADD CONSTRAINT "VendorInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvitation" ADD CONSTRAINT "VendorInvitation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
