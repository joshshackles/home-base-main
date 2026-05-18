import { IntegrationConnectionStatus, IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function integrationsHubPaths(base: "admin" | "landlord" = "admin") {
  return [`/${base}/integrations`, `/${base}/operations`, `/${base}`];
}

function text(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${key} must be ${max} characters or fewer.`);
  return trimmed;
}

function requiredText(formData: FormData, key: string, label: string, max = 240) {
  const value = text(formData, key, max);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function optionalEnum<T extends Record<string, string>>(formData: FormData, key: string, values: T, fallback: T[keyof T]) {
  const value = formData.get(key);
  return typeof value === "string" && Object.values(values).includes(value) ? (value as T[keyof T]) : fallback;
}

function optionalDateTimeNow(formData: FormData, key: string) {
  return formData.get(key) === "on" ? new Date() : undefined;
}

function parseConfigJson(formData: FormData) {
  const raw = text(formData, "configJson", 5000);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Prisma.InputJsonValue;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Configuration must be a JSON object.");
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Configuration JSON is invalid.");
    throw error;
  }
}

async function assertConnectionAccess(connectionId: string | null, ownerId?: string) {
  if (!connectionId) return null;
  const connection = await prisma.integrationConnection.findFirst({
    where: ownerId ? { id: connectionId, OR: [{ ownerId }, { ownerId: null }] } : { id: connectionId },
    select: { id: true, provider: true, displayName: true }
  });
  if (!connection) throw new Error("Selected integration connection was not found.");
  return connection;
}

export async function createIntegrationConnectionFromForm(formData: FormData, options: { ownerId?: string }) {
  const provider = optionalEnum(formData, "provider", IntegrationProvider, IntegrationProvider.OTHER);
  const status = optionalEnum(formData, "status", IntegrationConnectionStatus, IntegrationConnectionStatus.CONFIGURED);
  const configJson = parseConfigJson(formData);

  return prisma.integrationConnection.create({
    data: {
      provider,
      status,
      displayName: requiredText(formData, "displayName", "Display name", 160),
      accountReference: text(formData, "accountReference", 240),
      configJson,
      lastSyncAt: optionalDateTimeNow(formData, "markSynced"),
      lastError: status === IntegrationConnectionStatus.ERROR ? text(formData, "lastError", 1000) : null,
      ...(options.ownerId ? { owner: { connect: { id: options.ownerId } } } : {})
    }
  });
}

export async function updateIntegrationConnectionStatusFromForm(formData: FormData, options: { ownerId?: string }) {
  const connectionId = requiredText(formData, "connectionId", "Connection", 80);
  await assertConnectionAccess(connectionId, options.ownerId);
  const status = optionalEnum(formData, "status", IntegrationConnectionStatus, IntegrationConnectionStatus.CONFIGURED);
  const lastError = status === IntegrationConnectionStatus.ERROR ? text(formData, "lastError", 1000) : null;
  return prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status,
      lastError,
      lastSyncAt: formData.get("markSynced") === "on" ? new Date() : undefined
    }
  });
}

export async function createIntegrationEventFromForm(formData: FormData, options: { actorId?: string; ownerId?: string }) {
  const connectionId = text(formData, "connectionId", 80);
  const connection = await assertConnectionAccess(connectionId, options.ownerId);
  const provider = connection?.provider ?? optionalEnum(formData, "provider", IntegrationProvider, IntegrationProvider.OTHER);
  return prisma.integrationEvent.create({
    data: {
      ...(connection ? { connection: { connect: { id: connection.id } } } : {}),
      ...(options.actorId ? { actor: { connect: { id: options.actorId } } } : {}),
      provider,
      status: optionalEnum(formData, "status", IntegrationEventStatus, IntegrationEventStatus.QUEUED),
      eventType: requiredText(formData, "eventType", "Event type", 140),
      summary: text(formData, "summary", 1000),
      payloadJson: parseConfigJson(formData)
    }
  });
}

export const integrationProviderOptions = [
  IntegrationProvider.STRIPE,
  IntegrationProvider.PLAID,
  IntegrationProvider.TWILIO,
  IntegrationProvider.SENDGRID,
  IntegrationProvider.POSTMARK,
  IntegrationProvider.S3,
  IntegrationProvider.R2,
  IntegrationProvider.QUICKBOOKS,
  IntegrationProvider.GOOGLE_CALENDAR,
  IntegrationProvider.GOOGLE_MAPS,
  IntegrationProvider.SCREENING_PROVIDER,
  IntegrationProvider.OTHER
];
