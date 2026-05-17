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

if (!scripts["vercel:preflight"]?.includes("scripts/verify-vercel.ts")) {
  fail('package.json must include "vercel:preflight" for deployment checks.');
}

for (const dep of ["next", "react", "react-dom", "@prisma/client", "prisma", "tsx"]) {
  if (!deps[dep]) fail(`package.json is missing ${dep}.`);
}

const vercelJson = existsSync(vercelJsonPath) ? readFileSync(vercelJsonPath, "utf8") : "";
if (!vercelJson.includes('"framework": "nextjs"')) fail("vercel.json should explicitly set the Next.js framework.");
if (!vercelJson.includes('"buildCommand": "npm run vercel-build"')) fail("vercel.json should use npm run vercel-build.");
if (!vercelJson.includes('"path": "/api/cron/send-queued-email"')) fail("vercel.json should register the queued-email cron route.");

const nextConfig = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, "utf8") : "";
for (const required of ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "poweredByHeader: false", "bodySizeLimit: \"12mb\""]) {
  if (!nextConfig.includes(required)) fail(`next.config.mjs is missing ${required}.`);
}

const schema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "";
if (!schema.includes('url      = env("DATABASE_URL")')) fail("Prisma datasource must use DATABASE_URL.");
if (!schema.includes('directUrl = env("DIRECT_URL")')) fail("Prisma datasource must use DIRECT_URL for pooled Vercel database deployments.");

const envExamplePath = path.join(root, ".env.example");
const envExample = existsSync(envExamplePath) ? readFileSync(envExamplePath, "utf8") : "";
for (const key of ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "APP_URL", "DOCUMENT_STORAGE_PROVIDER", "CRON_SECRET", "DOCUMENT_S3_BUCKET"]) {
  if (!envExample.includes(key)) fail(`.env.example is missing ${key}.`);
}

const storageProvider = (process.env.DOCUMENT_STORAGE_PROVIDER || "s3").toLowerCase();
if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
  const authSecret = process.env.AUTH_SECRET || "";
  if (authSecret.length < 32 || /replace|change|dev-only/i.test(authSecret)) fail("AUTH_SECRET must be a unique 32+ character production secret.");

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl) fail("APP_URL must be set for production links.");
  if (appUrl && !/^https:\/\//i.test(appUrl)) fail("APP_URL must use HTTPS on Vercel.");

  if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL && !process.env.NEON_DATABASE_URL) {
    fail("Set DATABASE_URL or a supported Vercel/Neon database URL alias.");
  }

  if (!process.env.DIRECT_URL && !process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL_NON_POOLING_DIRECT && !process.env.NEON_DIRECT_URL) {
    fail("Set DIRECT_URL or a supported non-pooled database URL alias so Prisma migrations can run.");
  }

  if (storageProvider === "local") fail("DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel serverless functions.");
  if (storageProvider === "database") warn("DOCUMENT_STORAGE_PROVIDER=database is deployable but not recommended for production scale. Prefer s3/R2.");

  if (storageProvider === "s3") {
    for (const key of ["DOCUMENT_S3_BUCKET", "DOCUMENT_S3_REGION", "DOCUMENT_S3_ACCESS_KEY_ID", "DOCUMENT_S3_SECRET_ACCESS_KEY"]) {
      if (!process.env[key]) fail(`${key} is required when DOCUMENT_STORAGE_PROVIDER=s3.`);
    }
  }

  const emailProvider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  if (emailProvider !== "disabled" && !process.env.CRON_SECRET) fail("CRON_SECRET must be set so Vercel Cron requests are authorized.");
}

if (failed) process.exit(1);
console.log("Vercel preflight passed: build command, Prisma migration path, cron route, security headers, environment contract, and serverless storage settings are Vercel-ready.");
