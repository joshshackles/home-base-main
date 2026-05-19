"use server";

import { NotificationChannel, NotificationDeliveryStatus, NotificationPreferenceFrequency, NotificationTemplateKey, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { ensureDefaultNotificationPreferences, ensureDefaultNotificationTemplates, processQueuedNotifications, queueNotification, queueNotificationForRole, sendQueuedNotificationDelivery } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

const templateSchema = z.object({
  id: z.string().optional(),
  key: z.nativeEnum(NotificationTemplateKey),
  channel: z.nativeEnum(NotificationChannel),
  name: z.string().min(2).max(80),
  subject: z.string().min(2).max(160),
  body: z.string().min(5).max(4000),
  isActive: z.boolean().default(true)
});

export async function saveNotificationTemplate(formData: FormData) {
  const actor = await requireRole(["ADMIN"]);
  const parsed = templateSchema.parse({
    id: value(formData, "id") || undefined,
    key: value(formData, "key"),
    channel: value(formData, "channel"),
    name: value(formData, "name"),
    subject: value(formData, "subject"),
    body: value(formData, "body"),
    isActive: value(formData, "isActive") !== "false"
  });

  await prisma.notificationTemplate.upsert({
    where: { key_channel: { key: parsed.key, channel: parsed.channel } },
    update: { name: parsed.name, subject: parsed.subject, body: parsed.body, isActive: parsed.isActive, createdById: actor.userId },
    create: { ...parsed, createdById: actor.userId }
  });
  await writeAuditLog({ actor, action: "UPDATE", entityType: "NotificationTemplate", entityId: `${parsed.key}:${parsed.channel}`, message: "Notification template updated.", metadata: { key: parsed.key, channel: parsed.channel } });
  revalidatePath("/admin/notifications");
}

export async function sendAdminBroadcast(formData: FormData) {
  const actor = await requireRole(["ADMIN"]);
  await ensureDefaultNotificationTemplates();
  const role = value(formData, "role") as UserRole | "ALL";
  const title = value(formData, "title");
  const body = value(formData, "body");
  const actionHref = value(formData, "actionHref") || null;
  if (!title || !body) throw new Error("A title and message are required.");

  const payload = { key: NotificationTemplateKey.GENERAL_ANNOUNCEMENT, channel: NotificationChannel.IN_APP, title, body, actionHref, createdById: actor.userId, priority: 3 };
  if (role === "ALL") {
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, email: true } });
    for (const user of users) await queueNotification({ ...payload, recipientUserId: user.id, recipientEmail: user.email });
  } else {
    await queueNotificationForRole(role as UserRole, payload);
  }
  await writeAuditLog({ actor, action: "SEND", entityType: "NotificationDelivery", entityId: "broadcast", message: "Admin notification broadcast queued.", metadata: { role, title } });
  revalidatePath("/admin/notifications");
}

export async function markNotificationRead(formData: FormData) {
  const actor = await requireUser("/notifications");
  const id = value(formData, "id");
  await prisma.notificationDelivery.updateMany({
    where: { id, recipientUserId: actor.userId },
    data: { status: NotificationDeliveryStatus.READ, readAt: new Date() }
  });
  revalidatePath("/applicant/notifications");
  revalidatePath("/landlord/notifications");
  revalidatePath("/admin/notifications");
}

export async function dismissNotification(formData: FormData) {
  const actor = await requireUser("/notifications");
  const id = value(formData, "id");
  await prisma.notificationDelivery.updateMany({
    where: { id, recipientUserId: actor.userId },
    data: { status: NotificationDeliveryStatus.DISMISSED, dismissedAt: new Date() }
  });
  revalidatePath("/applicant/notifications");
  revalidatePath("/landlord/notifications");
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsRead() {
  const actor = await requireUser("/notifications");
  await prisma.notificationDelivery.updateMany({
    where: { recipientUserId: actor.userId, status: { in: [NotificationDeliveryStatus.QUEUED, NotificationDeliveryStatus.SENT] } },
    data: { status: NotificationDeliveryStatus.READ, readAt: new Date() }
  });
  revalidatePath("/applicant/notifications");
  revalidatePath("/landlord/notifications");
  revalidatePath("/admin/notifications");
}

export async function saveNotificationPreferences(formData: FormData) {
  const actor = await requireUser("/notifications");
  await ensureDefaultNotificationPreferences(actor.userId);
  for (const key of Object.values(NotificationTemplateKey)) {
    const inAppFrequency = (value(formData, `${key}:inApp`) || "INSTANT") as NotificationPreferenceFrequency;
    const emailFrequency = (value(formData, `${key}:email`) || "INSTANT") as NotificationPreferenceFrequency;
    const smsFrequency = (value(formData, `${key}:sms`) || "DISABLED") as NotificationPreferenceFrequency;
    await prisma.notificationPreference.upsert({
      where: { userId_key: { userId: actor.userId, key } },
      update: { inAppFrequency, emailFrequency, smsFrequency },
      create: { userId: actor.userId, key, inAppFrequency, emailFrequency, smsFrequency }
    });
  }
  revalidatePath("/applicant/notifications");
  revalidatePath("/landlord/notifications");
  revalidatePath("/admin/notifications");
}

export async function processNotificationQueue() {
  await requireRole(["ADMIN"]);
  await processQueuedNotifications(100);
  revalidatePath("/admin/notifications");
}

export async function sendNotificationNow(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = value(formData, "id");
  await sendQueuedNotificationDelivery(id);
  revalidatePath("/admin/notifications");
}

export async function openNotification(formData: FormData) {
  const actor = await requireUser("/notifications");
  const id = value(formData, "id");
  const delivery = await prisma.notificationDelivery.findFirst({ where: { id, recipientUserId: actor.userId }, select: { actionHref: true } });
  if (!delivery) return;
  await prisma.notificationDelivery.update({ where: { id }, data: { status: NotificationDeliveryStatus.READ, readAt: new Date() } });
  redirect(delivery.actionHref || (actor.role === "LANDLORD" ? "/landlord/notifications" : actor.role === "ADMIN" ? "/admin/notifications" : "/applicant/notifications"));
}
