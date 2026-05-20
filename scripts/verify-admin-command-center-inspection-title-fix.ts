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
    throw new Error(`${path} is missing admin command-center inspection-title fix markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length) {
    throw new Error(`${path} still contains unsafe inspection title markers:\n${found.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/lib/admin/command-center.ts", [
  "function inspectionRecordTitle",
  "Inspection by",
  "inspectionRecordTitle(inspection)",
]);

assertExcludes("src/lib/admin/command-center.ts", [
  "inspection.title",
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.3\"",
  "\"admin-command-center-inspection-title-fix:verify\"",
  "admin-command-center-null-date-fix:verify && npm run admin-command-center-inspection-title-fix:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.59.3\""]);
assertIncludes("src/lib/app-version.ts", ["4.59.3"]);
assertIncludes("README.md", ["Current package version: **4.59.3**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.3 - Admin Command Center Inspection Title Fix"]);

console.log("Admin command center inspection-title fix verification passed.");
