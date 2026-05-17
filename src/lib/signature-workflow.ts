import { AuditAction, LeasePacketStatus, SecurityEventType, SignatureRole, SignatureStatus, type Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";
import {
  ELECTRONIC_SIGNATURE_CONSENT_TEXT,
  buildSignatureEvidenceHash,
  leaseTextHash,
  assertSignatureTextLooksIntentional,
  normalizeTypedSignature,
  validateSignatureReadiness
} from "@/lib/e-signature";

export type SignatureAccessWhere = Prisma.SignatureRequestWhereInput;

function requestMetadata() {
  const h = headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent") ?? null
  };
}

async function expireSignatureRequest(request: { id: string; leasePacketId: string; signerEmail: string; expiresAt: Date | null }, actor: AuditActor) {
  await prisma.signatureRequest.updateMany({
    where: { id: request.id, status: SignatureStatus.PENDING },
    data: { status: SignatureStatus.EXPIRED }
  });

  await prisma.leaseNote.create({
    data: { leasePacketId: request.leasePacketId, note: `[System] Signature request for ${request.signerEmail} expired before signing.` }
  });

  await writeSecurityEvent({
    type: SecurityEventType.SIGNATURE_EXPIRED,
    userId: actor.userId,
    email: actor.email,
    message: "Signature request expired before signing.",
    metadata: { signatureRequestId: request.id, leasePacketId: request.leasePacketId, expiresAt: request.expiresAt?.toISOString() ?? null }
  });
}

export async function completeSignatureRequest(input: {
  actor: AuditActor;
  requestWhere: SignatureAccessWhere;
  signatureText: string;
  actorLabel: "Tenant" | "Landlord";
}) {
  const request = await prisma.signatureRequest.findFirst({
    where: input.requestWhere,
    include: {
      leasePacket: {
        include: {
          template: true,
          application: { include: { applicantUser: true, unit: { include: { property: { include: { owner: true } } } } } }
        }
      }
    }
  });

  if (!request) throw new Error("This signature request is not available for your account.");

  if (request.expiresAt && request.expiresAt <= new Date()) {
    await expireSignatureRequest(request, input.actor);
    throw new Error("This signature request has expired. Please ask the administrator to resend or extend it.");
  }

  validateSignatureReadiness({ request, leasePacket: request.leasePacket });

  const signatureText = normalizeTypedSignature(input.signatureText);
  assertSignatureTextLooksIntentional(signatureText, request.signerName);
  const signedAt = new Date();
  const { ipAddress, userAgent } = requestMetadata();
  const documentTextHash = leaseTextHash(request.leasePacket);
  const signatureEvidenceHash = buildSignatureEvidenceHash({
    leasePacketId: request.leasePacketId,
    signatureRequestId: request.id,
    signerEmail: request.signerEmail,
    signerRole: request.signerRole,
    signatureText,
    signedAt,
    documentTextHash,
    consentText: ELECTRONIC_SIGNATURE_CONSENT_TEXT,
    ipAddress,
    userAgent
  });

  const result = await prisma.signatureRequest.updateMany({
    where: { id: request.id, status: SignatureStatus.PENDING },
    data: {
      signerUserId: input.actor.userId,
      signatureText,
      status: SignatureStatus.SIGNED,
      signedAt,
      ipAddress,
      userAgent,
      electronicConsentAccepted: true,
      electronicConsentText: ELECTRONIC_SIGNATURE_CONSENT_TEXT,
      electronicConsentAcceptedAt: signedAt,
      documentTextHash,
      signatureEvidenceHash
    }
  });

  if (result.count !== 1) {
    throw new Error("This signature request was already completed, expired, voided, or changed. Refresh the page before trying again.");
  }

  await prisma.leaseNote.create({
    data: { leasePacketId: request.leasePacketId, note: `[${input.actorLabel}] ${input.actor.email} signed the lease packet.` }
  });

  await writeAuditLog({
    actor: input.actor,
    action: AuditAction.SIGN,
    entityType: "SignatureRequest",
    entityId: request.id,
    message: `${input.actorLabel} signature completed by ${input.actor.email}.`,
    metadata: {
      leasePacketId: request.leasePacketId,
      signerRole: request.signerRole,
      documentTextHash,
      signatureEvidenceHash,
      electronicConsentAccepted: true,
      signedAt: signedAt.toISOString()
    }
  });

  await writeSecurityEvent({
    type: SecurityEventType.SIGNATURE_COMPLETED,
    userId: input.actor.userId,
    email: input.actor.email,
    message: `${input.actorLabel} signature completed.`,
    metadata: {
      signatureRequestId: request.id,
      leasePacketId: request.leasePacketId,
      signerRole: request.signerRole,
      documentTextHash,
      signatureEvidenceHash,
      signedAt: signedAt.toISOString()
    }
  });

  return { requestId: request.id, leasePacketId: request.leasePacketId, documentTextHash, signatureEvidenceHash };
}

export function baseSignatureRequestWhere(input: {
  requestId: string;
  userId: string;
  email: string;
  role: SignatureRole;
  leasePacketWhere: Prisma.LeasePacketWhereInput;
}): SignatureAccessWhere {
  return {
    id: input.requestId,
    signerRole: input.role,
    status: SignatureStatus.PENDING,
    leasePacket: { status: LeasePacketStatus.SENT_FOR_SIGNATURE, ...input.leasePacketWhere },
    OR: [{ signerUserId: input.userId }, { signerEmail: input.email }]
  };
}
