import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing authorization runtime test markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

if (!existsSync(join(root, "tests/unit/authorization.test.ts"))) {
  throw new Error("tests/unit/authorization.test.ts is missing.");
}

assertIncludes("tests/unit/authorization.test.ts", [
  "blocks a landlord from opening another landlord's application by guessed ID",
  "blocks applicants from opening another applicant's application by guessed ID",
  "does not let message threads bypass linked application permissions",
  "returns null for a guessed document",
  "logs denied assertions",
  "honors approved property manager access requests",
  "requires role-specific active profile connections",
  "allows a property manager to access only the owner portfolio they are connected to",
  "lets connected caseworkers support housing records without granting ledger access",
  "does not let inspector approval open unrelated inspections",
  "vi.mock(\"@/lib/prisma\"",
  "vi.mock(\"@/lib/audit\""
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.2\"",
  "\"authorization:runtime:test\"",
  "\"authorization-runtime:verify\"",
  "\"expanded-access:verify\"",
  "\"test\": \"vitest run\""
]);

assertIncludes("docs/PERMISSION_MATRIX_GUESSED_ID_TESTS.md", [
  "Runtime Coverage Added In v4.48.0",
  "tests/unit/authorization.test.ts",
  "central authorization helpers"
]);

assertIncludes("src/lib/app-version.ts", ["4.61.2"]);
assertIncludes("README.md", ["Current package version: **4.61.2**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.2 - Admin Branding Slide Search Param Fix"]);

console.log("Authorization runtime regression test verification passed.");
