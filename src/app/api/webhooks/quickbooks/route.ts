import { NextResponse } from "next/server";
import { IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import { getOrCreateConnection, logIntegrationEvent, verifySharedSecret } from "@/lib/integrations-real";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("intuit-signature") ?? request.headers.get("x-intuit-signature");
  if (!verifySharedSecret(rawBody, signature, process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN)) {
    return NextResponse.json({ error: "Invalid QuickBooks webhook signature." }, { status: 401 });
  }
  const payload = JSON.parse(rawBody || "{}");
  const realmId = payload?.eventNotifications?.[0]?.realmId ?? payload?.realmId ?? "unknown";
  const connection = await getOrCreateConnection({
    provider: IntegrationProvider.QUICKBOOKS,
    displayName: `QuickBooks realm ${realmId}`,
    accountReference: `realm:${realmId}`,
    configJson: { webhookPath: "/api/webhooks/quickbooks", tokenLifecycle: { refreshTokenStoredExternally: true } }
  });
  await logIntegrationEvent({
    provider: IntegrationProvider.QUICKBOOKS,
    connectionId: connection.id,
    eventType: "webhook.quickbooks.received",
    status: IntegrationEventStatus.QUEUED,
    summary: "QuickBooks webhook received and queued for ledger/accounting sync.",
    payload: { realmId, entityCount: payload?.eventNotifications?.[0]?.dataChangeEvent?.entities?.length ?? 0 }
  });
  return NextResponse.json({ received: true });
}
