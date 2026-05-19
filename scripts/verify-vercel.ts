import { existsSync, readFileSync } from "fs";
import path from "path";

function fail(message: string) {
  console.error(`Vercel check failed: ${message}`);
  failed = true;
}

function warn(message: string) {
  console.warn(`Vercel warning: ${message}`);
}

let failed = false;
const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const nextConfigPath = path.join(root, "next.config.mjs");
const vercelJsonPath = path.join(root, "vercel.json");
const schemaPath = path.join(root, "prisma", "schema.prisma");

for (const file of [packageJsonPath, nextConfigPath, vercelJsonPath, schemaPath]) {
  if (!existsSync(file)) fail(`${path.relative(root, file)} is missing.`);
}

const packageJson = existsSync(packageJsonPath) ? JSON.parse(readFileSync(packageJsonPath, "utf8")) : { scripts: {}, dependencies: {} };
const scripts = packageJson.scripts || {};
const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

if (!scripts["vercel-build"]?.includes("prisma migrate deploy")) {
  fail('package.json must include a vercel-build script that runs "prisma migrate deploy" before next build.');
}

if (!scripts["vercel-build"]?.includes("vercel:migration-recovery")) {
  fail('package.json must run "vercel:migration-recovery" before "prisma migrate deploy" to recover known failed Neon migrations.');
}

if (!scripts["vercel:migration-recovery"]?.includes("scripts/resolve-vercel-migrations.ts")) {
  fail('package.json must include "vercel:migration-recovery" for known failed migration recovery.');
}

if (!scripts["vercel:preflight"]?.includes("scripts/verify-vercel.ts")) {
  fail('package.json must include "vercel:preflight" for deployment checks.');
}

for (const dep of ["next", "react", "react-dom", "@prisma/client", "prisma", "tsx"]) {
  if (!deps[dep]) fail(`package.json is missing ${dep}.`);
}

const vercelJson = existsSync(vercelJsonPath) ? readFileSync(vercelJsonPath, "utf8") : "";

try {
  const parsedVercel = JSON.parse(vercelJson || "{}");

  if (parsedVercel.framework !== "nextjs") {
    fail('vercel.json should explicitly set "framework" to "nextjs".');
  }

  if (parsedVercel.buildCommand !== "npm run vercel-build") {
    fail('vercel.json should explicitly set "buildCommand" to "npm run vercel-build".');
  }

  const crons = Array.isArray(parsedVercel.crons) ? parsedVercel.crons : [];
  const emailCron = crons.find((cron: { path?: string }) => cron.path === "/api/cron/send-queued-email");
  if (!emailCron) {
    fail("vercel.json should register the queued-email cron route.");
  } else if (emailCron.schedule !== "0 3 * * *") {
    fail('Vercel Hobby deployments require the queued-email cron schedule to be "0 3 * * *".');
  }

  const tooFrequentCron = crons.find((cron: { schedule?: string }) => typeof cron.schedule === "string" && cron.schedule.startsWith("*/"));
  if (tooFrequentCron) {
    fail("Vercel Hobby cron schedules must not run more than once daily.");
  }
} catch {
  fail("vercel.json must be valid JSON.");
}

const nextConfig = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, "utf8") : "";
for (const required of ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "poweredByHeader: false", "bodySizeLimit: \"12mb\""]) {
  if (!nextConfig.includes(required)) fail(`next.config.mjs is missing ${required}.`);
}


const dynamicCandidates = ["src/app/admin/page.tsx", "src/app/admin/inbox/page.tsx", "src/app/applicant/page.tsx", "src/app/landlord/page.tsx", "src/app/marketplace/page.tsx"];
for (const relativePath of dynamicCandidates) {
  const fullPath = path.join(root, relativePath);
  if (existsSync(fullPath)) {
    const contents = readFileSync(fullPath, "utf8");
    if (!contents.includes('export const dynamic = "force-dynamic"')) {
      fail(`${relativePath} should opt out of static prerendering because it reads request/auth/database state.`);
    }
  }
}

const schema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "";
if (!schema.includes('url      = env("DATABASE_URL")')) fail("Prisma datasource must use DATABASE_URL.");
if (!schema.includes('directUrl = env("DIRECT_URL")')) fail("Prisma datasource must use DIRECT_URL for pooled Vercel database deployments.");

const envExamplePath = path.join(root, ".env.example");
const envExample = existsSync(envExamplePath) ? readFileSync(envExamplePath, "utf8") : "";
for (const key of ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "APP_URL", "DOCUMENT_STORAGE_PROVIDER", "CRON_SECRET", "DOCUMENT_S3_BUCKET"]) {
  if (!envExample.includes(key)) fail(`.env.example is missing ${key}.`);
}

const storageProvider = (process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")).toLowerCase();
if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
  const authSecret = process.env.AUTH_SECRET || "";
  if (authSecret.length < 32 || /replace|change|dev-only/i.test(authSecret)) fail("AUTH_SECRET must be a unique 32+ character production secret.");

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl) fail("APP_URL must be set for production links.");
  if (appUrl && !/^https:\/\//i.test(appUrl)) fail("APP_URL must use HTTPS on Vercel.");

  if (!process.env.DATABASE_URL) {
    fail('Set DATABASE_URL in Vercel Project Settings. The Prisma schema reads env("DATABASE_URL") directly, so provider aliases are not enough.');
  }

  if (!process.env.DIRECT_URL) {
    fail('Set DIRECT_URL in Vercel Project Settings. The Prisma schema reads env("DIRECT_URL") directly for migration-safe Neon connections.');
  }

  if (storageProvider === "local") fail("DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel serverless functions.");
  if (storageProvider === "database") warn("DOCUMENT_STORAGE_PROVIDER=database is deployable but not recommended for production scale. Prefer s3/R2.");

  if (storageProvider === "s3") {
    for (const key of ["DOCUMENT_S3_BUCKET", "DOCUMENT_S3_REGION", "DOCUMENT_S3_ACCESS_KEY_ID", "DOCUMENT_S3_SECRET_ACCESS_KEY"]) {
      if (!process.env[key]) fail(`${key} is required when DOCUMENT_STORAGE_PROVIDER=s3.`);
    }
  }

  const emailProvider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  const strictEnv = process.env.VERCEL_STRICT_ENV === "1" || process.env.REQUIRE_CRON_SECRET === "true";
  if (emailProvider !== "disabled" && !process.env.CRON_SECRET) {
    const message = "CRON_SECRET is not set. The build can continue for Hobby/demo deployments, but the cron route will reject scheduled requests until CRON_SECRET is added in Vercel Project Settings.";
    if (strictEnv) fail(message);
    else warn(message);
  }
}

if (failed) process.exit(1);
console.log("Vercel preflight passed: build command, Prisma migration path, cron route, security headers, environment contract, and serverless storage settings are Vercel-ready.");
