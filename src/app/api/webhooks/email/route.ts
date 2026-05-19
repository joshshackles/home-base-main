import { NextResponse } from "next/server";
import { IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import { getOrCreateConnection, logIntegrationEvent, verifySharedSecret } from "@/lib/integrations-real";

export const dynamic = "force-dynamic";

function providerFromHeader(value: string | null) {
  const provider = (value || process.env.EMAIL_PROVIDER || "webhook").toLowerCase();
  if (provider.includes("postmark")) return IntegrationProvider.POSTMARK;
  return IntegrationProvider.SENDGRID;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-homebase-email-signature") ?? request.headers.get("x-postmark-signature") ?? request.headers.get("x-twilio-email-event-webhook-signature");
  if (!verifySharedSecret(rawBody, signature, process.env.EMAIL_WEBHOOK_SECRET || process.env.POSTMARK_WEBHOOK_SECRET || process.env.SENDGRID_WEBHOOK_PUBLIC_KEY)) {
    return NextResponse.json({ error: "Invalid email webhook signature." }, { status: 401 });
  }
  const payload = JSON.parse(rawBody || "{}");
  const provider = providerFromHeader(request.headers.get("x-email-provider"));
  const connection = await getOrCreateConnection({
    provider,
    displayName: provider === IntegrationProvider.POSTMARK ? "Postmark transactional email" : "SendGrid transactional email",
    accountReference: process.env.EMAIL_FROM ?? "email-provider",
    configJson: { webhookPath: "/api/webhooks/email", tokenLifecycle: { apiTokenStoredInEnv: true } }
  });
  await logIntegrationEvent({
    provider,
    connectionId: connection.id,
    eventType: "webhook.email.delivery",
    status: IntegrationEventStatus.SUCCESS,
    summary: "Email provider delivery webhook received.",
    payload: { event: payload?.event || payload?.Event || payload?.[0]?.event || "delivery", messageId: payload?.MessageID || payload?.sg_message_id || payload?.[0]?.sg_message_id || null }
  });
  return NextResponse.json({ received: true });
}
