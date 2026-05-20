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
    throw new Error(`${path} is missing field workflow proof / launch hardening markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/FIELD_WORKFLOW_PROOF_LAUNCH_HARDENING.md");

assertIncludes("src/lib/workflow-proof.ts", [
  "buildFieldWorkflowProofModel",
  "FieldWorkflowProofModel",
  "repairChain",
  "inspectionChain",
  "launchHardening",
  "tenant-request",
  "landlord-review",
  "vendor-assignment",
  "vendor-acceptance",
  "field-update",
  "estimate-invoice",
  "completion",
  "inspection-assignment",
  "inspection-report",
  "failed-inspection",
  "reinspection",
  "MaintenanceRequestStatus",
  "VendorInvoiceStatus",
  "VendorWorkLogStatus",
]);

assertIncludes("src/app/admin/workflow-proof/page.tsx", [
  "ProofTimeline",
  "Repair field chain",
  "Inspection chain",
  "Launch hardening",
  "Operational field workflow proof",
  "estimate / invoice",
  "buildFieldWorkflowProofModel",
]);

assertIncludes("docs/FIELD_WORKFLOW_PROOF_LAUNCH_HARDENING.md", [
  "Tenant request",
  "Landlord review",
  "Vendor assignment",
  "Field update",
  "Estimate / invoice",
  "Completion and payout readiness",
  "Inspection assignment",
  "Inspection report",
  "Reinspection",
  "Launch Hardening",
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.2\"",
  "\"field-workflow-proof-launch-hardening:verify\"",
  "canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify",
]);
assertIncludes("package-lock.json", ["\"version\": \"4.61.2\""]);
assertIncludes("src/lib/app-version.ts", ["4.61.2"]);
assertIncludes("README.md", ["Current package version: **4.61.2**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.2 - Admin Branding Slide Search Param Fix"]);

console.log("Field workflow proof and launch hardening verification passed.");
