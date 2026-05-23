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
    throw new Error(`${path} is missing maintenance priority enum fix markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length) {
    throw new Error(`${path} still contains unsafe maintenance priority markers:\n${found.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("prisma/schema.prisma", ["enum MaintenancePriority", "URGENT"]);
assertIncludes("src/lib/messaging/unified-landlord-inbox.ts", [
  "MaintenancePriority.URGENT",
  "return \"urgent\"",
]);
assertExcludes("src/lib/messaging/unified-landlord-inbox.ts", ["MaintenancePriority.EMERGENCY"]);

assertIncludes("package.json", [
  "\"version\": \"4.61.5\"",
  "\"maintenance-priority-enum-fix:verify\"",
  "lead-authorization-relation-fix:verify && npm run maintenance-priority-enum-fix:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.61.5\""]);
assertIncludes("src/lib/app-version.ts", ["4.61.5"]);
assertIncludes("README.md", ["Current package version: **4.61.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.5 - Version Consistency Metadata Cleanup"]);

console.log("Maintenance priority enum fix verification passed.");
