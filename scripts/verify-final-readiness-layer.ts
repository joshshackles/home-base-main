import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) {
    throw new Error(`${path} is missing final readiness markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/FINAL_READINESS_LAYER.md");
assertExists("docs/PRODUCTION_RUNBOOK.md");

assertIncludes("src/components/ui/system/index.tsx", [
  "export function LoadingState",
  "export function ErrorState",
  "aria-live=\"polite\"",
  "aria-busy=\"true\"",
  "role=\"alert\"",
  "aria-current={tab.active ? \"page\" : undefined}",
  "focus-visible:outline",
  "Status:",
]);

assertIncludes("prisma/seed.ts", [
  "assertSeedSafety",
  "ALLOW_SAMPLE_DATA_IN_PRODUCTION",
  "Refusing to seed sample data in production",
]);

assertIncludes("src/app/admin/system/page.tsx", [
  "Sample data guard",
  "Production seeding is blocked unless ALLOW_SAMPLE_DATA_IN_PRODUCTION=true",
  "Workflow proof",
  "Production runbook",
  "npm run final-readiness:verify",
]);

assertIncludes("docs/PRODUCTION_RUNBOOK.md", [
  "Pre-Deployment",
  "Seed And Sample Data Safety",
  "Rollback",
  "Incident Response",
  "Backup And Recovery",
  "Final Browser QA",
  "Performance And Index Review",
  "ALLOW_SAMPLE_DATA_IN_PRODUCTION=true",
]);

assertIncludes("docs/FINAL_READINESS_LAYER.md", [
  "Accessibility",
  "Loading And Error States",
  "Seed And Sample Safety",
  "Production Runbook",
  "Performance And Index Review",
  "Final Browser QA",
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.4\"",
  "\"final-readiness:verify\"",
  "field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.61.4\""]);
assertIncludes("src/lib/app-version.ts", ["4.61.4"]);
assertIncludes("README.md", ["Current package version: **4.61.4**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.4 - Homepage Reference Fidelity Pass"]);

console.log("Final readiness layer verification passed.");
