-- CreateEnum
CREATE TYPE "SignatureRole" AS ENUM ('TENANT', 'LANDLORD');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'VOIDED');

-- AlterEnum
ALTER TYPE "LeasePacketStatus" ADD VALUE IF NOT EXISTS 'SENT_FOR_SIGNATURE';
ALTER TYPE "LeasePacketStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- AlterEnum
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_REQUESTED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SIGNATURE_COMPLETED';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SIGN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SEND';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPLETE';

-- AlterTable
ALTER TABLE "LeasePacket" ADD COLUMN "sentForSignatureAt" TIMESTAMP(3), ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SignatureRequest" (
  "id" TEXT NOT NULL,
  "leasePacketId" TEXT NOT NULL,
  "signerRole" "SignatureRole" NOT NULL,
  "signerUserId" TEXT,
  "signerName" TEXT NOT NULL,
  "signerEmail" TEXT NOT NULL,
  "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
  "signatureText" TEXT,
  "signedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignatureRequest_leasePacketId_idx" ON "SignatureRequest"("leasePacketId");
CREATE INDEX "SignatureRequest_signerUserId_idx" ON "SignatureRequest"("signerUserId");
CREATE INDEX "SignatureRequest_signerEmail_idx" ON "SignatureRequest"("signerEmail");
CREATE INDEX "SignatureRequest_signerRole_idx" ON "SignatureRequest"("signerRole");
CREATE INDEX "SignatureRequest_status_idx" ON "SignatureRequest"("status");

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
