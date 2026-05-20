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
    throw new Error(`${path} is missing landlord units typecheck markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const found = markers.filter((marker) => source.includes(marker));
  if (found.length) {
    throw new Error(`${path} still contains unsafe landlord units markers:\n${found.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/app/landlord/units/page.tsx", [
  "Prisma, RentalMarketingStatus, UnitStatus",
  "const unitWhere: Prisma.UnitWhereInput",
  "NOT: { status: UnitStatus.ARCHIVED }",
  "unit.status === UnitStatus.AVAILABLE",
]);

assertExcludes("src/app/landlord/units/page.tsx", [
  "NOT: { status: \"ARCHIVED\" }",
  "unit.status === \"AVAILABLE\"",
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.5\"",
  "\"landlord-units-typecheck-fix:verify\"",
  "final-readiness:verify && npm run landlord-units-typecheck-fix:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.59.5\""]);
assertIncludes("src/lib/app-version.ts", ["4.59.5"]);
assertIncludes("README.md", ["Current package version: **4.59.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.5 - Maintenance Priority Enum Fix"]);

console.log("Landlord units typecheck fix verification passed.");
