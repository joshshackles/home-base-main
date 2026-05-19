-- Module 3: Tasks / Work Orders
CREATE TYPE "TaskItemType" AS ENUM ('GENERAL', 'LEASING', 'MAINTENANCE', 'INSPECTION', 'MOVE_IN', 'MOVE_OUT', 'COLLECTIONS', 'DOCUMENT', 'NOTICE', 'VENDOR', 'FOLLOW_UP');
CREATE TYPE "TaskItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'WAITING', 'DONE', 'CANCELLED');
CREATE TYPE "TaskItemPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "TaskItem" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "TaskItemType" NOT NULL DEFAULT 'GENERAL',
  "status" "TaskItemStatus" NOT NULL DEFAULT 'TODO',
  "priority" "TaskItemPriority" NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "propertyId" TEXT,
  "unitId" TEXT,
  "applicationId" TEXT,
  "maintenanceRequestId" TEXT,
  "leasePacketId" TEXT,
  "documentId" TEXT,
  "createdById" TEXT,
  "assignedToId" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskItem_status_priority_idx" ON "TaskItem"("status", "priority");
CREATE INDEX "TaskItem_type_status_idx" ON "TaskItem"("type", "status");
CREATE INDEX "TaskItem_dueAt_idx" ON "TaskItem"("dueAt");
CREATE INDEX "TaskItem_propertyId_idx" ON "TaskItem"("propertyId");
CREATE INDEX "TaskItem_unitId_idx" ON "TaskItem"("unitId");
CREATE INDEX "TaskItem_applicationId_idx" ON "TaskItem"("applicationId");
CREATE INDEX "TaskItem_maintenanceRequestId_idx" ON "TaskItem"("maintenanceRequestId");
CREATE INDEX "TaskItem_leasePacketId_idx" ON "TaskItem"("leasePacketId");
CREATE INDEX "TaskItem_documentId_idx" ON "TaskItem"("documentId");
CREATE INDEX "TaskItem_createdById_idx" ON "TaskItem"("createdById");
CREATE INDEX "TaskItem_assignedToId_idx" ON "TaskItem"("assignedToId");
CREATE INDEX "TaskItem_createdAt_idx" ON "TaskItem"("createdAt");

ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_leasePacketId_fkey" FOREIGN KEY ("leasePacketId") REFERENCES "LeasePacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
