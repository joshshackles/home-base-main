const unsafeSecrets = new Set(["", "dev-only-change-this-secret-before-deployment", "change-me", "changeme"]);

export function getEnvironmentWarnings() {
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) warnings.push("DATABASE_URL is not set.");
  if (!process.env.AUTH_SECRET) warnings.push("AUTH_SECRET is not set.");
  if (unsafeSecrets.has(process.env.AUTH_SECRET || "")) warnings.push("AUTH_SECRET is using a development placeholder.");
  if (!process.env.DOCUMENT_UPLOAD_DIR) warnings.push("DOCUMENT_UPLOAD_DIR is not set; local storage/documents will be used.");
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) warnings.push("APP_URL should be set in production.");
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  if (!["disabled", "console", "resend", "webhook"].includes(provider)) warnings.push("EMAIL_PROVIDER must be disabled, console, resend, or webhook.");
  if (process.env.NODE_ENV === "production" && provider === "console") warnings.push("EMAIL_PROVIDER is console in production; real email will only print to logs.");
  if (provider === "resend" && !process.env.RESEND_API_KEY) warnings.push("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
  if (provider === "webhook" && !process.env.EMAIL_WEBHOOK_URL) warnings.push("EMAIL_WEBHOOK_URL is required when EMAIL_PROVIDER=webhook.");
  if (provider !== "disabled" && !process.env.EMAIL_FROM) warnings.push("EMAIL_FROM is not set; a development sender address will be used.");

  return warnings;
}

export function assertProductionReadyEnvironment() {
  const warnings = getEnvironmentWarnings();
  if (process.env.NODE_ENV === "production" && warnings.length > 0) {
    throw new Error(`Production environment is not ready: ${warnings.join(" ")}`);
  }
}
