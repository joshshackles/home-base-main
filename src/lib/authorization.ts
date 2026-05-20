import { AccountAccessRequestStatus, AccountAccessType, AuditAction, ConnectionStatus, DocumentVisibility, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { activeOccupancyStatuses, historicalOccupancyStatuses } from "@/lib/relationship-lifecycle";

export type AuthorizedUser = {
  userId: string;
  email: string;
  name?: string | null;
  role: UserRole;
};

export type AuthorizationTarget =
  | "Property"
  | "Unit"
  | "Application"
  | "MaintenanceRequest"
  | "MessageThread"
  | "Lead"
  | "Document"
  | "LeasePacket"
  | "Inspection"
  | "LedgerEntry";

const applicantVisibleDocumentTypes = new Set<DocumentVisibility>([DocumentVisibility.APPLICANT, DocumentVisibility.SHARED]);
const landlordVisibleDocumentTypes = new Set<DocumentVisibility>([DocumentVisibility.LANDLORD, DocumentVisibility.SHARED]);
const internalNoteAccessTypes: AccountAccessType[] = [
  AccountAccessType.CASEWORKER,
  AccountAccessType.INSPECTOR,
  AccountAccessType.MAINTENANCE,
  AccountAccessType.VENDOR,
  AccountAccessType.ADMIN
];

const internalNoteWriterRoles: UserRole[] = [UserRole.ADMIN, UserRole.INSPECTOR];

export function isAdmin(user: AuthorizedUser) {
  return user.role === UserRole.ADMIN;
}

export function isApplicantLike(user: AuthorizedUser) {
  return user.role === UserRole.APPLICANT || user.role === UserRole.TENANT;
}


async function hasActiveProfileConnection(user: AuthorizedUser, landlordUserId: string | null | undefined, unitId?: string | null) {
  if (!landlordUserId) return false;

  const connection = await prisma.profileConnection.findFirst({
    where: {
      landlordUserId,
      targetUserId: user.userId,
      status: ConnectionStatus.ACTIVE,
      OR: [
        { scopeKey: "PORTFOLIO" },
        ...(unitId ? [{ unitId }] : [])
      ]
    },
    select: { id: true }
  });

  return Boolean(connection);
}

export async function hasApprovedAccessType(user: AuthorizedUser, types: AccountAccessType[]) {
  if (isAdmin(user)) return true;
  if (types.length === 0) return false;

  const access = await prisma.accountAccessRequest.findFirst({
    where: {
      userId: user.userId,
      status: AccountAccessRequestStatus.APPROVED,
      type: { in: types }
    },
    select: { id: true }
  });

  return Boolean(access);
}

export async function canWriteInternalNote(user: AuthorizedUser) {
  if (internalNoteWriterRoles.includes(user.role)) return true;
  return hasApprovedAccessType(user, internalNoteAccessTypes);
}

export async function assertCanWriteInternalNote(user: AuthorizedUser) {
  await assertAuthorized(await canWriteInternalNote(user), user, "MessageThread", "internal-note", "You do not have permission to create internal notes.");
}

export async function visibleMessageWhereForUser(user: AuthorizedUser) {
  if (await canWriteInternalNote(user)) return {};
  return { isInternal: false };
}

export async function visibleThreadWhereForUser(user: AuthorizedUser) {
  if (await canWriteInternalNote(user)) return {};
  return { messages: { some: { isInternal: false } } };
}

export async function logAuthorizationDenied(
  user: AuthorizedUser,
  target: AuthorizationTarget,
  targetId: string | null | undefined,
  reason: string,
  metadata?: Prisma.InputJsonValue | null
) {
  await writeAuditLog({
    actor: user,
    action: AuditAction.NOTE,
    entityType: target,
    entityId: targetId ?? null,
    message: `Authorization denied: ${reason}`,
    metadata: metadata ?? undefined
  });
}

export async function assertAuthorized(
  allowed: boolean,
  user: AuthorizedUser,
  target: AuthorizationTarget,
  targetId: string | null | undefined,
  reason = "You do not have permission to access this record."
) {
  if (allowed) return;
  await logAuthorizationDenied(user, target, targetId, reason);
  throw new Error(reason);
}

export async function canAccessProperty(user: AuthorizedUser, propertyId: string) {
  if (isAdmin(user)) return true;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerId: true, isArchived: true }
  });

  if (!property || property.isArchived) return false;

  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && property.ownerId === user.userId) return true;
  if (await hasActiveProfileConnection(user, property.ownerId, null)) return true;

  return false;
}

export async function canAccessUnit(user: AuthorizedUser, unitId: string) {
  if (isAdmin(user)) return true;

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      tenantUserId: true,
      property: { select: { ownerId: true, isArchived: true } },
      applications: { where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }, select: { id: true }, take: 1 },
      occupancies: { where: { userId: user.userId, status: { in: activeOccupancyStatuses() } }, select: { id: true }, take: 1 }
    }
  });

  if (!unit) return false;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && unit.property.ownerId === user.userId && !unit.property.isArchived) return true;
  if (isApplicantLike(user) && (unit.tenantUserId === user.userId || unit.occupancies.length > 0 || unit.applications.length > 0)) return true;
  if (!unit.property.isArchived && (await hasActiveProfileConnection(user, unit.property.ownerId, unit.id))) return true;

  return false;
}

export async function canAccessListing(user: AuthorizedUser, unitId: string) {
  return canAccessUnit(user, unitId);
}

export async function canAccessLead(user: AuthorizedUser, leadId: string) {
  if (isAdmin(user)) return true;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      email: true,
      applicationId: true,
      unit: { select: { id: true, property: { select: { ownerId: true, isArchived: true } } } }
    }
  });

  if (!lead) return false;
  if (isApplicantLike(user) && lead.email.toLowerCase() === user.email.toLowerCase()) return true;
  if (lead.applicationId && (await canAccessApplication(user, lead.applicationId))) return true;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && lead.unit.property.ownerId === user.userId && !lead.unit.property.isArchived) return true;
  if (!lead.unit.property.isArchived && (await hasActiveProfileConnection(user, lead.unit.property.ownerId, lead.unit.id))) return true;

  return false;
}

export async function canAccessApplication(user: AuthorizedUser, applicationId: string) {
  if (isAdmin(user)) return true;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantUserId: true,
      applicantEmail: true,
      unit: { select: { id: true, property: { select: { ownerId: true, isArchived: true } } } }
    }
  });

  if (!application) return false;
  if (isApplicantLike(user) && (application.applicantUserId === user.userId || application.applicantEmail.toLowerCase() === user.email.toLowerCase())) return true;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && application.unit.property.ownerId === user.userId && !application.unit.property.isArchived) return true;
  if (!application.unit.property.isArchived && (await hasActiveProfileConnection(user, application.unit.property.ownerId, application.unit.id))) return true;

  return false;
}

export async function canAccessMaintenanceRequest(user: AuthorizedUser, maintenanceRequestId: string) {
  if (isAdmin(user)) return true;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: maintenanceRequestId },
    select: {
      id: true,
      requesterId: true,
      assignedToId: true,
      applicationId: true,
      unit: { select: { id: true, property: { select: { ownerId: true, isArchived: true } } } }
    }
  });

  if (!request) return false;
  if (request.requesterId === user.userId || request.assignedToId === user.userId) return true;
  if (request.applicationId && (await canAccessApplication(user, request.applicationId))) return true;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && request.unit?.property.ownerId === user.userId && !request.unit.property.isArchived) return true;
  if (request.unit && !request.unit.property.isArchived && (await hasActiveProfileConnection(user, request.unit.property.ownerId, request.unit.id))) return true;
  if (user.role === UserRole.INSPECTOR || (await hasApprovedAccessType(user, [AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR]))) return request.assignedToId === user.userId;

  return false;
}

export async function canAccessMessageThread(user: AuthorizedUser, threadId: string) {
  if (isAdmin(user)) return true;

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { id: true, createdById: true, applicationId: true, maintenanceRequestId: true }
  });

  if (!thread) return false;
  if (thread.createdById === user.userId) return true;
  if (thread.applicationId && (await canAccessApplication(user, thread.applicationId))) return true;
  if (thread.maintenanceRequestId && (await canAccessMaintenanceRequest(user, thread.maintenanceRequestId))) return true;

  return false;
}

export async function canCreateMessageThread(user: AuthorizedUser, input: { applicationId?: string | null; maintenanceRequestId?: string | null }) {
  if (isAdmin(user)) return true;
  if (input.applicationId && !(await canAccessApplication(user, input.applicationId))) return false;
  if (input.maintenanceRequestId && !(await canAccessMaintenanceRequest(user, input.maintenanceRequestId))) return false;
  return true;
}

export function impossibleDocumentWhere(): Prisma.DocumentWhereInput {
  return { id: "__homebase_no_document_access__" };
}

export async function visibleDocumentWhereForUser(user: AuthorizedUser): Promise<Prisma.DocumentWhereInput> {
  if (isAdmin(user)) return {};

  const uploadedByCurrentUser: Prisma.DocumentWhereInput = { uploadedById: user.userId };

  if (isApplicantLike(user)) {
    const applicantRecordAccess: Prisma.DocumentWhereInput = {
      visibility: { in: Array.from(applicantVisibleDocumentTypes) },
      OR: [
        { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
        { leasePacket: { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } } },
        { unit: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: [...activeOccupancyStatuses(), ...historicalOccupancyStatuses()] } } } }, { applications: { some: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } } }] } }
      ]
    };

    return { OR: [uploadedByCurrentUser, applicantRecordAccess] };
  }

  if (user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) {
    const landlordRecordAccess: Prisma.DocumentWhereInput = {
      visibility: { in: Array.from(landlordVisibleDocumentTypes) },
      OR: [
        { property: { ownerId: user.userId, isArchived: false } },
        { unit: { property: { ownerId: user.userId, isArchived: false } } },
        { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } },
        { leasePacket: { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } } }
      ]
    };

    return { OR: [uploadedByCurrentUser, landlordRecordAccess] };
  }

  if (user.role === UserRole.INSPECTOR || (await hasApprovedAccessType(user, [AccountAccessType.INSPECTOR]))) {
    return uploadedByCurrentUser;
  }

  return uploadedByCurrentUser;
}

export async function visibleDocumentRequestWhereForUser(user: AuthorizedUser): Promise<Prisma.DocumentRequestWhereInput> {
  if (isAdmin(user)) return {};

  if (isApplicantLike(user)) {
    return {
      visibility: { in: Array.from(applicantVisibleDocumentTypes) },
      application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }
    };
  }

  if (user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) {
    return {
      visibility: { in: Array.from(landlordVisibleDocumentTypes) },
      application: { unit: { property: { ownerId: user.userId, isArchived: false } } }
    };
  }

  return { id: "__homebase_no_document_request_access__" };
}

export async function canAccessDocument(user: AuthorizedUser, documentId: string) {
  const result = await getAuthorizedDocument(user, documentId);
  return Boolean(result);
}

export async function getAuthorizedDocument(user: AuthorizedUser, documentId: string) {
  const include = {
    application: { include: { unit: { include: { property: true } } } },
    property: true,
    unit: { include: { property: true } },
    leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } },
    uploadedBy: true,
    reviewedBy: true
  } satisfies Prisma.DocumentInclude;

  const visibleWhere = await visibleDocumentWhereForUser(user);
  const directlyVisibleDocument = await prisma.document.findFirst({
    where: { id: documentId, AND: [visibleWhere] },
    include
  });

  if (directlyVisibleDocument) return directlyVisibleDocument;

  const document = await prisma.document.findUnique({ where: { id: documentId }, include });
  if (!document || document.visibility === DocumentVisibility.INTERNAL) return null;

  if (document.unitId && (await canAccessUnit(user, document.unitId))) return document;
  if (document.applicationId && (await canAccessApplication(user, document.applicationId))) return document;
  if (document.leasePacketId && (await canAccessLeasePacket(user, document.leasePacketId))) return document;
  if (document.propertyId && (await canAccessProperty(user, document.propertyId))) return document;

  return null;
}

export async function canAccessLeasePacket(user: AuthorizedUser, leasePacketId: string) {
  if (isAdmin(user)) return true;

  const packet = await prisma.leasePacket.findUnique({
    where: { id: leasePacketId },
    select: {
      id: true,
      applicationId: true,
      signatureRequests: { where: { OR: [{ signerUserId: user.userId }, { signerEmail: user.email }] }, select: { id: true }, take: 1 }
    }
  });

  if (!packet) return false;
  if (packet.signatureRequests.length > 0) return true;
  return canAccessApplication(user, packet.applicationId);
}

export async function canAccessInspection(user: AuthorizedUser, inspectionId: string) {
  if (isAdmin(user)) return true;

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      assignedToId: true,
      applicationId: true,
      unit: { select: { id: true, property: { select: { ownerId: true, isArchived: true } } } }
    }
  });

  if (!inspection) return false;
  if (inspection.assignedToId === user.userId) return true;
  if (inspection.applicationId && (await canAccessApplication(user, inspection.applicationId))) return true;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && inspection.unit.property.ownerId === user.userId && !inspection.unit.property.isArchived) return true;
  if (!inspection.unit.property.isArchived && (await hasActiveProfileConnection(user, inspection.unit.property.ownerId, inspection.unit.id))) return true;

  return false;
}

export async function canAccessLedgerEntry(user: AuthorizedUser, ledgerEntryId: string) {
  if (isAdmin(user)) return true;

  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    select: {
      id: true,
      tenantUserId: true,
      applicationId: true,
      unit: { select: { id: true, property: { select: { ownerId: true, isArchived: true } } } }
    }
  });

  if (!entry) return false;
  if (isApplicantLike(user) && entry.tenantUserId === user.userId) return true;
  if (isApplicantLike(user) && await prisma.occupancy.count({ where: { userId: user.userId, unitId: entry.unit.id, status: { in: activeOccupancyStatuses() } } })) return true;
  if (entry.applicationId && (await canAccessApplication(user, entry.applicationId))) return true;
  if ((user.role === UserRole.LANDLORD || (await hasApprovedAccessType(user, [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER]))) && entry.unit.property.ownerId === user.userId && !entry.unit.property.isArchived) return true;
  if (!entry.unit.property.isArchived && (await hasActiveProfileConnection(user, entry.unit.property.ownerId, entry.unit.id))) return true;

  return false;
}

export async function assertCanAccessProperty(user: AuthorizedUser, propertyId: string) {
  await assertAuthorized(await canAccessProperty(user, propertyId), user, "Property", propertyId);
}

export async function assertCanAccessUnit(user: AuthorizedUser, unitId: string) {
  await assertAuthorized(await canAccessUnit(user, unitId), user, "Unit", unitId);
}

export async function assertCanAccessListing(user: AuthorizedUser, unitId: string) {
  await assertAuthorized(await canAccessListing(user, unitId), user, "Unit", unitId);
}

export async function assertCanAccessLead(user: AuthorizedUser, leadId: string) {
  await assertAuthorized(await canAccessLead(user, leadId), user, "Lead", leadId);
}

export async function assertCanAccessApplication(user: AuthorizedUser, applicationId: string) {
  await assertAuthorized(await canAccessApplication(user, applicationId), user, "Application", applicationId);
}

export async function assertCanAccessMaintenanceRequest(user: AuthorizedUser, maintenanceRequestId: string) {
  await assertAuthorized(await canAccessMaintenanceRequest(user, maintenanceRequestId), user, "MaintenanceRequest", maintenanceRequestId);
}

export async function assertCanAccessMessageThread(user: AuthorizedUser, threadId: string) {
  await assertAuthorized(await canAccessMessageThread(user, threadId), user, "MessageThread", threadId);
}

export async function assertCanCreateMessageThread(user: AuthorizedUser, input: { applicationId?: string | null; maintenanceRequestId?: string | null }) {
  const targetId = input.applicationId ?? input.maintenanceRequestId ?? "new";
  await assertAuthorized(await canCreateMessageThread(user, input), user, "MessageThread", targetId, "You do not have permission to create a thread for this record.");
}

export async function assertCanAccessDocument(user: AuthorizedUser, documentId: string) {
  await assertAuthorized(await canAccessDocument(user, documentId), user, "Document", documentId);
}

export async function assertCanAccessLeasePacket(user: AuthorizedUser, leasePacketId: string) {
  await assertAuthorized(await canAccessLeasePacket(user, leasePacketId), user, "LeasePacket", leasePacketId);
}

export async function assertCanAccessInspection(user: AuthorizedUser, inspectionId: string) {
  await assertAuthorized(await canAccessInspection(user, inspectionId), user, "Inspection", inspectionId);
}

export async function assertCanAccessLedgerEntry(user: AuthorizedUser, ledgerEntryId: string) {
  await assertAuthorized(await canAccessLedgerEntry(user, ledgerEntryId), user, "LedgerEntry", ledgerEntryId);
}
