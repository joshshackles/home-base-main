import { IntegrationConnectionStatus, IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type IntegrationReadiness = {
  provider: IntegrationProvider;
  label: string;
  description: string;
  category: "Payments" | "Banking" | "Messaging" | "Storage" | "Accounting" | "Calendar" | "Maps" | "Screening" | "Other";
  requiredEnv: string[];
  optionalEnv: string[];
  webhookPath: string | null;
  docsHint: string;
  configured: boolean;
  missingRequiredEnv: string[];
  configuredRequiredEnv: string[];
  configuredOptionalEnv: string[];
  quickBooks?: QuickBooksSetupProfile;
};

export type QuickBooksSetupProfile = {
  envTemplate: string[];
  redirectUri: string;
  webhookPath: string;
  oauthScopes: string[];
  safeConfigTemplate: Record<string, string | boolean>;
  connectionChecklist: string[];
  syncObjects: string[];
};

type ProviderSpec = Omit<IntegrationReadiness, "configured" | "missingRequiredEnv" | "configuredRequiredEnv" | "configuredOptionalEnv">;

export const QUICKBOOKS_SETUP_PROFILE: QuickBooksSetupProfile = {
  envTemplate: [
    "QUICKBOOKS_CLIENT_ID=",
    "QUICKBOOKS_CLIENT_SECRET=",
    "QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/integrations/quickbooks/callback",
    "QUICKBOOKS_ENV=sandbox",
    "QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN="
  ],
  redirectUri: "/api/integrations/quickbooks/callback",
  webhookPath: "/api/webhooks/quickbooks",
  oauthScopes: ["com.intuit.quickbooks.accounting", "openid", "profile", "email"],
  safeConfigTemplate: {
    environment: "sandbox",
    companyName: "",
    realmId: "",
    syncInvoices: true,
    syncPayments: true,
    syncVendorBills: true,
    syncOwnerPayouts: true,
    defaultIncomeAccount: "Rental Income",
    defaultDepositAccount: "Undeposited Funds"
  },
  connectionChecklist: [
    "Create a QuickBooks app in the Intuit Developer dashboard.",
    "Add the production domain callback URL to QuickBooks Redirect URIs.",
    "Set the QuickBooks client ID, client secret, redirect URI, and environment in Vercel.",
    "Connect the company file through OAuth and record the QuickBooks realm ID on the connection.",
    "Register the webhook endpoint and verifier token for accounting change events.",
    "Run the readiness diagnostic before enabling scheduled syncs."
  ],
  syncObjects: ["customers", "invoices", "payments", "deposits", "vendor bills", "owner payouts", "chart-of-accounts mappings"]
};

const PROVIDER_SPECS: Record<IntegrationProvider, ProviderSpec> = {
  [IntegrationProvider.STRIPE]: {
    provider: IntegrationProvider.STRIPE,
    label: "Stripe",
    category: "Payments",
    description: "Card and ACH payment processing, payment webhooks, deposits, and reconciliation events.",
    requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    optionalEnv: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_ACCOUNT_ID"],
    webhookPath: "/api/webhooks/stripe",
    docsHint: "Use live keys in production and add the webhook signing secret in Vercel."
  },
  [IntegrationProvider.PLAID]: {
    provider: IntegrationProvider.PLAID,
    label: "Plaid",
    category: "Banking",
    description: "Bank account linking, account verification, balance checks, and transaction sync readiness.",
    requiredEnv: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV"],
    optionalEnv: ["PLAID_WEBHOOK_SECRET"],
    webhookPath: "/api/webhooks/plaid",
    docsHint: "Set PLAID_ENV to sandbox, development, or production to match the credential set."
  },
  [IntegrationProvider.TWILIO]: {
    provider: IntegrationProvider.TWILIO,
    label: "Twilio",
    category: "Messaging",
    description: "SMS notifications for leads, rent reminders, maintenance windows, and operational alerts.",
    requiredEnv: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    optionalEnv: ["TWILIO_STATUS_CALLBACK_SECRET"],
    webhookPath: "/api/webhooks/twilio",
    docsHint: "Use a verified sender number and configure status callbacks when message delivery tracking is needed."
  },
  [IntegrationProvider.SENDGRID]: {
    provider: IntegrationProvider.SENDGRID,
    label: "SendGrid",
    category: "Messaging",
    description: "Transactional email delivery for notices, applications, leases, and workflow messages.",
    requiredEnv: ["SENDGRID_API_KEY", "EMAIL_FROM"],
    optionalEnv: ["SENDGRID_WEBHOOK_PUBLIC_KEY"],
    webhookPath: "/api/webhooks/sendgrid",
    docsHint: "Verify the sender domain before switching production email traffic to SendGrid."
  },
  [IntegrationProvider.POSTMARK]: {
    provider: IntegrationProvider.POSTMARK,
    label: "Postmark",
    category: "Messaging",
    description: "Transactional email delivery with delivery/bounce event tracking.",
    requiredEnv: ["POSTMARK_SERVER_TOKEN", "EMAIL_FROM"],
    optionalEnv: ["POSTMARK_WEBHOOK_SECRET"],
    webhookPath: "/api/webhooks/postmark",
    docsHint: "Use a production server token and configure bounce webhooks for deliverability monitoring."
  },
  [IntegrationProvider.S3]: {
    provider: IntegrationProvider.S3,
    label: "Amazon S3",
    category: "Storage",
    description: "Object storage for leases, compliance documents, images, exports, and uploaded attachments.",
    requiredEnv: ["DOCUMENT_STORAGE_PROVIDER", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
    optionalEnv: ["S3_ENDPOINT", "S3_PUBLIC_BASE_URL"],
    webhookPath: null,
    docsHint: "Set DOCUMENT_STORAGE_PROVIDER=s3 and use a private bucket with least-privilege credentials."
  },
  [IntegrationProvider.R2]: {
    provider: IntegrationProvider.R2,
    label: "Cloudflare R2",
    category: "Storage",
    description: "S3-compatible storage for documents, media, exports, and generated files.",
    requiredEnv: ["DOCUMENT_STORAGE_PROVIDER", "R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"],
    optionalEnv: ["R2_PUBLIC_BASE_URL"],
    webhookPath: null,
    docsHint: "Set DOCUMENT_STORAGE_PROVIDER=r2 and keep bucket access private unless a public CDN is intentionally configured."
  },
  [IntegrationProvider.QUICKBOOKS]: {
    provider: IntegrationProvider.QUICKBOOKS,
    label: "QuickBooks",
    category: "Accounting",
    description: "QuickBooks Online accounting setup for invoice, payment, deposit, vendor bill, owner payout, and ledger sync readiness.",
    requiredEnv: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET", "QUICKBOOKS_REDIRECT_URI"],
    optionalEnv: ["QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN", "QUICKBOOKS_ENV", "QUICKBOOKS_MINOR_VERSION"],
    webhookPath: QUICKBOOKS_SETUP_PROFILE.webhookPath,
    docsHint: "Use this hub to store company/realm mapping only. OAuth access and refresh tokens must live in the secure token store, never in config JSON.",
    quickBooks: QUICKBOOKS_SETUP_PROFILE
  },
  [IntegrationProvider.GOOGLE_CALENDAR]: {
    provider: IntegrationProvider.GOOGLE_CALENDAR,
    label: "Google Calendar",
    category: "Calendar",
    description: "Calendar sync readiness for tours, inspections, maintenance windows, reminders, and appointments.",
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
    optionalEnv: ["GOOGLE_CALENDAR_WEBHOOK_TOKEN"],
    webhookPath: "/api/webhooks/google-calendar",
    docsHint: "Use OAuth consent and scoped tokens for user calendars; do not put refresh tokens in config JSON."
  },
  [IntegrationProvider.GOOGLE_MAPS]: {
    provider: IntegrationProvider.GOOGLE_MAPS,
    label: "Google Maps",
    category: "Maps",
    description: "Address lookup, map embeds, commute context, and geocoding readiness.",
    requiredEnv: ["GOOGLE_MAPS_API_KEY"],
    optionalEnv: ["NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID"],
    webhookPath: null,
    docsHint: "Restrict API keys by domain/IP and enabled API surface."
  },
  [IntegrationProvider.SCREENING_PROVIDER]: {
    provider: IntegrationProvider.SCREENING_PROVIDER,
    label: "Screening provider",
    category: "Screening",
    description: "Background checks, income verification, rental history checks, and package ordering readiness.",
    requiredEnv: ["SCREENING_PROVIDER_API_KEY", "SCREENING_PROVIDER_BASE_URL"],
    optionalEnv: ["SCREENING_PROVIDER_WEBHOOK_SECRET", "SCREENING_PROVIDER_ACCOUNT_ID"],
    webhookPath: "/api/webhooks/screening",
    docsHint: "Screening credentials and consumer-report compliance settings must be managed outside freeform JSON."
  },
  [IntegrationProvider.OTHER]: {
    provider: IntegrationProvider.OTHER,
    label: "Other",
    category: "Other",
    description: "Custom or future integration tracked by the operations team.",
    requiredEnv: [],
    optionalEnv: [],
    webhookPath: null,
    docsHint: "Document required credentials and webhooks in the connection notes."
  }
};

export function integrationsHubPaths(base: "admin" | "landlord" = "admin") {
  return [`/${base}/integrations`, `/${base}/operations`, `/${base}`];
}

export function getIntegrationProviderSpec(provider: IntegrationProvider) {
  return PROVIDER_SPECS[provider];
}

export function getIntegrationReadiness(provider: IntegrationProvider): IntegrationReadiness {
  const spec = getIntegrationProviderSpec(provider);
  const configuredRequiredEnv = spec.requiredEnv.filter((name) => Boolean(process.env[name]));
  const missingRequiredEnv = spec.requiredEnv.filter((name) => !process.env[name]);
  const configuredOptionalEnv = spec.optionalEnv.filter((name) => Boolean(process.env[name]));
  return {
    ...spec,
    configured: missingRequiredEnv.length === 0,
    missingRequiredEnv,
    configuredRequiredEnv,
    configuredOptionalEnv
  };
}

export function getIntegrationReadinessCatalog() {
  return integrationProviderOptions.map(getIntegrationReadiness);
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

function assertNoSecretLikeConfig(configJson: Prisma.InputJsonValue | undefined) {
  if (!configJson || typeof configJson !== "object" || Array.isArray(configJson)) return;
  const blocked = ["secret", "token", "password", "apiKey", "api_key", "privateKey", "private_key", "clientSecret", "client_secret"];
  const keys = Object.keys(configJson as Record<string, unknown>);
  const unsafe = keys.filter((key) => blocked.some((blockedKey) => key.toLowerCase().includes(blockedKey.toLowerCase())));
  if (unsafe.length) throw new Error(`Do not store secrets in config JSON. Move these fields to environment variables: ${unsafe.join(", ")}.`);
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


function optionalQuickBooksBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function quickBooksConfigFromForm(formData: FormData): Prisma.InputJsonValue {
  const environment = text(formData, "quickBooksEnvironment", 24) ?? "sandbox";
  if (!["sandbox", "production"].includes(environment)) throw new Error("QuickBooks environment must be sandbox or production.");
  const companyName = requiredText(formData, "quickBooksCompanyName", "QuickBooks company name", 160);
  const realmId = text(formData, "quickBooksRealmId", 80);
  const defaultIncomeAccount = text(formData, "defaultIncomeAccount", 120) ?? "Rental Income";
  const defaultDepositAccount = text(formData, "defaultDepositAccount", 120) ?? "Undeposited Funds";
  return {
    environment,
    companyName,
    realmId: realmId ?? "",
    syncInvoices: optionalQuickBooksBoolean(formData, "syncInvoices"),
    syncPayments: optionalQuickBooksBoolean(formData, "syncPayments"),
    syncVendorBills: optionalQuickBooksBoolean(formData, "syncVendorBills"),
    syncOwnerPayouts: optionalQuickBooksBoolean(formData, "syncOwnerPayouts"),
    defaultIncomeAccount,
    defaultDepositAccount,
    callbackPath: QUICKBOOKS_SETUP_PROFILE.redirectUri,
    webhookPath: QUICKBOOKS_SETUP_PROFILE.webhookPath
  };
}

export async function createQuickBooksConnectionFromForm(formData: FormData, options: { ownerId?: string }) {
  const readiness = getIntegrationReadiness(IntegrationProvider.QUICKBOOKS);
  const companyName = requiredText(formData, "quickBooksCompanyName", "QuickBooks company name", 160);
  const realmId = text(formData, "quickBooksRealmId", 80);
  const displayName = text(formData, "displayName", 160) ?? `${companyName} QuickBooks`;
  const configJson = quickBooksConfigFromForm(formData);
  const connection = await prisma.integrationConnection.create({
    data: {
      provider: IntegrationProvider.QUICKBOOKS,
      status: readiness.configured ? IntegrationConnectionStatus.CONFIGURED : IntegrationConnectionStatus.NOT_CONFIGURED,
      displayName,
      accountReference: realmId ? `realm:${realmId}` : companyName,
      configJson,
      lastError: readiness.configured ? null : `Missing required QuickBooks environment variables: ${readiness.missingRequiredEnv.join(", ")}`,
      ...(options.ownerId ? { owner: { connect: { id: options.ownerId } } } : {})
    }
  });

  await prisma.integrationEvent.create({
    data: {
      connection: { connect: { id: connection.id } },
      provider: IntegrationProvider.QUICKBOOKS,
      status: readiness.configured ? IntegrationEventStatus.SUCCESS : IntegrationEventStatus.SKIPPED,
      eventType: "quickbooks.setup.created",
      summary: readiness.configured
        ? `${displayName} is ready for the QuickBooks OAuth connection step.`
        : `${displayName} was created, but QuickBooks env setup is incomplete: ${readiness.missingRequiredEnv.join(", ")}.`,
      payloadJson: {
        companyName,
        realmId: realmId ?? null,
        requiredEnv: readiness.requiredEnv,
        missingRequiredEnv: readiness.missingRequiredEnv,
        callbackPath: QUICKBOOKS_SETUP_PROFILE.redirectUri,
        webhookPath: QUICKBOOKS_SETUP_PROFILE.webhookPath,
        syncObjects: QUICKBOOKS_SETUP_PROFILE.syncObjects
      }
    }
  });

  return connection;
}

export async function createIntegrationConnectionFromForm(formData: FormData, options: { ownerId?: string }) {
  const provider = optionalEnum(formData, "provider", IntegrationProvider, IntegrationProvider.OTHER);
  const readiness = getIntegrationReadiness(provider);
  const status = optionalEnum(formData, "status", IntegrationConnectionStatus, readiness.configured ? IntegrationConnectionStatus.CONFIGURED : IntegrationConnectionStatus.NOT_CONFIGURED);
  const configJson = parseConfigJson(formData);
  assertNoSecretLikeConfig(configJson);

  const displayName = requiredText(formData, "displayName", "Display name", 160);
  const connection = await prisma.integrationConnection.create({
    data: {
      provider,
      status,
      displayName,
      accountReference: text(formData, "accountReference", 240),
      configJson,
      lastSyncAt: optionalDateTimeNow(formData, "markSynced"),
      lastError: status === IntegrationConnectionStatus.ERROR ? text(formData, "lastError", 1000) : readiness.configured ? null : `Missing required environment variables: ${readiness.missingRequiredEnv.join(", ")}`,
      ...(options.ownerId ? { owner: { connect: { id: options.ownerId } } } : {})
    }
  });

  await prisma.integrationEvent.create({
    data: {
      connection: { connect: { id: connection.id } },
      provider,
      status: readiness.configured ? IntegrationEventStatus.SUCCESS : IntegrationEventStatus.SKIPPED,
      eventType: "connection.created",
      summary: readiness.configured ? `${displayName} has all required environment variables configured.` : `${displayName} is missing required environment variables: ${readiness.missingRequiredEnv.join(", ")}`,
      payloadJson: { requiredEnv: readiness.requiredEnv, missingRequiredEnv: readiness.missingRequiredEnv, webhookPath: readiness.webhookPath }
    }
  });

  return connection;
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
  const payloadJson = parseConfigJson(formData);
  assertNoSecretLikeConfig(payloadJson);
  return prisma.integrationEvent.create({
    data: {
      ...(connection ? { connection: { connect: { id: connection.id } } } : {}),
      ...(options.actorId ? { actor: { connect: { id: options.actorId } } } : {}),
      provider,
      status: optionalEnum(formData, "status", IntegrationEventStatus, IntegrationEventStatus.QUEUED),
      eventType: requiredText(formData, "eventType", "Event type", 140),
      summary: text(formData, "summary", 1000),
      payloadJson
    }
  });
}

export async function runIntegrationDiagnosticFromForm(formData: FormData, options: { actorId?: string; ownerId?: string }) {
  const connectionId = requiredText(formData, "connectionId", "Connection", 80);
  const connection = await assertConnectionAccess(connectionId, options.ownerId);
  if (!connection) throw new Error("Connection is required.");
  const readiness = getIntegrationReadiness(connection.provider);
  const status = readiness.configured ? IntegrationConnectionStatus.CONNECTED : IntegrationConnectionStatus.ERROR;
  const summary = readiness.configured
    ? `${readiness.label} readiness check passed. Required environment variables are present${readiness.webhookPath ? ` and webhook endpoint is ${readiness.webhookPath}` : ""}.`
    : `${readiness.label} readiness check failed. Missing: ${readiness.missingRequiredEnv.join(", ")}.`;

  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      status,
      lastSyncAt: readiness.configured ? new Date() : undefined,
      lastError: readiness.configured ? null : summary
    }
  });

  return prisma.integrationEvent.create({
    data: {
      connection: { connect: { id: connection.id } },
      ...(options.actorId ? { actor: { connect: { id: options.actorId } } } : {}),
      provider: connection.provider,
      status: readiness.configured ? IntegrationEventStatus.SUCCESS : IntegrationEventStatus.FAILED,
      eventType: "diagnostic.readiness_check",
      summary,
      payloadJson: {
        requiredEnv: readiness.requiredEnv,
        configuredRequiredEnv: readiness.configuredRequiredEnv,
        missingRequiredEnv: readiness.missingRequiredEnv,
        configuredOptionalEnv: readiness.configuredOptionalEnv,
        webhookPath: readiness.webhookPath,
        docsHint: readiness.docsHint
      }
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
