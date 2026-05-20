-- Start canonical conversation model migration without rewriting existing lead/message history.
CREATE TYPE "ConversationSourceType" AS ENUM ('LEAD', 'APPLICATION', 'MAINTENANCE', 'INSPECTION', 'VENDOR', 'LEASE', 'TENANT', 'GENERAL');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'WAITING_ON_STAFF', 'WAITING_ON_RENTER', 'WAITING_ON_VENDOR', 'WAITING_ON_INSPECTOR', 'CLOSED');
CREATE TYPE "ConversationEventType" AS ENUM ('MESSAGE', 'NOTE', 'STATUS_CHANGE', 'SYSTEM');

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "sourceType" "ConversationSourceType" NOT NULL DEFAULT 'GENERAL',
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "leadId" TEXT,
  "applicationId" TEXT,
  "maintenanceRequestId" TEXT,
  "inspectionId" TEXT,
  "propertyId" TEXT,
  "unitId" TEXT,
  "messageThreadId" TEXT,
  "createdById" TEXT,
  "lastActivityAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT,
  "displayName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "roleLabel" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationEvent" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "eventType" "ConversationEventType" NOT NULL DEFAULT 'MESSAGE',
  "senderUserId" TEXT,
  "senderName" TEXT,
  "senderEmail" TEXT,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "legacyMessageId" TEXT,
  "legacyLeadNoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_sourceType_idx" ON "Conversation"("sourceType");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");
CREATE INDEX "Conversation_applicationId_idx" ON "Conversation"("applicationId");
CREATE INDEX "Conversation_maintenanceRequestId_idx" ON "Conversation"("maintenanceRequestId");
CREATE INDEX "Conversation_inspectionId_idx" ON "Conversation"("inspectionId");
CREATE INDEX "Conversation_propertyId_idx" ON "Conversation"("propertyId");
CREATE INDEX "Conversation_unitId_idx" ON "Conversation"("unitId");
CREATE INDEX "Conversation_messageThreadId_idx" ON "Conversation"("messageThreadId");
CREATE INDEX "Conversation_createdById_idx" ON "Conversation"("createdById");
CREATE INDEX "Conversation_lastActivityAt_idx" ON "Conversation"("lastActivityAt");
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
CREATE INDEX "ConversationParticipant_email_idx" ON "ConversationParticipant"("email");
CREATE INDEX "ConversationParticipant_roleLabel_idx" ON "ConversationParticipant"("roleLabel");
CREATE INDEX "ConversationEvent_conversationId_idx" ON "ConversationEvent"("conversationId");
CREATE INDEX "ConversationEvent_senderUserId_idx" ON "ConversationEvent"("senderUserId");
CREATE INDEX "ConversationEvent_legacyMessageId_idx" ON "ConversationEvent"("legacyMessageId");
CREATE INDEX "ConversationEvent_legacyLeadNoteId_idx" ON "ConversationEvent"("legacyLeadNoteId");
CREATE INDEX "ConversationEvent_eventType_idx" ON "ConversationEvent"("eventType");
CREATE INDEX "ConversationEvent_createdAt_idx" ON "ConversationEvent"("createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
