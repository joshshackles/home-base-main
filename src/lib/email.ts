import { SignatureNotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const provider = emailProvider();

  if (provider === "disabled") {
    return { ok: false, provider, error: "Email provider is disabled." };
  }

  if (provider === "console") {
    console.log("\n--- HomeBase MLS email delivery: console provider ---");
    console.log(`To: ${input.toName ? `${input.toName} <${input.to}>` : input.to}`);
    console.log(`From: ${emailFromAddress()}`);
    console.log(`Subject: ${input.subject}`);
    console.log(input.body);
    console.log("--- End HomeBase MLS email ---\n");
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

  const result = await sendEmail({
    to: notification.recipientEmail,
    toName: notification.recipientName,
    subject: notification.subject,
    body: notification.body
  });

  return prisma.signatureNotification.update({
    where: { id: notification.id },
    data: {
      status: result.ok ? SignatureNotificationStatus.SENT : SignatureNotificationStatus.FAILED,
      sentAt: result.ok ? new Date() : notification.sentAt,
      failedAt: result.ok ? null : new Date(),
      failureReason: result.ok ? null : result.error,
      lastAttemptAt: new Date(),
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null
    }
  });
}

export async function sendQueuedSignatureNotificationEmails(limit = 25) {
  const notifications = await prisma.signatureNotification.findMany({
    where: { status: SignatureNotificationStatus.QUEUED },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  const results = [];
  for (const notification of notifications) {
    results.push(await sendSignatureNotificationEmail(notification.id));
  }
  return results;
}
