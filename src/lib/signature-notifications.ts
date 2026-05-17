import { AuditAction, SecurityEventType, SignatureNotificationType, type SignatureRequest, type UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { writeSecurityEvent } from "@/lib/security-events";
import { sendSignatureNotificationEmail, shouldSendEmailOnQueue } from "@/lib/email";
import { appUrl } from "@/lib/tokens";

type Actor = {
  userId: string;
  email: string;
  role: UserRole;
};

type SignatureRequestLite = Pick<SignatureRequest, "id" | "leasePacketId" | "signerName" | "signerEmail" | "expiresAt" | "signerRole">;

export function defaultSignatureExpirationDate(days = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export function signatureLinkFor(request: SignatureRequestLite) {
  const base = request.signerRole === "LANDLORD" ? "/landlord/leases" : "/applicant/leases";
  return `${base}/${request.leasePacketId}`;
}

export function buildSignatureNotification(request: SignatureRequestLite, type: SignatureNotificationType) {
  const roleLabel = request.signerRole === "LANDLORD" ? "landlord" : "tenant";
  const link = `${appUrl()}${signatureLinkFor(request)}`;
  const expirationText = request.expiresAt ? ` This request expires on ${request.expiresAt.toLocaleDateString()}.` : "";
  const subjectPrefix = type === "INITIAL" ? "Lease signature requested" : type === "REMINDER" ? "Reminder: lease signature pending" : type === "EXPIRATION_WARNING" ? "Lease signature request expiring soon" : "Lease signature request expired";

  return {
    subject: `${subjectPrefix} - HomeBase MLS`,
    body: `Hello ${request.signerName},\n\nA ${roleLabel} signature is needed for a lease packet in HomeBase MLS.${expirationText}\n\nSign in and review the lease here: ${link}\n\nThis message was generated automatically by HomeBase MLS.`
  };
}

export async function queueSignatureNotification({ request, type, actor }: { request: SignatureRequestLite; type: SignatureNotificationType; actor?: Actor }) {
  const content = buildSignatureNotification(request, type);

  const notification = await prisma.signatureNotification.create({
    data: {
      signatureRequestId: request.id,
      recipientEmail: request.signerEmail,
      recipientName: request.signerName,
      type,
      subject: content.subject,
      body: content.body,
      createdById: actor?.userId ?? null
    }
  });

  if (type === "REMINDER" || type === "EXPIRATION_WARNING") {
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: {
        lastNotificationAt: new Date(),
        lastReminderAt: new Date(),
        reminderCount: { increment: 1 }
      }
    });
  } else {
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { lastNotificationAt: new Date() }
    });
  }

  if (actor) {
    await writeAuditLog({
      actor,
      action: type === "INITIAL" ? AuditAction.SEND : AuditAction.REMIND,
      entityType: "SignatureNotification",
      entityId: notification.id,
      message: `Queued ${type.toLowerCase().replaceAll("_", " ")} notification for ${request.signerEmail}.`,
      metadata: { signatureRequestId: request.id, leasePacketId: request.leasePacketId, type }
    });
  }

  if (type === "REMINDER" || type === "EXPIRATION_WARNING") {
    await writeSecurityEvent({
      type: SecurityEventType.SIGNATURE_REMINDER_QUEUED,
      userId: actor?.userId,
      email: request.signerEmail,
      message: `Signature reminder queued for ${request.signerEmail}.`,
      metadata: { signatureRequestId: request.id, leasePacketId: request.leasePacketId, notificationId: notification.id, type }
    });
  }

  if (shouldSendEmailOnQueue()) {
    return sendSignatureNotificationEmail(notification.id);
  }

  return notification;
}
