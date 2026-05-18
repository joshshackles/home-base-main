import { hasDatabaseUrl } from "@/lib/database-env";

const unsafeSecrets = new Set(["", "dev-only-change-this-secret-before-deployment", "change-me", "changeme", "replace-this-with-a-long-random-secret", "replace-with-a-long-random-secret", "replace-with-at-least-32-random-characters"]);

export function getDocumentStorageProvider() {
  return (process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")).toLowerCase();
}

export function getRequiredAuthSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (unsafeSecrets.has(secret) || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a unique random value of at least 32 characters.");
  }
  return secret;
}

export function getEnvironmentWarnings() {
  const warnings: string[] = [];

  if (!hasDatabaseUrl()) warnings.push("DATABASE_URL is not set. Add DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or NEON_DATABASE_URL.");
  if (!process.env.AUTH_SECRET) warnings.push("AUTH_SECRET is not set.");
  if (unsafeSecrets.has(process.env.AUTH_SECRET || "") || (process.env.AUTH_SECRET || "").length < 32) warnings.push("AUTH_SECRET is missing, too short, or using a development placeholder.");
  const storageProvider = getDocumentStorageProvider();
  if (!["database", "local", "s3"].includes(storageProvider)) warnings.push("DOCUMENT_STORAGE_PROVIDER must be database, local, or s3.");
  if (storageProvider === "local" && !process.env.DOCUMENT_UPLOAD_DIR) warnings.push("DOCUMENT_UPLOAD_DIR is not set; local storage/documents will be used.");
  if (process.env.NODE_ENV === "production" && storageProvider === "local") warnings.push("DOCUMENT_STORAGE_PROVIDER=local is not durable on Vercel/serverless deployments.");
  if (process.env.NODE_ENV === "production" && storageProvider === "database") warnings.push("DOCUMENT_STORAGE_PROVIDER=database stores uploaded bytes in Postgres; use s3-compatible object storage for production scale.");
  if (storageProvider === "s3") {
    for (const key of ["DOCUMENT_S3_BUCKET", "DOCUMENT_S3_REGION", "DOCUMENT_S3_ACCESS_KEY_ID", "DOCUMENT_S3_SECRET_ACCESS_KEY"]) {
      if (!process.env[key]) warnings.push(`${key} is required when DOCUMENT_STORAGE_PROVIDER=s3.`);
    }
  }
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) warnings.push("APP_URL is required in production so reset/signature links do not point to localhost.");
  if (process.env.NODE_ENV === "production" && process.env.APP_URL && /^http:\/\//i.test(process.env.APP_URL)) warnings.push("APP_URL must use HTTPS in production.");
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  if (!["disabled", "console", "resend", "webhook"].includes(provider)) warnings.push("EMAIL_PROVIDER must be disabled, console, resend, or webhook.");
  if (process.env.NODE_ENV === "production" && provider === "console") warnings.push("EMAIL_PROVIDER is console in production; real email will only print to logs.");
  if (process.env.NODE_ENV === "production" && provider !== "disabled" && !process.env.CRON_SECRET) warnings.push("CRON_SECRET should be set to protect /api/cron/send-queued-email.");
  if (provider === "resend" && !process.env.RESEND_API_KEY) warnings.push("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
  if (provider === "webhook" && !process.env.EMAIL_WEBHOOK_URL) warnings.push("EMAIL_WEBHOOK_URL is required when EMAIL_PROVIDER=webhook.");
  if (provider !== "disabled" && !process.env.EMAIL_FROM) warnings.push("EMAIL_FROM is not set; a development sender address will be used.");

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_WEBHOOK_SECRET should be set when Stripe payments are enabled.");
  if (process.env.STRIPE_SECRET_KEY && !process.env.APP_URL) warnings.push("APP_URL is required for Stripe Connect return URLs and checkout redirects.");
  const emailMaxAttempts = Number.parseInt(process.env.EMAIL_MAX_ATTEMPTS || "5", 10);
  if (!Number.isFinite(emailMaxAttempts) || emailMaxAttempts < 1) warnings.push("EMAIL_MAX_ATTEMPTS must be a positive number.");
  const emailBatchSize = Number.parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || "50", 10);
  if (!Number.isFinite(emailBatchSize) || emailBatchSize < 1 || emailBatchSize > 200) warnings.push("EMAIL_QUEUE_BATCH_SIZE must be between 1 and 200.");

  return warnings;
}

export function assertProductionReadyEnvironment() {
  const warnings = getEnvironmentWarnings();
  if (process.env.NODE_ENV === "production" && warnings.length > 0) {
    throw new Error(`Production environment is not ready: ${warnings.join(" ")}`);
  }
  getRequiredAuthSecret();
}
