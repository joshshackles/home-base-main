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
    throw new Error(`${path} is missing lead authorization relation fix markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length) {
    throw new Error(`${path} still contains unsafe lead authorization markers:\n${found.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/lib/authorization.ts", [
  "application: { select: { id: true } }",
  "lead.application?.id",
  "canAccessApplication(user, lead.application.id)",
]);

assertExcludes("src/lib/authorization.ts", ["lead.applicationId"]);

assertIncludes("prisma/schema.prisma", [
  "application Application?",
  "leadId          String?           @unique",
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.0\"",
  "\"lead-authorization-relation-fix:verify\"",
  "admin-command-center-inspection-title-fix:verify && npm run lead-authorization-relation-fix:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.61.0\""]);
assertIncludes("src/lib/app-version.ts", ["4.61.0"]);
assertIncludes("README.md", ["Current package version: **4.61.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.0 - Homepage Slider Marketplace Refresh"]);

console.log("Lead authorization relation fix verification passed.");
