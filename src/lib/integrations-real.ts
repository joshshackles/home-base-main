import { createHmac, timingSafeEqual } from "crypto";
import { IntegrationConnectionStatus, IntegrationEventStatus, IntegrationProvider, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl, createSecureToken, hashToken } from "@/lib/tokens";
import { emailProvider } from "@/lib/email";
import { getStripe } from "@/lib/stripe";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function nextRetryAt(attempt: number) {
  const minutes = Math.min(24 * 60, Math.max(5, 5 * Math.pow(2, attempt)));
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function getOrCreateConnection(input: { provider: IntegrationProvider; displayName: string; ownerId?: string | null; accountReference?: string | null; configJson?: Prisma.InputJsonValue }) {
  const existing = await prisma.integrationConnection.findFirst({
    where: { ownerId: input.ownerId ?? null, provider: input.provider, displayName: input.displayName }
  });
  if (existing) return existing;
  return prisma.integrationConnection.create({
    data: {
      ownerId: input.ownerId ?? null,
      provider: input.provider,
      displayName: input.displayName,
      accountReference: input.accountReference ?? null,
      status: IntegrationConnectionStatus.CONFIGURED,
      configJson: input.configJson
    }
  });
}

export async function logIntegrationEvent(input: {
  provider: IntegrationProvider;
  eventType: string;
  status?: IntegrationEventStatus;
  summary?: string;
  connectionId?: string | null;
  actorId?: string | null;
  payload?: unknown;
  retryAttempt?: number;
}) {
  const status = input.status ?? IntegrationEventStatus.SUCCESS;
  const retryAttempt = input.retryAttempt ?? 0;
  return prisma.integrationEvent.create({
    data: {
      provider: input.provider,
      eventType: input.eventType,
      status,
      summary: input.summary,
      connectionId: input.connectionId ?? null,
      actorId: input.actorId ?? null,
      payloadJson: json({
        ...(typeof input.payload === "object" && input.payload ? input.payload : { payload: input.payload ?? null }),
        retryAttempt,
        retryable: status === IntegrationEventStatus.FAILED,
        nextRetryAt: status === IntegrationEventStatus.FAILED ? nextRetryAt(retryAttempt).toISOString() : null
      })
    }
  });
}

export function quickBooksOAuthStartUrl(connectionId: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  if (!clientId) throw new Error("QUICKBOOKS_CLIENT_ID is not configured.");
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${appUrl()}/api/integrations/quickbooks/callback`;
  const state = `${connectionId}.${createSecureToken()}`;
  const scope = encodeURIComponent("com.intuit.quickbooks.accounting openid profile email");
  const authBase = (process.env.QUICKBOOKS_ENV || "sandbox") === "production"
    ? "https://appcenter.intuit.com/connect/oauth2"
    : "https://appcenter.intuit.com/connect/oauth2";
  const url = `${authBase}?client_id=${encodeURIComponent(clientId)}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  return { url, state, stateHash: hashToken(state) };
}

export async function markQuickBooksOAuthStarted(connectionId: string, actorId?: string | null, ownerId?: string | null) {
  const connection = await prisma.integrationConnection.findFirst({
    where: ownerId ? { id: connectionId, OR: [{ ownerId }, { ownerId: null }] } : { id: connectionId }
  });
  if (!connection || connection.provider !== IntegrationProvider.QUICKBOOKS) throw new Error("QuickBooks connection was not found.");
  const { url, stateHash } = quickBooksOAuthStartUrl(connection.id);
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      status: IntegrationConnectionStatus.CONFIGURED,
      configJson: json({ ...jsonObject(connection.configJson), oauth: { stateHash, startedAt: new Date().toISOString(), callbackPath: "/api/integrations/quickbooks/callback" } })
    }
  });
  await logIntegrationEvent({
    provider: IntegrationProvider.QUICKBOOKS,
    connectionId: connection.id,
    actorId,
    eventType: "oauth.started",
    summary: "QuickBooks OAuth connection started.",
    payload: { stateHash, redirect: "intuit-connect" }
  });
  return url;
}

export async function handleQuickBooksOAuthCallback(input: { code?: string | null; realmId?: string | null; state?: string | null; error?: string | null }) {
  const connectionId = input.state?.split(".")[0] ?? null;
  if (!connectionId) throw new Error("QuickBooks OAuth callback is missing state.");
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.provider !== IntegrationProvider.QUICKBOOKS) throw new Error("QuickBooks connection was not found.");
  const stateHash = hashToken(input.state ?? "");
  const config = jsonObject(connection.configJson);
  const expectedStateHash = config && typeof config === "object" && !Array.isArray(config) && "oauth" in config
    ? (config.oauth as { stateHash?: string } | undefined)?.stateHash
    : undefined;
  if (expectedStateHash && expectedStateHash !== stateHash) throw new Error("QuickBooks OAuth callback state did not match the active connection attempt.");
  if (input.error) {
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: IntegrationConnectionStatus.ERROR, lastError: input.error } });
    await logIntegrationEvent({ provider: IntegrationProvider.QUICKBOOKS, connectionId: connection.id, eventType: "oauth.failed", status: IntegrationEventStatus.FAILED, summary: input.error, payload: { realmId: input.realmId } });
    return connection;
  }
  if (!input.code) throw new Error("QuickBooks OAuth callback is missing code.");
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      status: IntegrationConnectionStatus.CONNECTED,
      accountReference: input.realmId ? `realm:${input.realmId}` : connection.accountReference,
      lastSyncAt: new Date(),
      lastError: null,
      configJson: json({
        ...config,
        tokenLifecycle: {
          provider: "quickbooks",
          authorizationCodeHash: hashToken(input.code),
          accessTokenStoredExternally: true,
          refreshTokenStoredExternally: true,
          connectedAt: new Date().toISOString(),
          expiresAt: null,
          nextRefreshDueAt: null,
          realmId: input.realmId ?? null
        }
      })
    }
  });
  await logIntegrationEvent({
    provider: IntegrationProvider.QUICKBOOKS,
    connectionId: connection.id,
    eventType: "oauth.connected",
    summary: "QuickBooks OAuth callback completed. Token exchange should run in the secure token worker.",
    payload: { realmId: input.realmId, codeHash: hashToken(input.code) }
  });
  return connection;
}

export function verifySharedSecret(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;
  const expected = [
    createHmac("sha256", secret).update(rawBody).digest("hex"),
    createHmac("sha256", secret).update(rawBody).digest("base64")
  ];
  const normalized = signature.replace(/^sha256=/, "");
  return expected.some((candidate) => {
    const left = Buffer.from(candidate);
    const right = Buffer.from(normalized);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export async function runRealConnectionDiagnostic(connectionId: string, actorId?: string | null) {
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error("Connection was not found.");

  if (connection.provider === IntegrationProvider.STRIPE) {
    const stripe = getStripe();
    const balance = await stripe.balance.retrieve();
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: IntegrationConnectionStatus.CONNECTED, lastSyncAt: new Date(), lastError: null } });
    return logIntegrationEvent({ provider: IntegrationProvider.STRIPE, connectionId, actorId, eventType: "diagnostic.stripe.balance", summary: "Stripe API diagnostic succeeded.", payload: { available: balance.available.length, pending: balance.pending.length } });
  }

  if (connection.provider === IntegrationProvider.SENDGRID || connection.provider === IntegrationProvider.POSTMARK) {
    const provider = emailProvider();
    const configured = provider === "resend" || provider === "webhook" || provider === "console";
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: configured ? IntegrationConnectionStatus.CONNECTED : IntegrationConnectionStatus.ERROR, lastSyncAt: new Date(), lastError: configured ? null : "Email provider is disabled." } });
    return logIntegrationEvent({ provider: connection.provider, connectionId, actorId, eventType: "diagnostic.email.provider", status: configured ? IntegrationEventStatus.SUCCESS : IntegrationEventStatus.FAILED, summary: `Email provider diagnostic: ${provider}.`, payload: { provider } });
  }

  if (connection.provider === IntegrationProvider.QUICKBOOKS) {
    const hasClient = Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET && (process.env.QUICKBOOKS_REDIRECT_URI || process.env.APP_URL));
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { status: hasClient ? IntegrationConnectionStatus.CONFIGURED : IntegrationConnectionStatus.ERROR, lastError: hasClient ? null : "QuickBooks OAuth environment is incomplete." } });
    return logIntegrationEvent({ provider: IntegrationProvider.QUICKBOOKS, connectionId, actorId, eventType: "diagnostic.quickbooks.oauth_env", status: hasClient ? IntegrationEventStatus.SUCCESS : IntegrationEventStatus.FAILED, summary: hasClient ? "QuickBooks OAuth environment is ready." : "QuickBooks OAuth environment is incomplete.", payload: { hasClient } });
  }

  return logIntegrationEvent({ provider: connection.provider, connectionId, actorId, eventType: "diagnostic.generic", status: IntegrationEventStatus.SKIPPED, summary: "No real v1 diagnostic is implemented for this provider yet." });
}
