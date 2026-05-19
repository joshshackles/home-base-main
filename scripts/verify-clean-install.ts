import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const root = process.cwd();
let failed = false;

function fail(message: string) {
  console.error(`Clean install check failed: ${message}`);
  failed = true;
}

function walk(dir: string, predicate: (filePath: string) => boolean, results: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (!["node_modules", ".next", ".vercel", "coverage"].includes(entry)) walk(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

const packagePath = path.join(root, "package.json");
const readmePath = path.join(root, "README.md");
const changelogPath = path.join(root, "CHANGELOG.md");
const appVersionPath = path.join(root, "src", "lib", "app-version.ts");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const readme = readFileSync(readmePath, "utf8");
const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8") : "";
const appVersionSource = existsSync(appVersionPath) ? readFileSync(appVersionPath, "utf8") : "";
const readmeVersion = /Current package version:\s+\*\*([^*]+)\*\*/.exec(readme)?.[1];
const appVersion = /APP_VERSION\s*=\s*"([^"]+)"/.exec(appVersionSource)?.[1];

if (readmeVersion !== packageJson.version) {
  fail(`README version ${readmeVersion || "missing"} does not match package.json version ${packageJson.version}.`);
}

if (appVersion !== packageJson.version) {
  fail(`src/lib/app-version.ts version ${appVersion || "missing"} does not match package.json version ${packageJson.version}.`);
}

if (!changelog.includes(`v${packageJson.version}`)) {
  fail(`CHANGELOG.md is missing a v${packageJson.version} entry.`);
}

const scripts = packageJson.scripts || {};
if (scripts["vercel:migration-recovery"] || scripts["vercel-build"]?.includes("vercel:migration-recovery")) {
  fail("Legacy migration recovery must not be part of a clean-install build.");
}

if (existsSync(path.join(root, "scripts", "resolve-vercel-migrations.ts"))) {
  fail("Legacy scripts/resolve-vercel-migrations.ts should not ship in a clean-install package.");
}

if (existsSync(path.join(root, "prisma", "migrations", "20260518000100_financial_automation_recovery"))) {
  fail("Legacy no-op financial automation recovery migration should not ship in a clean-install package.");
}

const migrationsDir = path.join(root, "prisma", "migrations");
const migrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((entry) => entry !== "migration_lock.toml").sort()
  : [];
if (migrations[0] !== "20260518000000_squashed_operational_foundation") {
  fail("Clean-install packages must start with the squashed operational foundation migration.");
}
const preBaselineMigrations = migrations.filter((entry) => entry < "20260518000000_squashed_operational_foundation");
if (preBaselineMigrations.length > 0) {
  fail(`Clean-install packages must not ship pre-baseline development migrations: ${preBaselineMigrations.join(", ")}.`);
}

const pageFiles = walk(path.join(root, "src", "app"), (filePath) => filePath.endsWith("page.tsx"));
for (const filePath of pageFiles) {
  const source = readFileSync(filePath, "utf8");
  const readsRequestOrDatabaseState =
    source.includes("prisma.") ||
    source.includes("requireRole(") ||
    source.includes("requireUser(") ||
    source.includes("getCurrentUser(") ||
    source.includes("cookies(") ||
    source.includes("headers(");

  if (readsRequestOrDatabaseState && !source.includes('export const dynamic = "force-dynamic"')) {
    fail(`${path.relative(root, filePath)} reads request/database state but does not opt into force-dynamic rendering.`);
  }
}

const textFiles = walk(root, (filePath) => /\.(ts|tsx|md|mjs|json|css|prisma|sql)$/.test(filePath));
const mojibakePattern = /[\u00C2\u00C3\uFFFD]|\u00E2\u20AC/;
for (const filePath of textFiles) {
  const source = readFileSync(filePath, "utf8");
  if (mojibakePattern.test(source)) {
    fail(`${path.relative(root, filePath)} contains likely mojibake or replacement characters.`);
  }
}

if (failed) process.exit(1);
console.log("Clean install check passed: release metadata, dynamic DB pages, migration shape, and text encoding are clean.");
