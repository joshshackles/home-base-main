-- CreateEnum
CREATE TYPE "LeasePacketStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'VOIDED');

-- CreateTable
CREATE TABLE "LeaseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeasePacket" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "LeasePacketStatus" NOT NULL DEFAULT 'DRAFT',
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "monthlyRent" INTEGER NOT NULL,
    "securityDeposit" INTEGER,
    "terms" TEXT,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeasePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseNote" (
    "id" TEXT NOT NULL,
    "leasePacketId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaseTemplate_name_key" ON "LeaseTemplate"("name");

-- CreateIndex
CREATE INDEX "LeaseTemplate_isActive_idx" ON "LeaseTemplate"("isActive");

-- CreateIndex
CREATE INDEX "LeasePacket_applicationId_idx" ON "LeasePacket"("applicationId");

-- CreateIndex
CREATE INDEX "LeasePacket_templateId_idx" ON "LeasePacket"("templateId");

-- CreateIndex
CREATE INDEX "LeasePacket_status_idx" ON "LeasePacket"("status");

-- CreateIndex
CREATE INDEX "LeasePacket_createdAt_idx" ON "LeasePacket"("createdAt");

-- CreateIndex
CREATE INDEX "LeaseNote_leasePacketId_idx" ON "LeaseNote"("leasePacketId");

-- CreateIndex
CREATE INDEX "LeaseNote_createdAt_idx" ON "LeaseNote"("createdAt");

-- AddForeignKey
ALTER TABLE "LeasePacket" ADD CONSTRAINT "LeasePacket_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeasePacket" ADD CONSTRAINT "LeasePacket_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LeaseTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseNote" ADD CONSTRAINT "LeaseNote_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "leasePacketId" TEXT;

-- CreateIndex
CREATE INDEX "Document_leasePacketId_idx" ON "Document"("leasePacketId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
