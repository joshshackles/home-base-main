import { LeadStatus, MessageThreadStatus, MessageThreadType, UserRole, type Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { canAccessLead, canAccessMaintenanceRequest, canAccessMessageThread, canAccessInspection } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export type CanonicalConversationSource = "lead" | "application" | "maintenance" | "inspection" | "vendor" | "lease" | "tenant" | "general";
export type CanonicalConversationStatus = "open" | "waiting_on_staff" | "waiting_on_renter" | "waiting_on_vendor" | "waiting_on_inspector" | "closed";

export type CanonicalConversationEvent = {
  id: string;
  type: "message" | "note" | "status_change" | "system";
  senderName: string;
  senderEmail?: string | null;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  legacySource: "lead" | "lead_note" | "message";
};

export type CanonicalConversation = {
  id: string;
  sourceType: CanonicalConversationSource;
  sourceId: string;
  subject: string;
  status: CanonicalConversationStatus;
  propertyId?: string | null;
  unitId?: string | null;
  applicationId?: string | null;
  maintenanceRequestId?: string | null;
  inspectionId?: string | null;
  messageThreadId?: string | null;
  participantName: string;
  participantEmail?: string | null;
  participantPhone?: string | null;
  contextSummary: string;
  lastActivityAt: Date;
  events: CanonicalConversationEvent[];
  canReply: boolean;
};

type LeadRecord = Prisma.LeadGetPayload<{
  include: {
    unit: { include: { property: true } };
    application: true;
    notes: { orderBy: { createdAt: "asc" } };
  };
}>;

type ThreadRecord = Prisma.MessageThreadGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true; role: true } };
    application: { include: { unit: { include: { property: true } } } };
    maintenanceRequest: { include: { unit: { include: { property: true } }; requester: { select: { id: true; name: true; email: true } }; assignedTo: { select: { id: true; name: true; email: true; role: true } } } };
    messages: { include: { sender: { select: { id: true; name: true; email: true; role: true } } } };
  };
}>;

function threadSource(type: MessageThreadType): CanonicalConversationSource {
  if (type === MessageThreadType.APPLICATION) return "application";
  if (type === MessageThreadType.MAINTENANCE) return "maintenance";
  if (type === MessageThreadType.LEASE) return "lease";
  return "general";
}

function statusFromThread(status: MessageThreadStatus): CanonicalConversationStatus {
  if (status === MessageThreadStatus.WAITING_ON_STAFF) return "waiting_on_staff";
  if (status === MessageThreadStatus.WAITING_ON_APPLICANT) return "waiting_on_renter";
  if (status === MessageThreadStatus.CLOSED) return "closed";
  return "open";
}

function statusFromLead(status: LeadStatus): CanonicalConversationStatus {
  return status === LeadStatus.CLOSED ? "closed" : status === LeadStatus.NEW ? "waiting_on_staff" : "open";
}

function compact(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function unitLabel(unit?: { unitNumber?: string | null; property?: { name?: string | null } | null } | null) {
  if (!unit) return "No rental context";
  return `${unit.property?.name ?? "Property"} #${unit.unitNumber ?? "Unit"}`;
}

export function canonicalFromLead(lead: LeadRecord): CanonicalConversation {
  const events: CanonicalConversationEvent[] = [
    {
      id: `lead_${lead.id}_initial`,
      type: "message",
      senderName: lead.name,
      senderEmail: lead.email,
      body: compact(lead.message) ?? "Lead submitted an inquiry without a message.",
      isInternal: false,
      createdAt: lead.createdAt,
      legacySource: "lead",
    },
    ...lead.notes.map((note) => ({
      id: `lead_note_${note.id}`,
      type: note.note.startsWith("[Landlord reply") ? "message" as const : "note" as const,
      senderName: note.note.startsWith("[Landlord reply") ? "Landlord reply" : "Landlord note",
      senderEmail: null,
      body: note.note,
      isInternal: !note.note.startsWith("[Landlord reply"),
      createdAt: note.createdAt,
      legacySource: "lead_note" as const,
    })),
  ];
  const last = events.at(-1);

  return {
    id: `lead_${lead.id}`,
    sourceType: "lead",
    sourceId: lead.id,
    subject: `Listing question: ${unitLabel(lead.unit)}`,
    status: statusFromLead(lead.status),
    propertyId: lead.unit.propertyId,
    unitId: lead.unitId,
    applicationId: lead.application?.id ?? null,
    participantName: lead.name,
    participantEmail: lead.email,
    participantPhone: lead.phone,
    contextSummary: `${unitLabel(lead.unit)} / ${lead.unit.property.city}, ${lead.unit.property.state}`,
    lastActivityAt: last?.createdAt ?? lead.updatedAt,
    events,
    canReply: lead.status !== LeadStatus.CLOSED,
  };
}

export function canonicalFromMessageThread(thread: ThreadRecord, currentUserId: string): CanonicalConversation {
  const unit = thread.application?.unit ?? thread.maintenanceRequest?.unit ?? null;
  const firstExternalSender = thread.messages.find((message) => message.senderId !== currentUserId && !message.isInternal)?.sender;
  const participant = firstExternalSender ?? thread.maintenanceRequest?.requester ?? thread.createdBy;
  const events = thread.messages.map((message) => ({
    id: message.id,
    type: "message" as const,
    senderName: message.sender.name ?? message.sender.email,
    senderEmail: message.sender.email,
    body: message.body,
    isInternal: message.isInternal,
    createdAt: message.createdAt,
    legacySource: "message" as const,
  }));

  return {
    id: `thread_${thread.id}`,
    sourceType: threadSource(thread.type),
    sourceId: thread.id,
    subject: thread.subject,
    status: statusFromThread(thread.status),
    propertyId: unit?.propertyId ?? null,
    unitId: unit?.id ?? null,
    applicationId: thread.applicationId,
    maintenanceRequestId: thread.maintenanceRequestId,
    messageThreadId: thread.id,
    participantName: participant?.name ?? participant?.email ?? "Conversation participant",
    participantEmail: participant?.email ?? null,
    contextSummary: `${threadSource(thread.type)} / ${unitLabel(unit)}`,
    lastActivityAt: thread.lastMessageAt ?? events.at(-1)?.createdAt ?? thread.createdAt,
    events,
    canReply: thread.status !== MessageThreadStatus.CLOSED,
  };
}

export async function assertCanAccessCanonicalConversation(user: SessionPayload, conversationId: string) {
  const [prefix, ...rest] = conversationId.split("_");
  const sourceId = rest.join("_");
  const ok =
    prefix === "lead"
      ? await canAccessLead(user, sourceId)
      : prefix === "thread"
        ? await canAccessMessageThread(user, sourceId)
        : prefix === "maintenance"
          ? await canAccessMaintenanceRequest(user, sourceId)
          : prefix === "inspection"
            ? await canAccessInspection(user, sourceId)
            : false;
  if (!ok) throw new Error("You do not have permission to access this conversation.");
}

export async function getCanonicalConversationCounts() {
  const [legacyLeads, legacyThreads, canonicalRows, maintenanceLinkedThreads, inspectionsAssigned, vendorAssignedWork] = await Promise.all([
    prisma.lead.count(),
    prisma.messageThread.count(),
    prisma.conversation.count(),
    prisma.maintenanceRequest.count({ where: { messageThreads: { some: {} } } }),
    prisma.inspection.count({ where: { assignedToId: { not: null } } }),
    prisma.maintenanceRequest.count({ where: { assignedTo: { role: UserRole.VENDOR } } }),
  ]);

  return {
    legacyLeads,
    legacyThreads,
    canonicalRows,
    maintenanceLinkedThreads,
    inspectionsAssigned,
    vendorAssignedWork,
    migrationStarted: true,
  };
}
