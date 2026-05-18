import {
  AccountAccessRequestStatus,
  AccountAccessType,
  AuditAction,
  ConnectionRole,
  ConnectionStatus,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationTemplateKey,
  UserRole,
  VendorInviteStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl, createSecureToken, hashToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { writeAuditLog, type AuditActor } from "@/lib/audit";

export const VENDOR_INVITE_DAYS = 14;

export function vendorInviteSignupUrl(token: string) {
  return `${appUrl()}/signup?vendorInvite=${encodeURIComponent(token)}&next=${encodeURIComponent("/vendor")}`;
}

export async function sendVendorInvitationEmail(input: {
  invitationId: string;
  inviteUrl: string;
  actor?: AuditActor | null;
}) {
  const invitation = await prisma.vendorInvitation.findUnique({
    where: { id: input.invitationId },
    include: {
      owner: { select: { name: true, email: true } },
      unit: {
        select: { unitNumber: true, property: { select: { name: true } } },
      },
    },
  });
  if (!invitation) throw new Error("Vendor invitation was not found.");

  const ownerName = invitation.owner.name || invitation.owner.email;
  const rentalLabel = invitation.unit
    ? `${invitation.unit.property.name} #${invitation.unit.unitNumber}`
    : "their rental portfolio";
  const subject = `${ownerName} invited you to HomeBase as a vendor`;
  const body = [
    `Hi${invitation.contactName ? ` ${invitation.contactName}` : ""},`,
    "",
    `${ownerName} invited ${invitation.companyName} to join HomeBase as a vendor for ${rentalLabel}.`,
    "",
    "Use this secure invitation link to create your vendor portal account:",
    input.inviteUrl,
    "",
    `This invitation expires on ${invitation.expiresAt.toLocaleDateString()}.`,
    "",
    "After signup, your account will automatically open the Vendor Portal so you can receive work assignments, post updates, and submit invoices.",
  ].join("\n");

  const result = await sendEmail({
    to: invitation.email,
    toName: invitation.contactName,
    subject,
    body,
  });

  await prisma.notificationDelivery.create({
    data: {
      recipientEmail: invitation.email,
      key: NotificationTemplateKey.SYSTEM_ALERT,
      channel: NotificationChannel.EMAIL,
      status: result.ok
        ? NotificationDeliveryStatus.SENT
        : NotificationDeliveryStatus.QUEUED,
      title: subject,
      body,
      actionHref: input.inviteUrl,
      entityType: "VendorInvitation",
      entityId: invitation.id,
      priority: 2,
      createdById: input.actor?.userId ?? null,
      sentAt: result.ok ? new Date() : null,
      failedAt: result.ok ? null : new Date(),
      failureReason: result.error ?? null,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      metadata: {
        inviteStatus: invitation.status,
        companyName: invitation.companyName,
        trade: invitation.trade,
      },
    },
  });

  await writeAuditLog({
    actor: input.actor,
    action: AuditAction.SEND,
    entityType: "VendorInvitation",
    entityId: invitation.id,
    message: `Vendor invitation email sent to ${invitation.email}.`,
    metadata: {
      ok: result.ok,
      provider: result.provider,
      error: result.error ?? null,
    },
  });

  return result;
}

export async function createVendorInvitation(input: {
  ownerUserId: string;
  createdById?: string | null;
  unitId?: string | null;
  email: string;
  companyName: string;
  contactName?: string | null;
  trade: string;
  phone?: string | null;
  licenseNumber?: string | null;
  insuranceExpiresAt?: Date | null;
  hourlyRate?: number | null;
  isPreferred?: boolean;
  notes?: string | null;
  actor?: AuditActor | null;
}) {
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser)
    throw new Error(
      "That email already has an account. Use Enable vendor access to connect the existing user.",
    );

  const token = createSecureToken();
  const expiresAt = new Date(
    Date.now() + VENDOR_INVITE_DAYS * 24 * 60 * 60 * 1000,
  );

  const invitation = await prisma.vendorInvitation.create({
    data: {
      ownerUserId: input.ownerUserId,
      createdById: input.createdById ?? null,
      unitId: input.unitId ?? null,
      email,
      companyName: input.companyName,
      contactName: input.contactName ?? null,
      trade: input.trade,
      phone: input.phone ?? null,
      licenseNumber: input.licenseNumber ?? null,
      insuranceExpiresAt: input.insuranceExpiresAt ?? null,
      hourlyRate: input.hourlyRate ?? null,
      isPreferred: input.isPreferred ?? false,
      notes: input.notes ?? null,
      tokenHash: hashToken(token),
      status: VendorInviteStatus.PENDING,
      expiresAt,
    },
  });

  const inviteUrl = vendorInviteSignupUrl(token);
  await sendVendorInvitationEmail({
    invitationId: invitation.id,
    inviteUrl,
    actor: input.actor,
  });

  await writeAuditLog({
    actor: input.actor,
    action: AuditAction.CREATE,
    entityType: "VendorInvitation",
    entityId: invitation.id,
    message: `Vendor invitation created for ${email}.`,
    metadata: {
      companyName: invitation.companyName,
      trade: invitation.trade,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return { invitation, inviteUrl, token };
}

export async function getVendorInvitationForSignup(token: string) {
  if (!token) return null;
  const invitation = await prisma.vendorInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      owner: { select: { name: true, email: true } },
      unit: {
        select: { unitNumber: true, property: { select: { name: true } } },
      },
    },
  });
  if (
    !invitation ||
    invitation.status !== VendorInviteStatus.PENDING ||
    invitation.expiresAt < new Date()
  )
    return null;
  return invitation;
}

export async function acceptVendorInvitation(input: {
  token: string;
  userId: string;
  email: string;
  name: string | null;
}) {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.vendorInvitation.findUnique({
    where: { tokenHash },
  });
  if (
    !invitation ||
    invitation.status !== VendorInviteStatus.PENDING ||
    invitation.expiresAt < new Date()
  ) {
    throw new Error(
      "This vendor invitation is expired, already used, or invalid. Ask the landlord to send a new invitation.",
    );
  }
  if (invitation.email.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error(
      "This vendor invitation was issued to a different email address.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { role: UserRole.VENDOR, isActive: true },
    });

    await tx.vendorProfile.upsert({
      where: { userId: input.userId },
      update: {
        ownerUserId: invitation.ownerUserId,
        unitId: invitation.unitId,
        companyName: invitation.companyName,
        trade: invitation.trade,
        phone: invitation.phone,
        email: invitation.email,
        licenseNumber: invitation.licenseNumber,
        insuranceExpiresAt: invitation.insuranceExpiresAt,
        hourlyRate: invitation.hourlyRate,
        isPreferred: invitation.isPreferred,
        notes: invitation.notes,
        inviteStatus: VendorInviteStatus.ACCEPTED,
        isActive: true,
      },
      create: {
        userId: input.userId,
        ownerUserId: invitation.ownerUserId,
        unitId: invitation.unitId,
        companyName: invitation.companyName,
        trade: invitation.trade,
        phone: invitation.phone,
        email: invitation.email,
        licenseNumber: invitation.licenseNumber,
        insuranceExpiresAt: invitation.insuranceExpiresAt,
        hourlyRate: invitation.hourlyRate,
        isPreferred: invitation.isPreferred,
        notes: invitation.notes,
        inviteStatus: VendorInviteStatus.ACCEPTED,
        isActive: true,
        createdById: invitation.createdById,
      },
    });

    await tx.accountAccessRequest.create({
      data: {
        userId: input.userId,
        type: AccountAccessType.VENDOR,
        status: AccountAccessRequestStatus.APPROVED,
        organization: invitation.companyName,
        reason: "Automatically approved from landlord vendor invitation.",
        reviewedById: invitation.createdById,
        reviewedAt: new Date(),
        reviewNote: "Accepted vendor invitation.",
      },
    });

    await tx.profileConnection.upsert({
      where: {
        landlordUserId_targetUserId_scopeKey_assignedRole: {
          landlordUserId: invitation.ownerUserId,
          targetUserId: input.userId,
          scopeKey: invitation.unitId ?? "PORTFOLIO",
          assignedRole: ConnectionRole.PREFERRED_VENDOR,
        },
      },
      update: {
        status: ConnectionStatus.ACTIVE,
        unitId: invitation.unitId,
        notes: invitation.notes,
      },
      create: {
        landlordUserId: invitation.ownerUserId,
        targetUserId: input.userId,
        unitId: invitation.unitId,
        scopeKey: invitation.unitId ?? "PORTFOLIO",
        assignedRole: ConnectionRole.PREFERRED_VENDOR,
        status: ConnectionStatus.ACTIVE,
        notes: invitation.notes,
      },
    });

    await tx.vendorInvitation.update({
      where: { id: invitation.id },
      data: {
        status: VendorInviteStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedByUserId: input.userId,
      },
    });
  });

  await writeAuditLog({
    actor: { userId: input.userId, email: input.email, role: UserRole.VENDOR },
    action: AuditAction.UPDATE,
    entityType: "VendorInvitation",
    entityId: invitation.id,
    message: "Vendor invitation accepted and vendor account activated.",
    metadata: {
      ownerUserId: invitation.ownerUserId,
      companyName: invitation.companyName,
    },
  });
}
