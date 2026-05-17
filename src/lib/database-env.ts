const pooledDatabaseUrlKeys = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "NEON_DATABASE_URL"];
const directDatabaseUrlKeys = ["DIRECT_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NON_POOLING_DIRECT", "NEON_DIRECT_URL"];

function firstSetEnv(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value;
  }
  return "";
}

export function normalizeDatabaseEnv() {
  if (!process.env.DATABASE_URL) {
    const databaseUrl = firstSetEnv(pooledDatabaseUrlKeys);
    if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  }

  if (!process.env.DIRECT_URL) {
    const directUrl = firstSetEnv(directDatabaseUrlKeys) || process.env.DATABASE_URL || "";
    if (directUrl) process.env.DIRECT_URL = directUrl;
  }
}

export function hasDatabaseUrl() {
  normalizeDatabaseEnv();
  return Boolean(process.env.DATABASE_URL);
}

export function databaseUrlHelpText() {
  return `DATABASE_URL is not set. In Vercel Project Settings, add DATABASE_URL from Neon, or connect Neon/Vercel Postgres so POSTGRES_PRISMA_URL or POSTGRES_URL is available.`;
}
