import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
const root = process.cwd();
const migrationsDir = path.join(root, "prisma", "migrations");
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
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
    tableName
  );
  return Boolean(rows[0]?.exists);
}

async function existingApplicationTableCount() {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'"
  );
  return Number(rows[0]?.count ?? 0);
}

async function appliedMigrationNames() {
  const exists = await tableExists("_prisma_migrations");
  if (!exists) return new Set<string>();

  const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
    'SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY started_at ASC'
  );
  return new Set(rows.map((row) => row.migration_name));
}

async function markAllCurrentMigrationsApplied(applied: Set<string>) {
  for (const migrationName of migrationNames()) {
    if (applied.has(migrationName)) continue;
    runPrisma(["migrate", "resolve", "--applied", migrationName]);
  }
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

  const appTableCount = await existingApplicationTableCount();
  const applied = await appliedMigrationNames();

  if (appTableCount > 0 && applied.size === 0) {
    log("Existing application tables were found, but Prisma has no migration history recorded.");
    log("Synchronizing the existing Neon database to the current Prisma schema, then baselining current migrations as applied.");
    runPrisma(["db", "push", "--skip-generate"]);
    await markAllCurrentMigrationsApplied(applied);
    log("Existing database baseline completed. Future production deployments will use prisma migrate deploy.");
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
