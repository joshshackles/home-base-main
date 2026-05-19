import { spawnSync } from "child_process";

const knownFailedMigrations = ["20260518000100_financial_automation_recovery"];

const hasDatabaseUrl =
  Boolean(process.env.DATABASE_URL) ||
  Boolean(process.env.POSTGRES_PRISMA_URL) ||
  Boolean(process.env.POSTGRES_URL) ||
  Boolean(process.env.NEON_DATABASE_URL);

if (!hasDatabaseUrl) {
  console.log("Vercel migration recovery skipped: no database URL is configured.");
  process.exit(0);
}

if (process.env.VERCEL_MIGRATION_RECOVERY === "0") {
  console.log("Vercel migration recovery skipped: VERCEL_MIGRATION_RECOVERY=0.");
  process.exit(0);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";

for (const migration of knownFailedMigrations) {
  const result = spawnSync(command, ["prisma", "migrate", "resolve", "--rolled-back", migration], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    stdio: "pipe",
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const harmless =
    /P3008|P3012/i.test(output) ||
    /not in a failed state/i.test(output) ||
    /could not be found/i.test(output) ||
    /not found in the migration history/i.test(output) ||
    /does not exist/i.test(output) ||
    /already (?:applied|rolled back|resolved)/i.test(output);

  if (result.status === 0) {
    console.log(`Vercel migration recovery: marked ${migration} as rolled back.`);
    continue;
  }

  if (harmless) {
    console.log(`Vercel migration recovery: ${migration} did not need recovery.`);
    continue;
  }

  console.error(`Vercel migration recovery failed for ${migration}.`);
  console.error(output.trim());
  process.exit(result.status || 1);
}

