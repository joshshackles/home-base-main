import { LeadStatus, MaintenancePriority, MessageThreadStatus, MessageThreadType, UserRole, type Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { visibleMessageWhereForUser, visibleThreadWhereForUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export type UnifiedLandlordSourceType = "lead" | "application" | "maintenance" | "lease" | "tenant" | "general";
export type UnifiedInboxPriority = "urgent" | "high" | "normal";
export type UnifiedInboxReplyAction = "lead" | "message";

export type UnifiedInboxAction = {
  label: string;
  href: string;
};

export type UnifiedInboxMessage = {
  id: string;
  senderName: string;
  senderEmail?: string | null;
  senderRole: string;
  body: string;
  createdAt: Date;
  direction: "inbound" | "outbound" | "internal";
  isInternal: boolean;
};

export type UnifiedInboxContext = {
  propertyName?: string | null;
  unitNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  rentAmount?: number | null;
  availableOn?: Date | null;
  applicationId?: string | null;
  applicationStatus?: string | null;
  maintenanceRequestId?: string | null;
  maintenanceStatus?: string | null;
  maintenancePriority?: string | null;
  leadId?: string | null;
  leadStatus?: string | null;
  listingHref?: string | null;
  recordHref?: string | null;
};

export type UnifiedInboxThread = {
  id: string;
  sourceId: string;
  sourceType: UnifiedLandlordSourceType;
  title: string;
  subject: string;
  participantName: string;
  participantEmail?: string | null;
  participantPhone?: string | null;
  status: string;
  priority: UnifiedInboxPriority;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  needsReply: boolean;
  contextSummary: string;
  context: UnifiedInboxContext;
  actions: UnifiedInboxAction[];
  messages: UnifiedInboxMessage[];
  canReply: boolean;
  replyAction: UnifiedInboxReplyAction;
};

export type UnifiedInboxMetrics = {
  total: number;
  needsReply: number;
  unread: number;
  leads: number;
  applications: number;
  maintenance: number;
};

export type UnifiedInboxFilters = {
  q?: string;
  source?: string;
  scope?: string;
  sort?: string;
};

export type UnifiedLandlordInbox = {
  threads: UnifiedInboxThread[];
  metrics: UnifiedInboxMetrics;
};

const SOURCE_LABELS: Record<UnifiedLandlordSourceType, string> = {
  lead: "Lead",
  application: "Application",
  maintenance: "Maintenance",
  lease: "Lease",
  tenant: "Tenant",
  general: "General"
};

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

function titleCaseStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unitLabel(unit?: { unitNumber?: string | null; property?: { name?: string | null } | null } | null) {
  if (!unit) return "General conversation";
  return `${unit.property?.name ?? "Property"} #${unit.unitNumber ?? "Unit"}`;
}

function addressLabel(unit?: { property?: { addressLine?: string | null; city?: string | null; state?: string | null } | null } | null) {
  const property = unit?.property;
  return [property?.addressLine, property?.city, property?.state].filter(Boolean).join(", ") || null;
}

function sourceTypeForThread(type: MessageThreadType): UnifiedLandlordSourceType {
  if (type === MessageThreadType.APPLICATION) return "application";
  if (type === MessageThreadType.MAINTENANCE) return "maintenance";
  if (type === MessageThreadType.LEASE) return "lease";
  return "general";
}

function messagePriority(input: { status: MessageThreadStatus; unreadCount: number; maintenancePriority?: MaintenancePriority | null }): UnifiedInboxPriority {
  if (input.maintenancePriority === MaintenancePriority.EMERGENCY) return "urgent";
  if (input.maintenancePriority === MaintenancePriority.HIGH || input.status === MessageThreadStatus.WAITING_ON_STAFF || input.unreadCount > 0) return "high";
  return "normal";
}

function leadPriority(status: LeadStatus): UnifiedInboxPriority {
  return status === LeadStatus.NEW ? "high" : "normal";
}

function directionForNote(note: string): "outbound" | "internal" {
  return note.startsWith("[Landlord reply") ? "outbound" : "internal";
}

function leadNotePreview(note: string) {
  return note.replace(/^\[Landlord reply[^\]]+\]\s*/i, "").replace(/^\[Landlord\]\s*/i, "").trim() || note;
}

type LeadWithContext = Prisma.LeadGetPayload<{
  include: {
    unit: { include: { property: true } };
    application: true;
    notes: { orderBy: { createdAt: "asc" } };
  };
}>;

type MessageThreadWithContext = Prisma.MessageThreadGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true; role: true } };
    application: { include: { unit: { include: { property: true } } } };
    maintenanceRequest: { include: { unit: { include: { property: true } }; requester: { select: { id: true; name: true; email: true; role: true } }; assignedTo: { select: { id: true; name: true; email: true; role: true } } } };
    messages: { include: { sender: { select: { id: true; name: true; email: true; role: true } } } };
  };
}>;

function normalizeLead(lead: LeadWithContext): UnifiedInboxThread {
  const label = unitLabel(lead.unit);
  const initialMessage = clean(lead.message) ?? "Lead submitted an inquiry without a message.";
  const noteMessages: UnifiedInboxMessage[] = lead.notes.map((note) => {
    const direction = directionForNote(note.note);
    return {
      id: `lead_note_${note.id}`,
      senderName: direction === "outbound" ? "Landlord reply" : "Landlord note",
      senderRole: direction === "outbound" ? "LANDLORD" : "INTERNAL",
      body: leadNotePreview(note.note),
      createdAt: note.createdAt,
      direction,
      isInternal: direction === "internal"
    };
  });

  const messages: UnifiedInboxMessage[] = [
    {
      id: `lead_message_${lead.id}`,
      senderName: lead.name,
      senderEmail: lead.email,
      senderRole: "LEAD",
      body: initialMessage,
      createdAt: lead.createdAt,
      direction: "inbound",
      isInternal: false
    },
    ...noteMessages
  ];

  const lastMessage = messages.at(-1);
  const needsReply = lead.status === LeadStatus.NEW;
  const actions: UnifiedInboxAction[] = [
    { label: "Lead detail", href: `/landlord/leads/${lead.id}` },
    { label: "Unit", href: `/landlord/units/${lead.unitId}` },
    { label: "Public listing", href: `/marketplace/${lead.unitId}` }
  ];
  if (lead.application?.id) actions.unshift({ label: "Application", href: `/landlord/applications/${lead.application.id}` });

  return {
    id: `lead_${lead.id}`,
    sourceId: lead.id,
    sourceType: "lead",
    title: `${lead.name} asked about ${label}`,
    subject: `Listing question: ${label}`,
    participantName: lead.name,
    participantEmail: lead.email,
    participantPhone: lead.phone,
    status: lead.status,
    priority: leadPriority(lead.status),
    lastMessageAt: lastMessage?.createdAt ?? lead.updatedAt ?? lead.createdAt,
    lastMessagePreview: lastMessage?.body ?? initialMessage,
    unreadCount: needsReply ? 1 : 0,
    needsReply,
    contextSummary: `${label}${addressLabel(lead.unit) ? ` - ${addressLabel(lead.unit)}` : ""}`,
    context: {
      propertyName: lead.unit.property.name,
      unitNumber: lead.unit.unitNumber,
      address: lead.unit.property.addressLine,
      city: lead.unit.property.city,
      state: lead.unit.property.state,
      rentAmount: lead.unit.rentAmount,
      availableOn: lead.unit.availableOn,
      applicationId: lead.application?.id ?? null,
      applicationStatus: lead.application?.status ?? null,
      leadId: lead.id,
      leadStatus: lead.status,
      listingHref: `/marketplace/${lead.unitId}`,
      recordHref: `/landlord/leads/${lead.id}`
    },
    actions,
    messages,
    canReply: lead.status !== LeadStatus.CLOSED,
    replyAction: "lead"
  };
}

function normalizeThread(thread: MessageThreadWithContext, currentUserId: string): UnifiedInboxThread {
  const sourceType = sourceTypeForThread(thread.type);
  const relatedUnit = thread.application?.unit ?? thread.maintenanceRequest?.unit ?? null;
  const firstExternalSender = thread.messages.find((message) => message.senderId !== currentUserId && !message.isInternal)?.sender ?? null;
  const participant = firstExternalSender ?? thread.maintenanceRequest?.requester ?? thread.createdBy;
  const messages: UnifiedInboxMessage[] = thread.messages.map((message) => ({
    id: message.id,
    senderName: message.sender.name ?? message.sender.email,
    senderEmail: message.sender.email,
    senderRole: message.sender.role,
    body: message.body,
    createdAt: message.createdAt,
    direction: message.isInternal ? "internal" : message.senderId === currentUserId ? "outbound" : "inbound",
    isInternal: message.isInternal
  }));
  const lastMessage = messages.at(-1);
  const unreadCount = thread.messages.filter((message) => message.senderId !== currentUserId && !message.isInternal && !message.readByStaffAt).length;
  const needsReply = thread.status === MessageThreadStatus.WAITING_ON_STAFF || unreadCount > 0;
  const actions: UnifiedInboxAction[] = [];
  if (thread.applicationId) actions.push({ label: "Application", href: `/landlord/applications/${thread.applicationId}` });
  if (thread.maintenanceRequestId) actions.push({ label: "Maintenance", href: "/landlord/maintenance" });
  if (relatedUnit?.id) actions.push({ label: "Unit", href: `/landlord/units/${relatedUnit.id}` });

  return {
    id: `thread_${thread.id}`,
    sourceId: thread.id,
    sourceType,
    title: thread.subject,
    subject: thread.subject,
    participantName: participant?.name ?? participant?.email ?? "Conversation participant",
    participantEmail: participant?.email ?? null,
    status: thread.status,
    priority: messagePriority({ status: thread.status, unreadCount, maintenancePriority: thread.maintenanceRequest?.priority ?? null }),
    lastMessageAt: thread.lastMessageAt ?? thread.createdAt,
    lastMessagePreview: lastMessage?.body ?? "No messages yet.",
    unreadCount,
    needsReply,
    contextSummary: `${SOURCE_LABELS[sourceType]} - ${unitLabel(relatedUnit)}`,
    context: {
      propertyName: relatedUnit?.property?.name ?? null,
      unitNumber: relatedUnit?.unitNumber ?? null,
      address: relatedUnit?.property?.addressLine ?? null,
      city: relatedUnit?.property?.city ?? null,
      state: relatedUnit?.property?.state ?? null,
      rentAmount: relatedUnit?.rentAmount ?? null,
      availableOn: relatedUnit?.availableOn ?? null,
      applicationId: thread.applicationId,
      applicationStatus: thread.application?.status ?? null,
      maintenanceRequestId: thread.maintenanceRequestId,
      maintenanceStatus: thread.maintenanceRequest?.status ?? null,
      maintenancePriority: thread.maintenanceRequest?.priority ?? null,
      recordHref: thread.applicationId ? `/landlord/applications/${thread.applicationId}` : thread.maintenanceRequestId ? "/landlord/maintenance" : "/landlord/inbox"
    },
    actions,
    messages,
    canReply: thread.status !== MessageThreadStatus.CLOSED,
    replyAction: "message"
  };
}

function metricsFor(threads: UnifiedInboxThread[]): UnifiedInboxMetrics {
  return {
    total: threads.length,
    needsReply: threads.filter((thread) => thread.needsReply).length,
    unread: threads.reduce((total, thread) => total + thread.unreadCount, 0),
    leads: threads.filter((thread) => thread.sourceType === "lead").length,
    applications: threads.filter((thread) => thread.sourceType === "application").length,
    maintenance: threads.filter((thread) => thread.sourceType === "maintenance").length
  };
}

export async function buildUnifiedLandlordInbox(user: SessionPayload): Promise<UnifiedLandlordInbox> {
  const messageVisibilityWhere = await visibleMessageWhereForUser(user);
  const threadVisibilityWhere = await visibleThreadWhereForUser(user);
  const unitScope: Prisma.UnitWhereInput = {
    property: { isArchived: false },
    OR: [{ property: { ownerId: user.userId } }, { propertyManagerUserId: user.userId }]
  };

  const [leads, messageThreads] = await Promise.all([
    prisma.lead.findMany({
      where: { unit: unitScope },
      include: {
        unit: { include: { property: true } },
        application: true,
        notes: { orderBy: { createdAt: "asc" } }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 80
    }),
    prisma.messageThread.findMany({
      where: {
        AND: [
          threadVisibilityWhere,
          {
            OR: [
              { application: { unit: unitScope } },
              { maintenanceRequest: { unit: unitScope } },
              { createdById: user.userId }
            ]
          }
        ]
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        application: { include: { unit: { include: { property: true } } } },
        maintenanceRequest: {
          include: {
            unit: { include: { property: true } },
            requester: { select: { id: true, name: true, email: true, role: true } },
            assignedTo: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        messages: {
          where: messageVisibilityWhere,
          include: { sender: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 120
    })
  ]);

  const threads = [...leads.map(normalizeLead), ...messageThreads.map((thread) => normalizeThread(thread, user.userId))].sort((a, b) => {
    if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });

  return { threads, metrics: metricsFor(threads) };
}

export function selectedUnifiedInboxThreadId(searchParams?: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(searchParams?.thread) ? searchParams?.thread[0] : searchParams?.thread;
  if (!raw?.trim()) return undefined;
  if (raw.startsWith("lead_") || raw.startsWith("thread_")) return raw.trim();
  return `thread_${raw.trim()}`;
}

export function filterUnifiedInboxThreads(threads: UnifiedInboxThread[], filters: UnifiedInboxFilters = {}) {
  const q = filters.q?.trim().toLowerCase();
  const source = filters.source?.trim();
  const scope = filters.scope?.trim();
  const sort = filters.sort?.trim() || "needs-reply";

  let filtered = threads.filter((thread) => {
    if (source && source !== "all" && thread.sourceType !== source) return false;
    if (scope === "unread" && thread.unreadCount === 0) return false;
    if (scope === "needs-reply" && !thread.needsReply) return false;
    if (scope === "closed" && thread.status !== MessageThreadStatus.CLOSED && thread.status !== LeadStatus.CLOSED) return false;
    if (scope === "open" && (thread.status === MessageThreadStatus.CLOSED || thread.status === LeadStatus.CLOSED)) return false;
    if (!q) return true;

    const haystack = [
      thread.title,
      thread.subject,
      thread.participantName,
      thread.participantEmail,
      thread.participantPhone,
      thread.contextSummary,
      thread.context.propertyName,
      thread.context.unitNumber,
      thread.context.address,
      thread.context.city,
      thread.context.applicationId,
      thread.context.maintenanceRequestId,
      thread.messages.map((message) => message.body).join(" ")
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "unread") {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    }
    if (sort === "oldest") return a.lastMessageAt.getTime() - b.lastMessageAt.getTime();
    if (sort === "source") return a.sourceType.localeCompare(b.sourceType) || b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    if (a.needsReply !== b.needsReply && sort === "needs-reply") return a.needsReply ? -1 : 1;
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });

  return filtered;
}

export function unifiedInboxSourceLabel(sourceType: UnifiedLandlordSourceType) {
  return SOURCE_LABELS[sourceType];
}

export function unifiedInboxStatusLabel(status: string) {
  return titleCaseStatus(status);
}

export function isLandlordInboxUser(user: SessionPayload) {
  return user.role === UserRole.LANDLORD || user.role === UserRole.ADMIN;
}
