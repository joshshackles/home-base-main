CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_ON_TENANT', 'WAITING_ON_VENDOR', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "MessageThreadType" AS ENUM ('GENERAL', 'APPLICATION', 'LEASE', 'MAINTENANCE');
CREATE TYPE "MessageThreadStatus" AS ENUM ('OPEN', 'WAITING_ON_STAFF', 'WAITING_ON_APPLICANT', 'CLOSED');

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'MAINTENANCE_REQUEST_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'MESSAGE_SENT';

CREATE TABLE "MaintenanceRequest" (
  "id" TEXT NOT NULL,
  "unitId" TEXT,
  "applicationId" TEXT,
  "requesterId" TEXT NOT NULL,
  "assignedToId" TEXT,
  "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'NEW',
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "accessNotes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageThread" (
  "id" TEXT NOT NULL,
  "type" "MessageThreadType" NOT NULL DEFAULT 'GENERAL',
  "status" "MessageThreadStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "applicationId" TEXT,
  "maintenanceRequestId" TEXT,
  "createdById" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "readByStaffAt" TIMESTAMP(3),
  "readByApplicantAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenanceRequest_unitId_idx" ON "MaintenanceRequest"("unitId");
CREATE INDEX "MaintenanceRequest_applicationId_idx" ON "MaintenanceRequest"("applicationId");
CREATE INDEX "MaintenanceRequest_requesterId_idx" ON "MaintenanceRequest"("requesterId");
CREATE INDEX "MaintenanceRequest_assignedToId_idx" ON "MaintenanceRequest"("assignedToId");
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");
CREATE INDEX "MaintenanceRequest_priority_idx" ON "MaintenanceRequest"("priority");
CREATE INDEX "MaintenanceRequest_createdAt_idx" ON "MaintenanceRequest"("createdAt");
CREATE INDEX "MessageThread_type_idx" ON "MessageThread"("type");
CREATE INDEX "MessageThread_status_idx" ON "MessageThread"("status");
CREATE INDEX "MessageThread_applicationId_idx" ON "MessageThread"("applicationId");
CREATE INDEX "MessageThread_maintenanceRequestId_idx" ON "MessageThread"("maintenanceRequestId");
CREATE INDEX "MessageThread_createdById_idx" ON "MessageThread"("createdById");
CREATE INDEX "MessageThread_lastMessageAt_idx" ON "MessageThread"("lastMessageAt");
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "Message_isInternal_idx" ON "Message"("isInternal");

ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
