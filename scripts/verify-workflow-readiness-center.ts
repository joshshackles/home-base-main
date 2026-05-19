import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertIncludes(path: string, marker: string) {
  const source = read(path);
  if (!source.includes(marker)) {
    throw new Error(`${path} is missing required workflow readiness marker: ${marker}`);
  }
}

const packageJson = JSON.parse(read("package.json")) as {
  version?: string;
  scripts?: Record<string, string>;
};

if (!packageJson.version) {
  throw new Error("package.json is missing a release version");
}

if (!packageJson.scripts?.["workflow-readiness:verify"]) {
  throw new Error("package.json is missing workflow-readiness:verify");
}

if (!packageJson.scripts.verify?.includes("workflow-readiness:verify")) {
  throw new Error("npm run verify must include workflow-readiness:verify");
}

for (const marker of [
  "public-discovery",
  "applicant-packet",
  "landlord-rental-ops",
  "tenant-maintenance",
  "messaging",
  "lease-signature",
  "financial-operations",
  "admin-governance",
  "vendor-maintenance-ecosystem",
  "mobile-field-work",
  "getWorkflowReadinessSummary"
]) {
  assertIncludes("src/lib/workflow-readiness.ts", marker);
}

for (const marker of [
  "Platform workflow readiness center",
  "Recommended sequence",
  "Maturity legend",
  "workflowReadinessItems",
  "summary.nextUpdates"
]) {
  assertIncludes("src/app/admin/workflows/page.tsx", marker);
}

assertIncludes("src/app/admin/layout.tsx", "/admin/workflows");
assertIncludes("src/app/admin/operations/page.tsx", "/admin/workflows");
assertIncludes("tests/e2e/workflow-matrix.spec.ts", "/admin/workflows");
assertIncludes("docs/WORKFLOW_READINESS_CENTER.md", "Workflow Readiness Center");
assertIncludes("README.md", "WORKFLOW_READINESS_CENTER.md");
assertIncludes("CHANGELOG.md", "v4.19.0 - Workflow Readiness Center");

console.log("Workflow readiness center verification passed.");
