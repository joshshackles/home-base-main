-- CreateEnum
CREATE TYPE "ConnectionRole" AS ENUM ('PROPERTY_MANAGER', 'CASEWORKER', 'INSPECTOR', 'MAINTENANCE_STAFF', 'PREFERRED_VENDOR', 'CONNECTED_RENTER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "ProfileConnection" (
    "id" TEXT NOT NULL,
    "landlordUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "unitId" TEXT,
    "assignedRole" "ConnectionRole" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileConnection_landlordUserId_targetUserId_unitId_assignedRole_key" ON "ProfileConnection"("landlordUserId", "targetUserId", "unitId", "assignedRole");

-- CreateIndex
CREATE INDEX "ProfileConnection_landlordUserId_status_idx" ON "ProfileConnection"("landlordUserId", "status");

-- CreateIndex
CREATE INDEX "ProfileConnection_targetUserId_status_idx" ON "ProfileConnection"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "ProfileConnection_unitId_idx" ON "ProfileConnection"("unitId");

-- AddForeignKey
ALTER TABLE "ProfileConnection" ADD CONSTRAINT "ProfileConnection_landlordUserId_fkey" FOREIGN KEY ("landlordUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileConnection" ADD CONSTRAINT "ProfileConnection_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileConnection" ADD CONSTRAINT "ProfileConnection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
