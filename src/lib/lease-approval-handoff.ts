import {
  AuditAction,
  LeasePacketStatus,
  LeaseTemplateKind,
  SecurityEventType,
  SignatureNotificationType,
  SignatureRole,
  SignatureStatus,
  type UserRole
} from "@prisma/client";
import { writeAuditLog, type AuditActor } from "@/lib/audit";
import { DEFAULT_LEASE_TEMPLATE_BODY } from "@/lib/lease-render";
import { prisma } from "@/lib/prisma";
import { writeSecurityEvent } from "@/lib/security-events";
import { defaultSignatureExpirationDate, queueSignatureNotification } from "@/lib/signature-notifications";

type LeaseApprovalActor = AuditActor & {
  userId?: string | null;
  email?: string | null;
  role?: UserRole | null;
};

type HandoffResult = {
  leasePacketId: string;
  createdLeasePacket: boolean;
  queuedSignatureRequestIds: string[];
};

type DesiredSignatureRequest = {
  signerRole: SignatureRole;
  signerUserId: string;
  signerName: string;
  signerEmail: string;
};

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function findOrCreateTemplate(ownerUserId: string | null) {
  const ownedTemplate = ownerUserId
    ? await prisma.leaseTemplate.findFirst({
        where: { ownerUserId, isActive: true, kind: LeaseTemplateKind.RESIDENTIAL },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true }
      })
    : null;

  if (ownedTemplate) return ownedTemplate;

  const sharedTemplate = await prisma.leaseTemplate.findFirst({
    where: { ownerUserId: null, isActive: true, kind: LeaseTemplateKind.RESIDENTIAL },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true }
  });

  if (sharedTemplate) return sharedTemplate;

  return prisma.leaseTemplate.create({
    data: {
      name: "Standard Residential Lease",
      description: "Default lease template used when approval sends a lease for tenant signature.",
      body: DEFAULT_LEASE_TEMPLATE_BODY,
      kind: LeaseTemplateKind.RESIDENTIAL,
      ownerUserId,
      isSystem: ownerUserId === null,
      isActive: true
    },
    select: { id: true, name: true }
  });
}

export async function ensureLeaseSignatureHandoffForApprovedApplication(input: {
  applicationId: string;
  actor: LeaseApprovalActor;
  moveInDate?: Date | null;
  expiresInDays?: number;
}): Promise<HandoffResult> {
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: {
      applicantUser: true,
      unit: { include: { property: { include: { owner: true } } } },
      leasePackets: {
        where: { status: { not: LeasePacketStatus.VOIDED } },
        include: { signatureRequests: true },
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    }
  });

  if (!application) throw new Error("Application was not found.");
  if (application.status !== "APPROVED") throw new Error("Lease signature handoff requires an approved application.");
  if (!application.applicantUserId || !application.applicantUser) {
    throw new Error("Connect this application to an applicant portal user before sending a lease for signature.");
  }

  const ownerId = application.unit.property.ownerId ?? null;
  const template = await findOrCreateTemplate(ownerId);
  const existingPacket = application.leasePackets[0] ?? null;
  const createdLeasePacket = !existingPacket;
  const now = new Date();
  const leaseStartDate = input.moveInDate ?? existingPacket?.leaseStartDate ?? application.unit.availableOn ?? now;
  const leaseEndDate = existingPacket?.leaseEndDate ?? addMonths(leaseStartDate, 12);
  const expiresAt = defaultSignatureExpirationDate(input.expiresInDays ?? 7);

  const packet = existingPacket
    ? existingPacket.status === LeasePacketStatus.SENT_FOR_SIGNATURE || existingPacket.status === LeasePacketStatus.COMPLETED
      ? existingPacket
      : await prisma.leasePacket.update({
          where: { id: existingPacket.id },
          data: { status: LeasePacketStatus.SENT_FOR_SIGNATURE, sentForSignatureAt: now, lockedAt: now },
          include: { signatureRequests: true }
        })
    : await prisma.leasePacket.create({
        data: {
          applicationId: application.id,
          templateId: template.id,
          status: LeasePacketStatus.SENT_FOR_SIGNATURE,
          leaseStartDate,
          leaseEndDate,
          monthlyRent: application.unit.rentAmount,
          securityDeposit: application.unit.deposit,
          terms: application.unit.leaseTermsNote ?? "Lease generated automatically from landlord application approval.",
          notes: "Created automatically when the application was approved so the tenant can sign next.",
          sentForSignatureAt: now,
          lockedAt: now
        },
        include: { signatureRequests: true }
      });

  const desiredRequests = [
    {
      signerRole: SignatureRole.TENANT,
      signerUserId: application.applicantUser.id,
      signerName: application.applicantUser.name ?? application.applicantName,
      signerEmail: application.applicantUser.email
    },
    application.unit.property.owner?.email
      ? {
          signerRole: SignatureRole.LANDLORD,
          signerUserId: application.unit.property.owner.id,
          signerName: application.unit.property.owner.name ?? application.unit.property.owner.email,
          signerEmail: application.unit.property.owner.email
      }
      : null
  ].filter((request): request is DesiredSignatureRequest => Boolean(request));

  if (packet.status === LeasePacketStatus.COMPLETED) {
    return { leasePacketId: packet.id, createdLeasePacket, queuedSignatureRequestIds: [] };
  }

  const queuedRequests = [];
  const notificationActor = input.actor.userId && input.actor.email && input.actor.role ? { userId: input.actor.userId, email: input.actor.email, role: input.actor.role } : undefined;
  for (const request of desiredRequests) {
    const existingRequest = packet.signatureRequests.find((item) => item.signerRole === request.signerRole && item.signerEmail === request.signerEmail);
    if (existingRequest?.status === SignatureStatus.SIGNED) continue;
    if (existingRequest?.status === SignatureStatus.PENDING && existingRequest.lastNotificationAt) continue;

    const savedRequest = existingRequest
      ? await prisma.signatureRequest.update({
          where: { id: existingRequest.id },
          data: {
            signerUserId: request.signerUserId,
            signerName: request.signerName,
            status: SignatureStatus.PENDING,
            signatureText: null,
            signedAt: null,
            declinedAt: null,
            ipAddress: null,
            userAgent: null,
            electronicConsentAccepted: false,
            electronicConsentText: null,
            electronicConsentAcceptedAt: null,
            documentTextHash: null,
            signatureEvidenceHash: null,
            finalPdfHash: null,
            expiresAt,
            reminderCount: 0,
            lastReminderAt: null
          }
        })
      : await prisma.signatureRequest.create({
          data: {
            leasePacketId: packet.id,
            signerRole: request.signerRole,
            signerUserId: request.signerUserId,
            signerName: request.signerName,
            signerEmail: request.signerEmail,
            expiresAt
          }
        });

    await queueSignatureNotification({ request: savedRequest, type: SignatureNotificationType.INITIAL, actor: notificationActor });
    queuedRequests.push(savedRequest);
  }

  await prisma.leaseNote.create({
    data: {
      leasePacketId: packet.id,
      note: `[System] Application approval handoff sent this lease for signature. ${queuedRequests.length} pending signature request(s) queued.`
    }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: application.id,
      note: `[Lease handoff] Lease packet ${packet.id} is ready for tenant signature. ${queuedRequests.length} signature notification(s) queued.`
    }
  });

  await writeAuditLog({
    actor: input.actor,
    action: createdLeasePacket ? AuditAction.CREATE : AuditAction.SEND,
    entityType: "LeasePacket",
    entityId: packet.id,
    message: createdLeasePacket ? "Created and sent lease packet from approved application." : "Sent existing lease packet from approved application.",
    metadata: {
      applicationId: application.id,
      templateId: packet.templateId,
      createdLeasePacket,
      queuedSignatureRequestIds: queuedRequests.map((request) => request.id),
      expiresAt: expiresAt.toISOString()
    }
  });

  await writeSecurityEvent({
    type: SecurityEventType.SIGNATURE_REQUESTED,
    userId: input.actor.userId ?? undefined,
    email: input.actor.email ?? undefined,
    message: "Lease signature handoff queued after application approval.",
    metadata: { leasePacketId: packet.id, applicationId: application.id, signatureRequestCount: queuedRequests.length, expiresAt: expiresAt.toISOString() }
  });

  return {
    leasePacketId: packet.id,
    createdLeasePacket,
    queuedSignatureRequestIds: queuedRequests.map((request) => request.id)
  };
}
