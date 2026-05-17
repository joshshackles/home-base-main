import { SignatureNotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type EmailProvider = "disabled" | "console" | "resend" | "webhook";

type EmailSendInput = {
  to: string;
  toName?: string | null;
  subject: string;
  body: string;
};

type EmailSendResult = {
  ok: boolean;
  provider: EmailProvider;
  providerMessageId?: string;
  error?: string;
};

export function emailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  if (["disabled", "console", "resend", "webhook"].includes(provider)) return provider as EmailProvider;
  return "console";
}

export function shouldSendEmailOnQueue() {
  return (process.env.EMAIL_SEND_ON_QUEUE || "false").toLowerCase() === "true";
}

export function emailFromAddress() {
  return process.env.EMAIL_FROM || "HomeBase MLS <no-reply@example.com>";
}

export function queuedEmailBatchSize(defaultValue = 25) {
  const raw = Number.parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || "", 10);
  if (!Number.isFinite(raw)) return defaultValue;
  return Math.min(Math.max(raw, 1), 200);
}

export function emailMaxAttempts() {
  const raw = Number.parseInt(process.env.EMAIL_MAX_ATTEMPTS || "", 10);
  if (!Number.isFinite(raw)) return 5;
  return Math.min(Math.max(raw, 1), 20);
}

function nextAttemptDate(attemptCount: number) {
  const minutes = Math.min(60 * 24, Math.pow(2, Math.max(attemptCount - 1, 0)) * 5);
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const provider = emailProvider();

  if (provider === "disabled") {
    return { ok: false, provider, error: "Email provider is disabled." };
  }

  if (provider === "console") {
    logger.info("Console email provider delivery", { to: input.to, toName: input.toName, from: emailFromAddress(), subject: input.subject });
    return { ok: true, provider, providerMessageId: `console-${Date.now()}` };
  }

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, provider, error: "RESEND_API_KEY is not set." };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [input.to],
        subject: input.subject,
        text: input.body
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, provider, error: payload?.message || `Resend returned HTTP ${response.status}.` };
    }
    return { ok: true, provider, providerMessageId: payload?.id };
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (!webhookUrl) return { ok: false, provider, error: "EMAIL_WEBHOOK_URL is not set." };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: input.to,
      toName: input.toName,
      subject: input.subject,
      text: input.body
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, provider, error: payload?.message || `Webhook returned HTTP ${response.status}.` };
  return { ok: true, provider, providerMessageId: payload?.id || payload?.messageId };
}

export async function sendSignatureNotificationEmail(notificationId: string) {
  const notification = await prisma.signatureNotification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new Error("Notification was not found.");
  if (notification.status === SignatureNotificationStatus.SENT) return notification;

  const attemptCount = notification.attemptCount + 1;
  logger.info("Sending signature notification email", { notificationId: notification.id, recipientEmail: notification.recipientEmail, attemptCount });

  const result = await sendEmail({
    to: notification.recipientEmail,
    toName: notification.recipientName,
    subject: notification.subject,
    body: notification.body
  });

  const exhausted = !result.ok && attemptCount >= emailMaxAttempts();

  if (!result.ok) {
    logger.warn("Signature notification email failed", { notificationId: notification.id, recipientEmail: notification.recipientEmail, attemptCount, exhausted, error: result.error });
  } else {
    logger.info("Signature notification email sent", { notificationId: notification.id, recipientEmail: notification.recipientEmail, provider: result.provider });
  }

  return prisma.signatureNotification.update({
    where: { id: notification.id },
    data: {
      status: result.ok ? SignatureNotificationStatus.SENT : exhausted ? SignatureNotificationStatus.FAILED : SignatureNotificationStatus.QUEUED,
      sentAt: result.ok ? new Date() : notification.sentAt,
      failedAt: result.ok ? null : exhausted ? new Date() : notification.failedAt,
      failureReason: result.ok ? null : result.error,
      attemptCount,
      lastAttemptAt: new Date(),
      nextAttemptAt: result.ok || exhausted ? null : nextAttemptDate(attemptCount),
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null
    }
  });
}

export async function sendQueuedSignatureNotificationEmails(limit = queuedEmailBatchSize()) {
  const now = new Date();
  const notifications = await prisma.signatureNotification.findMany({
    where: {
      status: SignatureNotificationStatus.QUEUED,
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit
  });

  const results = [];
  for (const notification of notifications) {
    results.push(await sendSignatureNotificationEmail(notification.id));
  }
  return results;
}

export async function emailQueueStats() {
  const [queued, failed, sent, retrying] = await Promise.all([
    prisma.signatureNotification.count({ where: { status: SignatureNotificationStatus.QUEUED } }),
    prisma.signatureNotification.count({ where: { status: SignatureNotificationStatus.FAILED } }),
    prisma.signatureNotification.count({ where: { status: SignatureNotificationStatus.SENT } }),
    prisma.signatureNotification.count({ where: { status: SignatureNotificationStatus.QUEUED, nextAttemptAt: { gt: new Date() } } })
  ]);

  return { queued, failed, sent, retrying };
}
