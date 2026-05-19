import { NotificationChannel, NotificationDeliveryStatus, NotificationPreferenceFrequency, NotificationTemplateKey, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, queuedEmailBatchSize, emailMaxAttempts } from "@/lib/email";
import { logger } from "@/lib/logger";

export const defaultNotificationTemplates: Array<{ key: NotificationTemplateKey; name: string; subject: string; body: string }> = [
  { key: NotificationTemplateKey.GENERAL_ANNOUNCEMENT, name: "General announcement", subject: "HomeBase update", body: "There is a new HomeBase update in your account." },
  { key: NotificationTemplateKey.PAYMENT_REMINDER, name: "Payment reminder", subject: "Upcoming rent payment reminder", body: "A rent payment is coming due. Please review your ledger for details." },
  { key: NotificationTemplateKey.PAYMENT_FAILED, name: "Payment failed", subject: "Payment needs attention", body: "A payment could not be completed. Please update your payment method or contact your housing team." },
  { key: NotificationTemplateKey.LEASE_READY, name: "Lease ready", subject: "Your lease is ready", body: "A lease packet is ready for review and signature." },
  { key: NotificationTemplateKey.MAINTENANCE_UPDATE, name: "Maintenance update", subject: "Maintenance request update", body: "There is an update on a maintenance request." },
  { key: NotificationTemplateKey.APPLICATION_UPDATE, name: "Application update", subject: "Application status update", body: "There is an update on your rental application." },
  { key: NotificationTemplateKey.TOUR_REMINDER, name: "Tour reminder", subject: "Tour reminder", body: "This is a reminder about a scheduled rental tour." },
  { key: NotificationTemplateKey.SYSTEM_ALERT, name: "System alert", subject: "HomeBase system alert", body: "An operational item needs attention in HomeBase." }
];

export function notificationLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function ensureDefaultNotificationTemplates() {
  for (const template of defaultNotificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { key_channel: { key: template.key, channel: NotificationChannel.IN_APP } },
      update: {},
      create: { ...template, channel: NotificationChannel.IN_APP }
    });
    await prisma.notificationTemplate.upsert({
      where: { key_channel: { key: template.key, channel: NotificationChannel.EMAIL } },
      update: {},
      create: { ...template, channel: NotificationChannel.EMAIL }
    });
  }
}

export async function ensureDefaultNotificationPreferences(userId: string) {
  for (const template of defaultNotificationTemplates) {
    await prisma.notificationPreference.upsert({
      where: { userId_key: { userId, key: template.key } },
      update: {},
      create: {
        userId,
        key: template.key,
        inAppFrequency: NotificationPreferenceFrequency.INSTANT,
        emailFrequency: template.key === NotificationTemplateKey.GENERAL_ANNOUNCEMENT ? NotificationPreferenceFrequency.DAILY_DIGEST : NotificationPreferenceFrequency.INSTANT,
        smsFrequency: NotificationPreferenceFrequency.DISABLED
      }
    });
  }
}

function renderTemplate(text: string, variables: Record<string, string | number | null | undefined>) {
  return text.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => String(variables[key] ?? ""));
}

export async function queueNotification(input: {
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  key: NotificationTemplateKey;
  channel?: NotificationChannel;
  title?: string;
  body?: string;
  actionHref?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority?: number;
  createdById?: string | null;
  variables?: Record<string, string | number | null | undefined>;
}) {
  const channel = input.channel ?? NotificationChannel.IN_APP;
  const template = await prisma.notificationTemplate.findUnique({ where: { key_channel: { key: input.key, channel } } });
  const title = input.title ?? renderTemplate(template?.subject ?? notificationLabel(input.key), input.variables ?? {});
  const body = input.body ?? renderTemplate(template?.body ?? "You have a new HomeBase notification.", input.variables ?? {});

  return prisma.notificationDelivery.create({
    data: {
      recipientUserId: input.recipientUserId ?? null,
      recipientEmail: input.recipientEmail ?? null,
      recipientPhone: input.recipientPhone ?? null,
      templateId: template?.id ?? null,
      key: input.key,
      channel,
      status: NotificationDeliveryStatus.QUEUED,
      title,
      body,
      actionHref: input.actionHref ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      priority: input.priority ?? 2,
      createdById: input.createdById ?? null,
      metadata: input.variables ?? undefined
    }
  });
}

export async function queueNotificationForRole(role: UserRole, input: Omit<Parameters<typeof queueNotification>[0], "recipientUserId" | "recipientEmail">) {
  const users = await prisma.user.findMany({ where: { role, isActive: true }, select: { id: true, email: true } });
  const deliveries = [];
  for (const user of users) {
    deliveries.push(await queueNotification({ ...input, recipientUserId: user.id, recipientEmail: user.email }));
  }
  return deliveries;
}

function nextAttemptDate(attemptCount: number) {
  const minutes = Math.min(60 * 24, Math.pow(2, Math.max(attemptCount - 1, 0)) * 5);
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function sendQueuedNotificationDelivery(deliveryId: string) {
  const delivery = await prisma.notificationDelivery.findUnique({ where: { id: deliveryId }, include: { recipient: true } });
  if (!delivery) throw new Error("Notification delivery was not found.");
  if (delivery.channel === NotificationChannel.IN_APP) {
    return prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: NotificationDeliveryStatus.SENT, sentAt: delivery.sentAt ?? new Date() } });
  }
  if (delivery.channel !== NotificationChannel.EMAIL) return delivery;

  const to = delivery.recipientEmail ?? delivery.recipient?.email;
  if (!to) {
    return prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: NotificationDeliveryStatus.FAILED, failedAt: new Date(), failureReason: "No recipient email was available." } });
  }

  const attemptCount = delivery.attemptCount + 1;
  const result = await sendEmail({ to, toName: delivery.recipient?.name, subject: delivery.title, body: delivery.body });
  const exhausted = !result.ok && attemptCount >= emailMaxAttempts();

  if (!result.ok) logger.warn("Notification email failed", { deliveryId, to, attemptCount, error: result.error });

  return prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: {
      status: result.ok ? NotificationDeliveryStatus.SENT : exhausted ? NotificationDeliveryStatus.FAILED : NotificationDeliveryStatus.QUEUED,
      sentAt: result.ok ? new Date() : delivery.sentAt,
      failedAt: result.ok ? null : exhausted ? new Date() : delivery.failedAt,
      failureReason: result.ok ? null : result.error,
      attemptCount,
      nextAttemptAt: result.ok || exhausted ? null : nextAttemptDate(attemptCount),
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null
    }
  });
}

export async function processQueuedNotifications(limit = queuedEmailBatchSize()) {
  const now = new Date();
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      status: NotificationDeliveryStatus.QUEUED,
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
    },
    orderBy: [{ priority: "desc" }, { nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit
  });

  const results = [];
  for (const delivery of deliveries) results.push(await sendQueuedNotificationDelivery(delivery.id));
  return results;
}

export async function notificationStats(userId?: string) {
  const where = userId ? { recipientUserId: userId } : {};
  const unreadWhere = userId ? { recipientUserId: userId, status: { in: [NotificationDeliveryStatus.QUEUED, NotificationDeliveryStatus.SENT] } } : { status: { in: [NotificationDeliveryStatus.QUEUED, NotificationDeliveryStatus.SENT] } };
  const [queued, sent, read, failed, unread] = await Promise.all([
    prisma.notificationDelivery.count({ where: { ...where, status: NotificationDeliveryStatus.QUEUED } }),
    prisma.notificationDelivery.count({ where: { ...where, status: NotificationDeliveryStatus.SENT } }),
    prisma.notificationDelivery.count({ where: { ...where, status: NotificationDeliveryStatus.READ } }),
    prisma.notificationDelivery.count({ where: { ...where, status: NotificationDeliveryStatus.FAILED } }),
    prisma.notificationDelivery.count({ where: unreadWhere })
  ]);
  return { queued, sent, read, failed, unread };
}
