import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";

const requiredFiles = [
  "package.json",
  "next.config.ts",
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

const requiredEnv = ["DATABASE_URL", "AUTH_SECRET"];
const unsafeSecrets = new Set(["", "dev-only-change-this-secret-before-deployment", "change-me", "changeme", "replace-with-a-long-random-secret"]);
let failed = false;

for (const file of requiredFiles) {
  if (!existsSync(path.join(process.cwd(), file))) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
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

if (unsafeSecrets.has(process.env.AUTH_SECRET || "")) {
  console.warn("Environment warning: AUTH_SECRET appears to be a development placeholder.");
}


const nextConfig = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
if (!nextConfig.includes('bodySizeLimit: "12mb"')) {
  console.error('next.config.ts should allow server action uploads up to 12mb so 10mb document uploads are not rejected early.');
  failed = true;
}

const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
for (const requiredSchemaText of ["generatedFromScheduleId", "generatedForPeriod", "@@unique([generatedFromScheduleId, generatedForPeriod])"]) {
  if (!schema.includes(requiredSchemaText)) {
    console.error(`Prisma schema is missing recurring-charge hardening field/index: ${requiredSchemaText}`);
    failed = true;
  }
}

const uploadDir = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "documents");
try {
  mkdirSync(uploadDir, { recursive: true });
} catch (error) {
  console.error(`Unable to create or access document upload directory: ${uploadDir}`);
  console.error(error);
  failed = true;
}

if (failed) process.exit(1);
console.log("HomeBase MLS preflight passed: required files, pinned packages, upload limits, recurring-charge safeguards, verification scripts, and local storage are ready.");
