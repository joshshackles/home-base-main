import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();
let failed = false;

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`Operational coherence check failed: ${message}`);
  failed = true;
}

function assertFile(relativePath: string) {
  if (!existsSync(path.join(root, relativePath))) fail(`${relativePath} is missing.`);
}

function assertContains(relativePath: string, needles: string[]) {
  const source = read(relativePath);
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${relativePath} is missing ${needle}.`);
  }
}

function assertNotContains(relativePath: string, needles: string[]) {
  const source = read(relativePath);
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${relativePath} still contains ${needle}.`);
  }
}

assertFile("src/lib/dashboard/coherence.ts");
assertContains("src/lib/dashboard/coherence.ts", [
  "CoherenceSummary",
  "buildDashboardCoherence",
  "What needs action right now?",
  "Where is the source of truth?",
  "What changed since last time?"
]);

assertContains("src/components/dashboard/WorkhorseDashboard.tsx", [
  "buildDashboardCoherence",
  "Operating cockpit",
  "Every dashboard answers the same questions",
  "Next best action",
  "operationalCoherence.areas.map"
]);

assertContains("src/components/messaging/TextingInbox.tsx", [
  "workspaceFromBasePath",
  "workflowHrefForThread",
  "recordHrefForThread",
  "Rental record",
  "ContextLink thread={activeThread} basePath={basePath}"
]);

assertNotContains("src/components/messaging/TextingInbox.tsx", [
  "href=\"/landlord/maintenance\"",
  "href=\"/landlord/applications\"",
  "\u00E2",
  "\u00C2",
  "\u00C3",
  "\uFFFD"
]);

const packageJson = JSON.parse(read("package.json"));
if (!packageJson.scripts?.["operational-coherence:verify"]) {
  fail("package.json is missing operational-coherence:verify.");
}
if (!packageJson.scripts?.["vercel-build"]?.includes("operational-coherence:verify")) {
  fail("vercel-build must run operational-coherence:verify.");
}
if (!packageJson.scripts?.verify?.includes("operational-coherence:verify")) {
  fail("verify must run operational-coherence:verify.");
}

if (failed) process.exit(1);
console.log("Operational coherence check passed: dashboard cockpit, shared coherence DTOs, and workspace-aware inbox links are wired.");
