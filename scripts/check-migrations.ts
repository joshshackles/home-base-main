import { existsSync, readdirSync } from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
if (!existsSync(migrationsDir)) {
  console.error("Missing prisma/migrations directory.");
  process.exit(1);
}

const migrations = readdirSync(migrationsDir).filter((entry) => entry !== "migration_lock.toml");
if (migrations.length === 0) {
  console.error("No Prisma migration folders found.");
  process.exit(1);
}

for (const migration of migrations) {
  const sqlPath = path.join(migrationsDir, migration, "migration.sql");
  if (!existsSync(sqlPath)) {
    console.error(`Migration ${migration} is missing migration.sql.`);
    process.exit(1);
  }
}

console.log(`Migration check passed: ${migrations.length} migration folder(s) found.`);
