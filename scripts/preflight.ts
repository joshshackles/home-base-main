import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";

function existingConfigFile() {
  for (const file of ["next.config.mjs", "next.config.ts", "next.config.js"]) {
    if (existsSync(path.join(process.cwd(), file))) return file;
  }
  return null;
}

const requiredFiles = [
  "package.json",
  "tsconfig.json",
  "prisma/schema.prisma",
  "prisma/seed.ts",
  "prisma/migrations/migration_lock.toml",
  "src/lib/auth.ts",
  "src/lib/audit.ts",
  "src/lib/storage.ts",
  "src/app/admin/layout.tsx",
  "src/app/landlord/layout.tsx",
  "src/app/applicant/layout.tsx",
  "src/app/api/documents/[id]/route.ts",
  "scripts/verify-storage.ts",
  "scripts/verify-seed.ts",
  "scripts/verify-workflows.ts",
  "scripts/verify-security.ts",
  "docs/QA_CHECKLIST.md",
  "docs/WORKFLOW_VERIFICATION.md"
];

const databaseEnvKey = "DATABASE_URL";
const directEnvKey = "DIRECT_URL";
const requiredEnv = ["AUTH_SECRET"];
const unsafeSecrets = new Set(["", "dev-only-change-this-secret-before-deployment", "change-me", "changeme", "replace-this-with-a-long-random-secret", "replace-with-a-long-random-secret", "replace-with-at-least-32-random-characters"]);
let failed = false;
const nextConfigFile = existingConfigFile();

for (const file of requiredFiles) {
  if (!existsSync(path.join(process.cwd(), file))) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

if (!nextConfigFile) {
  console.error("Missing required Next config file: next.config.mjs, next.config.ts, or next.config.js");
  failed = true;
}

const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
for (const [sectionName, section] of Object.entries({ dependencies: packageJson.dependencies ?? {}, devDependencies: packageJson.devDependencies ?? {} })) {
  for (const [name, version] of Object.entries(section as Record<string, string>)) {
    if (version === "latest" || version === "*") {
      console.error(`Unsafe package version in ${sectionName}: ${name}@${version}`);
      failed = true;
    }
  }
}

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`Environment warning: ${key} is not set in this shell.`);
  }
}

if (!process.env[databaseEnvKey]) {
  console.warn(`Environment warning: set ${databaseEnvKey}. Prisma reads this exact variable name.`);
  failed = true;
}

if (!process.env[directEnvKey]) {
  console.warn(`Environment warning: set ${directEnvKey}. Prisma reads this exact variable name for migrations.`);
}

if (unsafeSecrets.has(process.env.AUTH_SECRET || "") || (process.env.AUTH_SECRET || "").length < 32) {
  console.warn("Environment warning: AUTH_SECRET appears to be a development placeholder.");
  failed = true;
}


const nextConfig = nextConfigFile ? readFileSync(path.join(process.cwd(), nextConfigFile), "utf8") : "";
if (!nextConfig.includes('bodySizeLimit: "12mb"')) {
  console.error(`${nextConfigFile || "next.config"} should allow server action uploads up to 12mb so 10mb document uploads are not rejected early.`);
  failed = true;
}

const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
for (const requiredSchemaText of ["generatedFromScheduleId", "generatedForPeriod", "@@unique([generatedFromScheduleId, generatedForPeriod])"]) {
  if (!schema.includes(requiredSchemaText)) {
    console.error(`Prisma schema is missing recurring-charge hardening field/index: ${requiredSchemaText}`);
    failed = true;
  }
}

const storageProvider = (process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")).toLowerCase();
if (!["database", "local", "s3"].includes(storageProvider)) {
  console.error("DOCUMENT_STORAGE_PROVIDER must be database, local, or s3.");
  failed = true;
}

if (process.env.NODE_ENV === "production" && storageProvider === "local") {
  console.error("DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel/serverless deployments. Use s3 for production.");
  failed = true;
}

if (process.env.NODE_ENV === "production" && storageProvider === "database") {
  console.error("DOCUMENT_STORAGE_PROVIDER=database stores document bytes in Postgres. Use s3 for production scale.");
  failed = true;
}

if (storageProvider === "s3") {
  for (const key of ["DOCUMENT_S3_BUCKET", "DOCUMENT_S3_REGION", "DOCUMENT_S3_ACCESS_KEY_ID", "DOCUMENT_S3_SECRET_ACCESS_KEY"]) {
    if (!process.env[key]) {
      console.error(`${key} is required when DOCUMENT_STORAGE_PROVIDER=s3.`);
      failed = true;
    }
  }
}

if (storageProvider === "local") {
  const uploadDir = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "documents");
  try {
    mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    console.error(`Unable to create or access document upload directory: ${uploadDir}`);
    console.error(error);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("HomeBase MLS preflight passed: required files, pinned packages, upload limits, recurring-charge safeguards, verification scripts, and document storage configuration are ready.");
