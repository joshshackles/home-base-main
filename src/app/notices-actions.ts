"use server";

import { FormalNoticeAudience, FormalNoticeStatus, FormalNoticeType, NotificationChannel, NotificationDeliveryStatus, NotificationTemplateKey, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageNotice } from "@/lib/notices";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullable(raw: string) {
  return raw.length > 0 ? raw : null;
}

function parseDate(raw: string) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function revalidateNoticePages() {
  revalidatePath("/admin/notices");
  revalidatePath("/landlord/notices");
  revalidatePath("/applicant/notices");
  revalidatePath("/admin");
  revalidatePath("/landlord");
  revalidatePath("/applicant");
}

const noticeSchema = z.object({
  title: z.string().min(2).max(180),
  body: z.string().min(5).max(8000),
  type: z.nativeEnum(FormalNoticeType),
  audience: z.nativeEnum(FormalNoticeAudience),
  priority: z.number().int().min(1).max(5),
  propertyId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  applicationId: z.string().nullable().optional(),
  leasePacketId: z.string().nullable().optional(),
  recipientUserId: z.string().nullable().optional(),
  recipientName: z.string().max(160).nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
  dueAt: z.date().nullable().optional(),
  effectiveAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  deliveryChannel: z.nativeEnum(NotificationChannel)
});

async function assertLandlordScope(actor: Awaited<ReturnType<typeof requireUser>>, input: z.infer<typeof noticeSchema>) {
  if (actor.role !== UserRole.LANDLORD) return;
  if (input.propertyId) {
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, ownerId: actor.userId, isArchived: false }, select: { id: true } });
    if (!property) throw new Error("You can only create notices for your own portfolio.");
  }
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: input.unitId, property: { ownerId: actor.userId, isArchived: false } }, select: { id: true, propertyId: true, tenantUserId: true, currentApplication: { select: { applicantName: true, applicantEmail: true, applicantUserId: true } }, tenantUser: { select: { id: true, name: true, email: true } } } });
    if (!unit) throw new Error("You can only create notices for your own rentals.");
    input.propertyId = input.propertyId ?? unit.propertyId;
    if (!input.recipientUserId && unit.tenantUserId) input.recipientUserId = unit.tenantUserId;
    if (!input.recipientEmail && unit.tenantUser?.email) input.recipientEmail = unit.tenantUser.email;
    if (!input.recipientName && unit.tenantUser?.name) input.recipientName = unit.tenantUser.name;
    if (!input.recipientEmail && unit.currentApplication?.applicantEmail) input.recipientEmail = unit.currentApplication.applicantEmail;
    if (!input.recipientName && unit.currentApplication?.applicantName) input.recipientName = unit.currentApplication.applicantName;
    if (!input.recipientUserId && unit.currentApplication?.applicantUserId) input.recipientUserId = unit.currentApplication.applicantUserId;
  }
  if (input.applicationId) {
    const application = await prisma.application.findFirst({ where: { id: input.applicationId, unit: { property: { ownerId: actor.userId, isArchived: false } } }, select: { id: true, unitId: true, applicantName: true, applicantEmail: true, applicantUserId: true, unit: { select: { propertyId: true } } } });
    if (!application) throw new Error("You can only create notices for applications in your portfolio.");
    input.unitId = input.unitId ?? application.unitId;
    input.propertyId = input.propertyId ?? application.unit.propertyId;
    input.recipientUserId = input.recipientUserId ?? application.applicantUserId;
    input.recipientEmail = input.recipientEmail ?? application.applicantEmail;
    input.recipientName = input.recipientName ?? application.applicantName;
  }
  if (input.leasePacketId) {
    const lease = await prisma.leasePacket.findFirst({ where: { id: input.leasePacketId, application: { unit: { property: { ownerId: actor.userId, isArchived: false } } } }, select: { id: true, application: { select: { id: true, unitId: true, applicantName: true, applicantEmail: true, applicantUserId: true, unit: { select: { propertyId: true } } } } } });
    if (!lease) throw new Error("You can only create notices for lease packets in your portfolio.");
    input.applicationId = input.applicationId ?? lease.application.id;
    input.unitId = input.unitId ?? lease.application.unitId;
    input.propertyId = input.propertyId ?? lease.application.unit.propertyId;
    input.recipientUserId = input.recipientUserId ?? lease.application.applicantUserId;
    input.recipientEmail = input.recipientEmail ?? lease.application.applicantEmail;
    input.recipientName = input.recipientName ?? lease.application.applicantName;
  }
}

async function queueNoticeNotification(noticeId: string) {
  const notice = await prisma.formalNotice.findUnique({ where: { id: noticeId } });
  if (!notice || notice.status !== FormalNoticeStatus.SENT) return;
  await prisma.notificationDelivery.create({
    data: {
      recipientUserId: notice.recipientUserId,
      recipientEmail: notice.recipientEmail,
      key: NotificationTemplateKey.GENERAL_ANNOUNCEMENT,
      channel: notice.deliveryChannel,
      status: notice.deliveryChannel === NotificationChannel.IN_APP ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.QUEUED,
      title: notice.title,
      body: notice.body.slice(0, 2000),
      actionHref: notice.recipientUserId ? "/applicant/notices" : undefined,
      entityType: "FormalNotice",
      entityId: notice.id,
      priority: notice.priority,
      createdById: notice.createdById,
      sentAt: notice.deliveryChannel === NotificationChannel.IN_APP ? new Date() : null,
      metadata: { noticeType: notice.type, audience: notice.audience }
    }
  });
}

export async function createFormalNotice(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/notices");
  const parsed = noticeSchema.parse({
    title: value(formData, "title"),
    body: value(formData, "body"),
    type: value(formData, "type") || FormalNoticeType.GENERAL,
    audience: value(formData, "audience") || FormalNoticeAudience.TENANT,
    priority: Number(value(formData, "priority") || 2),
    propertyId: nullable(value(formData, "propertyId")),
    unitId: nullable(value(formData, "unitId")),
    applicationId: nullable(value(formData, "applicationId")),
    leasePacketId: nullable(value(formData, "leasePacketId")),
    recipientUserId: nullable(value(formData, "recipientUserId")),
    recipientName: nullable(value(formData, "recipientName")),
    recipientEmail: nullable(value(formData, "recipientEmail")),
    dueAt: parseDate(value(formData, "dueAt")),
    effectiveAt: parseDate(value(formData, "effectiveAt")),
    expiresAt: parseDate(value(formData, "expiresAt")),
    deliveryChannel: value(formData, "deliveryChannel") || NotificationChannel.IN_APP
  });
  await assertLandlordScope(actor, parsed);
  const sendNow = value(formData, "sendNow") === "yes";
  const notice = await prisma.formalNotice.create({
    data: { ...parsed, createdById: actor.userId, status: sendNow ? FormalNoticeStatus.SENT : FormalNoticeStatus.DRAFT, sentAt: sendNow ? new Date() : null }
  });
  if (sendNow) await queueNoticeNotification(notice.id);
  await writeAuditLog({ actor, action: sendNow ? "SEND" : "CREATE", entityType: "FormalNotice", entityId: notice.id, message: sendNow ? "Formal notice created and sent." : "Formal notice drafted.", metadata: { title: notice.title, type: notice.type, audience: notice.audience } });
  await revalidateNoticePages();
}

export async function updateFormalNoticeStatus(formData: FormData) {
  const actor = await requireUser("/notices");
  const id = value(formData, "id");
  const status = value(formData, "status") as FormalNoticeStatus;
  if (!Object.values(FormalNoticeStatus).includes(status)) throw new Error("Invalid notice status.");
  if (!(await canManageNotice(actor, id))) throw new Error("You do not have access to this notice.");
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.LANDLORD && status !== FormalNoticeStatus.ACKNOWLEDGED) throw new Error("Recipients may only acknowledge notices.");
  const now = new Date();
  await prisma.formalNotice.update({
    where: { id },
    data: {
      status,
      sentAt: status === FormalNoticeStatus.SENT ? now : undefined,
      acknowledgedAt: status === FormalNoticeStatus.ACKNOWLEDGED ? now : undefined,
      cancelledAt: status === FormalNoticeStatus.CANCELLED ? now : undefined
    }
  });
  if (status === FormalNoticeStatus.SENT) await queueNoticeNotification(id);
  await writeAuditLog({ actor, action: status === FormalNoticeStatus.SENT ? "SEND" : "STATUS_CHANGE", entityType: "FormalNotice", entityId: id, message: `Formal notice marked ${status}.`, metadata: { status } });
  await revalidateNoticePages();
}
