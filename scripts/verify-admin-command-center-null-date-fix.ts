import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) {
    throw new Error(`${path} is missing admin command-center null-date fix markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length) {
    throw new Error(`${path} still contains unsafe nullable date markers:\n${found.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/lib/admin/command-center.ts", [
  "function formatAdminDate(value: Date | null | undefined",
  "formatAdminDate(thread.lastMessageAt, \"not recorded\")",
]);

assertExcludes("src/lib/admin/command-center.ts", [
  "thread.lastMessageAt.toLocaleDateString()",
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.5\"",
  "\"admin-command-center-null-date-fix:verify\"",
  "landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.59.5\""]);
assertIncludes("src/lib/app-version.ts", ["4.59.5"]);
assertIncludes("README.md", ["Current package version: **4.59.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.5 - Maintenance Priority Enum Fix"]);

console.log("Admin command center null-date fix verification passed.");
