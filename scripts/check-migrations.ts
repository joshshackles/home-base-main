import { existsSync, readFileSync, readdirSync } from "fs";
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

const sortedMigrations = [...migrations].sort();
const legacyCompatibilityMigration = "20260518000100_financial_automation_recovery";
if (migrations.includes(legacyCompatibilityMigration)) {
  console.error("Clean-install packages must not ship legacy no-op migration recovery folders.");
  process.exit(1);
}

const rentalPaymentMigration = sortedMigrations.find((migration) => migration.includes("rental_payment_operations"));
const financialAutomationMigration = sortedMigrations.find((migration) => migration === "20260518004100_financial_automation_recovery");
if (rentalPaymentMigration && financialAutomationMigration && sortedMigrations.indexOf(financialAutomationMigration) < sortedMigrations.indexOf(rentalPaymentMigration)) {
  console.error("Migration order is invalid: financial automation depends on rental payment operations.");
  process.exit(1);
}

if (financialAutomationMigration) {
  const sqlPath = path.join(migrationsDir, financialAutomationMigration, "migration.sql");
  const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf8") : "";
  if (!sql.includes("WHEN duplicate_object THEN NULL")) {
    console.error("Financial automation recovery migration must guard enum creation for Vercel retry safety.");
    process.exit(1);
  }
}

console.log(`Migration check passed: ${migrations.length} migration folder(s) found.`);
