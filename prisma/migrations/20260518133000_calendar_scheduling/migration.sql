-- Calendar / Scheduling module
CREATE TYPE "ScheduleEventType" AS ENUM ('TOUR','INSPECTION','MAINTENANCE','LEASE_SIGNING','MOVE_IN','MOVE_OUT','RENT_DUE','PAYMENT','RENEWAL','NOTICE','TASK','GENERAL');
CREATE TYPE "ScheduleEventStatus" AS ENUM ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE "ScheduleEventVisibility" AS ENUM ('INTERNAL','STAFF','PARTICIPANTS','PUBLIC');

CREATE TABLE "ScheduleEvent" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "ScheduleEventType" NOT NULL DEFAULT 'GENERAL',
  "status" "ScheduleEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "visibility" "ScheduleEventVisibility" NOT NULL DEFAULT 'PARTICIPANTS',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT,
  "meetingUrl" TEXT,
  "reminderMinutes" INTEGER DEFAULT 60,
  "propertyId" TEXT,
  "unitId" TEXT,
  "taskItemId" TEXT,
  "createdById" TEXT,
  "assignedToId" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleEventParticipant" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "ScheduleEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleEventParticipant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleEvent_startsAt_endsAt_idx" ON "ScheduleEvent"("startsAt", "endsAt");
CREATE INDEX "ScheduleEvent_status_startsAt_idx" ON "ScheduleEvent"("status", "startsAt");
CREATE INDEX "ScheduleEvent_type_status_idx" ON "ScheduleEvent"("type", "status");
CREATE INDEX "ScheduleEvent_propertyId_idx" ON "ScheduleEvent"("propertyId");
CREATE INDEX "ScheduleEvent_unitId_idx" ON "ScheduleEvent"("unitId");
CREATE INDEX "ScheduleEvent_taskItemId_idx" ON "ScheduleEvent"("taskItemId");
CREATE INDEX "ScheduleEvent_createdById_idx" ON "ScheduleEvent"("createdById");
CREATE INDEX "ScheduleEvent_assignedToId_idx" ON "ScheduleEvent"("assignedToId");
CREATE UNIQUE INDEX "ScheduleEventParticipant_eventId_userId_key" ON "ScheduleEventParticipant"("eventId", "userId");
CREATE INDEX "ScheduleEventParticipant_userId_status_idx" ON "ScheduleEventParticipant"("userId", "status");
CREATE INDEX "ScheduleEventParticipant_eventId_idx" ON "ScheduleEventParticipant"("eventId");

ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_taskItemId_fkey" FOREIGN KEY ("taskItemId") REFERENCES "TaskItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEventParticipant" ADD CONSTRAINT "ScheduleEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleEventParticipant" ADD CONSTRAINT "ScheduleEventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
