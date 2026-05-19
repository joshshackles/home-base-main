import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "src/lib/integrations-real.ts",
  "src/lib/integrations-hub.ts",
  "src/lib/operations/modules.ts",
  "src/components/operations/IntegrationsHubModule.tsx",
  "src/app/api/stripe/webhook/route.ts",
  "src/app/api/webhooks/email/route.ts",
  "src/app/api/webhooks/quickbooks/route.ts",
  "src/app/api/integrations/quickbooks/start/route.ts",
  "src/app/api/integrations/quickbooks/callback/route.ts",
  "docs/INTEGRATIONS_V1_REAL_CONNECTIONS.md",
  "src/lib/app-version.ts"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) throw new Error(`Missing integrations v1 files: ${missingFiles.join(", ")}`);

function semverAtLeast(version: string, minimum: string) {
  const parts = version.split(".").map((part) => Number(part));
  const minimumParts = minimum.split(".").map((part) => Number(part));
  for (let index = 0; index < Math.max(parts.length, minimumParts.length); index += 1) {
    const actual = parts[index] ?? 0;
    const expected = minimumParts[index] ?? 0;
    if (actual > expected) return true;
    if (actual < expected) return false;
  }
  return true;
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string; scripts?: Record<string, string> };
if (!packageJson.version || !semverAtLeast(packageJson.version, "4.25.0")) throw new Error(`Expected package version 4.25.0 or newer, found ${packageJson.version ?? "missing"}`);
if (packageJson.scripts?.["integrations-v1-real:verify"] !== "tsx scripts/verify-integrations-v1-real-connections.ts") throw new Error("Missing integrations-v1-real:verify package script.");

const appVersion = readFileSync("src/lib/app-version.ts", "utf8");
const appVersionMatch = /APP_VERSION = "([^"]+)"/.exec(appVersion);
if (!appVersionMatch || !semverAtLeast(appVersionMatch[1], "4.25.0")) throw new Error("APP_VERSION must be 4.25.0 or newer.");

const realLib = readFileSync("src/lib/integrations-real.ts", "utf8");
for (const needle of [
  "quickBooksOAuthStartUrl",
  "markQuickBooksOAuthStarted",
  "handleQuickBooksOAuthCallback",
  "verifySharedSecret",
  "runRealConnectionDiagnostic",
  "nextRetryAt",
  "accessTokenStoredExternally",
  "refreshTokenStoredExternally"
]) {
  if (!realLib.includes(needle)) throw new Error(`Real integrations library missing: ${needle}`);
}

const hub = readFileSync("src/lib/integrations-hub.ts", "utf8");
for (const needle of ["realConnectionV1", "/api/stripe/webhook", "/api/webhooks/email", "runRealConnectionDiagnostic"]) {
  if (!hub.includes(needle)) throw new Error(`Integrations hub missing: ${needle}`);
}

const module = readFileSync("src/lib/operations/modules.ts", "utf8");
for (const needle of ["realConnections", "retryableEvents", "webhookEvents", "oauthEvents", "syncEvents"]) {
  if (!module.includes(needle)) throw new Error(`Operations integrations module missing: ${needle}`);
}

const ui = readFileSync("src/components/operations/IntegrationsHubModule.tsx", "utf8");
for (const needle of ["Real v1", "Real connections: Stripe, email, QuickBooks", "Start OAuth", "Retryable failures", "Webhook logs", "OAuth logs", "Sync logs"]) {
  if (!ui.includes(needle)) throw new Error(`Integrations UI missing: ${needle}`);
}

const stripeWebhook = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
for (const needle of ["getOrCreateConnection", "logIntegrationEvent", "webhook.${event.type}.received", "webhook.${event.type}.processed", "webhook.${event.type}.failed"]) {
  if (!stripeWebhook.includes(needle)) throw new Error(`Stripe webhook integration logging missing: ${needle}`);
}

const emailWebhook = readFileSync("src/app/api/webhooks/email/route.ts", "utf8");
for (const needle of ["verifySharedSecret", "IntegrationProvider.POSTMARK", "IntegrationProvider.SENDGRID", "webhook.email.delivery"]) {
  if (!emailWebhook.includes(needle)) throw new Error(`Email webhook missing: ${needle}`);
}

const quickBooksWebhook = readFileSync("src/app/api/webhooks/quickbooks/route.ts", "utf8");
for (const needle of ["QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN", "webhook.quickbooks.received", "realmId"]) {
  if (!quickBooksWebhook.includes(needle)) throw new Error(`QuickBooks webhook missing: ${needle}`);
}

const quickBooksStart = readFileSync("src/app/api/integrations/quickbooks/start/route.ts", "utf8");
if (!quickBooksStart.includes("markQuickBooksOAuthStarted") || !quickBooksStart.includes("LANDLORD")) throw new Error("QuickBooks OAuth start route is not wired for admin/landlord access.");

const quickBooksCallback = readFileSync("src/app/api/integrations/quickbooks/callback/route.ts", "utf8");
for (const needle of ["handleQuickBooksOAuthCallback", "realmId", "quickbooks=connected"]) {
  if (!quickBooksCallback.includes(needle)) throw new Error(`QuickBooks OAuth callback missing: ${needle}`);
}

const docs = readFileSync("docs/INTEGRATIONS_V1_REAL_CONNECTIONS.md", "utf8");
for (const needle of ["Stripe", "Email", "QuickBooks", "Token lifecycle", "Admin diagnostics", "Verification"]) {
  if (!docs.includes(needle)) throw new Error(`Docs missing: ${needle}`);
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes("v4.25.0 - Integrations v1 Real Connections")) throw new Error("Changelog is missing v4.25.0 entry.");

console.log("Integrations v1 real connections verification passed.");
