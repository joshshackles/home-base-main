import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const forbiddenExact = new Set([
  "tsconfig.tsbuildinfo",
  "package-lock.json.tmp",
]);

const forbiddenDirs = new Set([
  ".next",
  "node_modules",
  ".vercel",
  "coverage",
  ".turbo",
  "dist",
  "build",
  "out",
  ".vitest",
  "playwright-report",
  "test-results",
]);

const forbiddenSuffixes = [
  ".tsbuildinfo",
  ".log",
  ".tmp",
];

const allowedEnvFiles = new Set([".env.example"]);
const maxRecommendedFileBytes = 1_000_000;
const findings = [];
const largeFiles = [];

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/") || ".";
}

function scan(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const relative = rel(full);
    const stats = statSync(full);

    if (stats.isDirectory()) {
      if (forbiddenDirs.has(name)) {
        findings.push(`Forbidden generated/cache directory found: ${relative}/`);
        continue;
      }
      scan(full);
      continue;
    }

    if (forbiddenExact.has(name)) {
      findings.push(`Forbidden generated/cache file found: ${relative}`);
    }

    if (name.startsWith(".env") && !allowedEnvFiles.has(name)) {
      findings.push(`Local environment file should not be packaged: ${relative}`);
    }

    if (forbiddenSuffixes.some((suffix) => name.endsWith(suffix))) {
      findings.push(`Generated/log/temp file should not be packaged: ${relative}`);
    }

    if (stats.size > maxRecommendedFileBytes) {
      largeFiles.push(`${relative} (${Math.round(stats.size / 1024)} KB)`);
    }
  }
}

scan(root);

const gitignorePath = path.join(root, ".gitignore");
if (!existsSync(gitignorePath)) {
  findings.push("Missing .gitignore.");
} else {
  const gitignore = readFileSync(gitignorePath, "utf8");
  for (const requiredPattern of ["*.tsbuildinfo", ".next/", "node_modules/", ".env", "storage/"]) {
    if (!gitignore.includes(requiredPattern)) {
      findings.push(`.gitignore is missing required pattern: ${requiredPattern}`);
    }
  }
}

if (largeFiles.length) {
  console.warn("Package cleanliness warning: large source-controlled files found:");
  for (const file of largeFiles) console.warn(`- ${file}`);
  console.warn("These may be valid source files, but review them before shipping if package size grows.");
}

if (findings.length) {
  console.error("Package cleanliness check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Package cleanliness check passed: no generated build caches, dependency folders, local env files, logs, or TypeScript incremental caches are packaged.");
