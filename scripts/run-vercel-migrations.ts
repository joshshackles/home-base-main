import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

const root = process.cwd();
const migrationsDir = path.join(root, "prisma", "migrations");
const squashedBaselineMigration = "20260518000000_squashed_operational_foundation";
let prisma: any;

function log(message: string) {
  console.log(`[vercel:migrate] ${message}`);
}

function fail(message: string): never {
  console.error(`[vercel:migrate] ${message}`);
  process.exit(1);
}

function runPrisma(args: string[]) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  log(`Running prisma ${args.join(" ")}`);
  execFileSync(command, ["prisma", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit"
  });
}

function shouldRunMigrations() {
  if (process.env.VERCEL_SKIP_MIGRATIONS === "1") return false;
  if (process.env.VERCEL_RUN_MIGRATIONS === "1") return true;
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") return true;
  return false;
}

function migrationNames() {
  return readdirSync(migrationsDir)
    .filter((entry) => entry !== "migration_lock.toml")
    .sort();
}

async function tableExists(tableName: string) {
  const rows = (await prisma.$queryRawUnsafe(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
    tableName
  )) as Array<{ exists: boolean }>;
  return Boolean(rows[0]?.exists);
}

async function existingApplicationObjectCount() {
  const rows = (await prisma.$queryRawUnsafe(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'"
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}

async function successfulMigrationNames() {
  const exists = await tableExists("_prisma_migrations");
  if (!exists) return new Set<string>();

  const rows = (await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at ASC'
  )) as Array<{ migration_name: string }>;
  return new Set(rows.map((row) => row.migration_name));
}

async function failedMigrationNames() {
  const exists = await tableExists("_prisma_migrations");
  if (!exists) return new Set<string>();

  const rows = (await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at ASC'
  )) as Array<{ migration_name: string }>;
  return new Set(rows.map((row) => row.migration_name));
}

async function markCurrentMigrationsApplied(successful: Set<string>) {
  for (const migrationName of migrationNames()) {
    if (successful.has(migrationName)) continue;
    runPrisma(["migrate", "resolve", "--applied", migrationName]);
  }
}

async function baselineExistingDatabase(reason: string, successful: Set<string>) {
  log(reason);
  log("Synchronizing the existing Neon database to the current Prisma schema with prisma db push --skip-generate.");
  runPrisma(["db", "push", "--skip-generate"]);
  log("Marking current migration files as applied so future production deployments can use prisma migrate deploy.");
  await markCurrentMigrationsApplied(successful);
  log("Existing database baseline completed.");
}

async function main() {
  if (!shouldRunMigrations()) {
    log("Skipping automatic migrations. They run by default only on Vercel production deployments. Set VERCEL_RUN_MIGRATIONS=1 to force them, or VERCEL_SKIP_MIGRATIONS=1 to skip them.");
    return;
  }

  if (!process.env.DATABASE_URL) fail("DATABASE_URL is required before migrations can run.");
  if (!process.env.DIRECT_URL) fail("DIRECT_URL is required before migrations can run safely against Neon. Use the direct Neon connection string, not the pooled app string.");

  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();

  const appObjectCount = await existingApplicationObjectCount();
  const successful = await successfulMigrationNames();
  const failed = await failedMigrationNames();
  const hasSuccessfulBaseline = successful.has(squashedBaselineMigration);
  const hasFailedBaseline = failed.has(squashedBaselineMigration);

  if (appObjectCount > 0 && (!hasSuccessfulBaseline || hasFailedBaseline)) {
    await baselineExistingDatabase(
      hasFailedBaseline
        ? `The squashed baseline migration previously failed on this existing database. It will be reconciled and marked applied before continuing.`
        : `Existing application tables were found, but the squashed baseline migration is not recorded as successfully applied.`,
      successful
    );
    return;
  }

  if (appObjectCount > 0 && failed.size > 0) {
    await baselineExistingDatabase(
      `Unresolved failed Prisma migrations were found (${Array.from(failed).join(", ")}). The existing database will be reconciled to the current schema and the current migrations marked applied.`,
      successful
    );
    return;
  }

  runPrisma(["migrate", "deploy"]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
