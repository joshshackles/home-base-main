import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing environment contract markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertSingleAssignment(envExample: string, key: string) {
  const matches = envExample.match(new RegExp(`^${key}=`, "gm")) ?? [];
  if (matches.length !== 1) {
    throw new Error(`.env.example should define ${key} exactly once, found ${matches.length}.`);
  }
}

assertExists("docs/ENVIRONMENT_CONTRACT.md");

assertIncludes("docs/ENVIRONMENT_CONTRACT.md", [
  "Environment Contract",
  "Required For Any Real Deployment",
  "Required For Durable Document Storage",
  "Email, Cron, And Notifications",
  "Payments",
  "Strict Mode",
  "scripts/verify-environment-contract.ts"
]);

assertIncludes("src/lib/env.ts", [
  "AUTH_SECRET must be set to a unique random value of at least 32 characters.",
  "DATABASE_URL is not set.",
  "DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel/serverless deployments.",
  "DOCUMENT_STORAGE_PROVIDER=database stores uploaded bytes in Postgres",
  "APP_URL must use HTTPS in production.",
  "EMAIL_PROVIDER must be disabled, console, resend, or webhook.",
  "CRON_SECRET should be set to protect /api/cron/send-queued-email.",
  "STRIPE_WEBHOOK_SECRET should be set when Stripe payments are enabled.",
  "EMAIL_QUEUE_BATCH_SIZE must be between 1 and 200."
]);

assertIncludes("scripts/verify-vercel.ts", [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "APP_URL",
  "DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel serverless functions.",
  "DOCUMENT_STORAGE_PROVIDER=database is deployable but not recommended for production scale.",
  "VERCEL_STRICT_ENV",
  "REQUIRE_CRON_SECRET"
]);

assertIncludes(".env.example", [
  "DATABASE_URL=",
  "DIRECT_URL=",
  "AUTH_SECRET=",
  "APP_URL=",
  "DOCUMENT_STORAGE_PROVIDER=",
  "EMAIL_PROVIDER=",
  "CRON_SECRET=",
  "VERCEL_STRICT_ENV=",
  "REQUIRE_CRON_SECRET=",
  "NEXT_PUBLIC_STRIPE_ENABLED=",
  "STRIPE_WEBHOOK_SECRET="
]);

const envExample = read(".env.example");
for (const key of [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "APP_URL",
  "DOCUMENT_STORAGE_PROVIDER",
  "EMAIL_QUEUE_BATCH_SIZE",
  "VERCEL_STRICT_ENV"
]) {
  assertSingleAssignment(envExample, key);
}

assertIncludes("docs/VERCEL_DEPLOYMENT.md", [
  "npm run vercel-build",
  "npm run environment-contract:verify",
  "npm run middleware-static:verify",
  "npm run permission-matrix:verify",
  "npm run authorization-runtime:verify",
  "DIRECT_URL",
  "DOCUMENT_STORAGE_PROVIDER=s3",
  "CRON_SECRET"
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.5\"",
  "\"environment-contract:verify\"",
  "\"expanded-access:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify && npm run admin-command-center-inspection-title-fix:verify && npm run lead-authorization-relation-fix:verify && npm run maintenance-priority-enum-fix:verify && npm run role-visibility-workflow-simplification:verify && npm run homepage-slider-marketplace-refresh:verify && npm run tenant-nav-minimum-fix:verify && npm run admin-branding-slide-search-param-fix:verify && npm run dashboard-shell-sparkles-icon-fix:verify && npm run homepage-reference-fidelity-pass:verify && npm run routes:check",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.61.5"]);
assertIncludes("README.md", ["Current package version: **4.61.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.5 - Version Consistency Metadata Cleanup"]);

console.log("Environment contract verification passed.");
