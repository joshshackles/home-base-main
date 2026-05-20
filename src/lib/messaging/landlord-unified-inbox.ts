import { LeadStatus, MessageThreadStatus, MessageThreadType, type Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UnifiedInboxSource = "lead" | "application" | "maintenance" | "lease" | "tenant" | "general";

export type UnifiedInboxMessage = {
  id: string;
  senderName: string;
  senderEmail?: string | null;
  body: string;
  createdAt: Date;
  isMine: boolean;
  isInternal?: boolean;
};

export type UnifiedInboxThread = {
  threadId: string;
  recordId: string;
  sourceType: UnifiedInboxSource;
  subject: string;
  participantName: string;
  participantEmail?: string | null;
  participantPhone?: string | null;
  propertyName?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  rentAmount?: number | null;
  applicationId?: string | null;
  applicationStatus?: string | null;
  maintenanceRequestId?: string | null;
  maintenanceStatus?: string | null;
  maintenancePriority?: string | null;
  leadStatus?: string | null;
  contextSummary: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  needsReply: boolean;
  status: string;
  priority: "urgent" | "high" | "normal";
  actions: Array<{ label: string; href: string }>;
  messages: UnifiedInboxMessage[];
};

export type UnifiedInboxFilters = {
  q?: string | string[];
  source?: string | string[];
  scope?: string | string[];
  thread?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeUnifiedInboxFilters(searchParams?: UnifiedInboxFilters) {
  return {
    q: firstParam(searchParams?.q)?.trim() ?? "",
    source: firstParam(searchParams?.source) ?? "all",
    scope: firstParam(searchParams?.scope) ?? "all",
    thread: firstParam(searchParams?.thread),
  };
}

function sourceFromThreadType(type: MessageThreadType): UnifiedInboxSource {
  if (type === MessageThreadType.APPLICATION) return "application";
  if (type === MessageThreadType.MAINTENANCE) return "maintenance";
  if (type === MessageThreadType.LEASE) return "lease";
  return "general";
}

function unitLabel(unit?: { unitNumber: string; property: { name: string } } | null) {
  return unit ? `${unit.property.name} #${unit.unitNumber}` : null;
}

function preview(value: string | null | undefined) {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 180) : "No message body yet.";
}

function messageThreadPriority(thread: { status: MessageThreadStatus; maintenanceRequest?: { priority?: string | null } | null; messages: Array<{ senderId: string; readByStaffAt: Date | null; isInternal: boolean }> }, landlordId: string): UnifiedInboxThread["priority"] {
  if (thread.maintenanceRequest?.priority === "URGENT") return "urgent";
  if (thread.maintenanceRequest?.priority === "HIGH") return "high";
  const hasUnread = thread.messages.some((message) => message.senderId !== landlordId && !message.isInternal && !message.readByStaffAt);
  if (hasUnread || thread.status === MessageThreadStatus.WAITING_ON_STAFF) return "high";
  return "normal";
}

export async function buildLandlordUnifiedInbox(user: SessionPayload) {
  const unitScope: Prisma.UnitWhereInput = {
    OR: [
      { property: { ownerId: user.userId, isArchived: false } },
      { propertyManagerUserId: user.userId, property: { isArchived: false } },
    ],
  };

  const [messageThreads, leads] = await Promise.all([
    prisma.messageThread.findMany({
      where: {
        OR: [
          { application: { unit: unitScope } },
          { maintenanceRequest: { unit: unitScope } },
          { createdById: user.userId },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        application: { include: { unit: { include: { property: true } } } },
        maintenanceRequest: { include: { unit: { include: { property: true } } } },
        messages: {
          where: { isInternal: false },
          include: { sender: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.lead.findMany({
      where: { unit: unitScope },
      include: { unit: { include: { property: true } }, application: true, notes: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const normalizedThreads: UnifiedInboxThread[] = messageThreads.map((thread) => {
    const sourceType = sourceFromThreadType(thread.type);
    const unit = thread.application?.unit ?? thread.maintenanceRequest?.unit ?? null;
    const latest = thread.messages[thread.messages.length - 1];
    const participant = thread.application
      ? { name: thread.application.applicantName, email: thread.application.applicantEmail, phone: thread.application.applicantPhone }
      : thread.createdBy;
    const unreadCount = thread.messages.filter((message) => message.senderId !== user.userId && !message.readByStaffAt).length;
    const context = thread.application
      ? `${thread.application.applicantName} / ${thread.application.status} application`
      : thread.maintenanceRequest
        ? `${thread.maintenanceRequest.subject} / ${thread.maintenanceRequest.status}`
        : unitLabel(unit) ?? "General conversation";

    return {
      threadId: `message_${thread.id}`,
      recordId: thread.id,
      sourceType,
      subject: thread.subject,
      participantName: participant.name || participant.email || "Participant",
      participantEmail: "email" in participant ? participant.email : null,
      participantPhone: "phone" in participant ? participant.phone : null,
      propertyName: unit?.property.name ?? null,
      unitId: unit?.id ?? null,
      unitLabel: unitLabel(unit),
      rentAmount: unit?.rentAmount ?? null,
      applicationId: thread.application?.id ?? null,
      applicationStatus: thread.application?.status ?? null,
      maintenanceRequestId: thread.maintenanceRequest?.id ?? null,
      maintenanceStatus: thread.maintenanceRequest?.status ?? null,
      maintenancePriority: thread.maintenanceRequest?.priority ?? null,
      contextSummary: context,
      lastMessageAt: thread.lastMessageAt ?? latest?.createdAt ?? thread.createdAt,
      lastMessagePreview: preview(latest?.body),
      unreadCount,
      needsReply: thread.status === MessageThreadStatus.WAITING_ON_STAFF || unreadCount > 0,
      status: thread.status,
      priority: messageThreadPriority(thread, user.userId),
      actions: [
        thread.application?.id ? { label: "Open application", href: `/landlord/applications/${thread.application.id}` } : null,
        thread.maintenanceRequest?.id ? { label: "Open maintenance", href: "/landlord/maintenance" } : null,
        unit?.id ? { label: "Open rental", href: `/landlord/rentals/${unit.id}` } : null,
      ].filter((action): action is { label: string; href: string } => Boolean(action)),
      messages: thread.messages.map((message) => ({
        id: message.id,
        senderName: message.sender.name || message.sender.email,
        senderEmail: message.sender.email,
        body: message.body,
        createdAt: message.createdAt,
        isMine: message.senderId === user.userId,
        isInternal: message.isInternal,
      })),
    };
  });

  const normalizedLeads: UnifiedInboxThread[] = leads.map((lead) => {
    const noteMessages = lead.notes.map((note) => ({
      id: note.id,
      senderName: note.note.startsWith("[Landlord") ? user.name || user.email : "Lead note",
      senderEmail: note.note.startsWith("[Landlord") ? user.email : null,
      body: note.note,
      createdAt: note.createdAt,
      isMine: note.note.startsWith("[Landlord"),
      isInternal: false,
    }));
    const messages: UnifiedInboxMessage[] = [
      {
        id: `lead_${lead.id}_initial`,
        senderName: lead.name,
        senderEmail: lead.email,
        body: lead.message || "I am interested in this rental.",
        createdAt: lead.createdAt,
        isMine: false,
      },
      ...noteMessages,
    ];
    const latest = messages[messages.length - 1];
    const unreadCount = lead.status === LeadStatus.NEW ? 1 : 0;

    return {
      threadId: `lead_${lead.id}`,
      recordId: lead.id,
      sourceType: "lead",
      subject: `Lead question: ${lead.unit.property.name} #${lead.unit.unitNumber}`,
      participantName: lead.name,
      participantEmail: lead.email,
      participantPhone: lead.phone,
      propertyName: lead.unit.property.name,
      unitId: lead.unit.id,
      unitLabel: unitLabel(lead.unit),
      rentAmount: lead.unit.rentAmount,
      applicationId: lead.application?.id ?? null,
      applicationStatus: lead.application?.status ?? null,
      leadStatus: lead.status,
      contextSummary: `${lead.name} asked about ${lead.unit.property.name} #${lead.unit.unitNumber}`,
      lastMessageAt: latest?.createdAt ?? lead.updatedAt,
      lastMessagePreview: preview(latest?.body),
      unreadCount,
      needsReply: lead.status === LeadStatus.NEW || lead.status === LeadStatus.OPEN,
      status: lead.status,
      priority: lead.status === LeadStatus.NEW ? "high" : "normal",
      actions: [
        { label: "Open listing", href: `/marketplace/${lead.unit.id}` },
        { label: "Open lead", href: `/landlord/leads/${lead.id}` },
        lead.application?.id ? { label: "Open application", href: `/landlord/applications/${lead.application.id}` } : null,
      ].filter((action): action is { label: string; href: string } => Boolean(action)),
      messages,
    };
  });

  return [...normalizedThreads, ...normalizedLeads].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export function filterUnifiedInboxThreads(threads: UnifiedInboxThread[], filters: ReturnType<typeof normalizeUnifiedInboxFilters>) {
  return threads.filter((thread) => {
    const haystack = [
      thread.subject,
      thread.participantName,
      thread.participantEmail,
      thread.participantPhone,
      thread.propertyName,
      thread.unitLabel,
      thread.contextSummary,
      thread.lastMessagePreview,
      ...thread.messages.map((message) => message.body),
    ].filter(Boolean).join(" ").toLowerCase();
    if (filters.q && !haystack.includes(filters.q.toLowerCase())) return false;
    if (filters.source !== "all" && thread.sourceType !== filters.source) return false;
    if (filters.scope === "unread" && thread.unreadCount === 0) return false;
    if (filters.scope === "needs-reply" && !thread.needsReply) return false;
    if (filters.scope === "closed" && !["CLOSED", "CLOSED_LOST", "CONVERTED"].includes(thread.status)) return false;
    return true;
  });
}
