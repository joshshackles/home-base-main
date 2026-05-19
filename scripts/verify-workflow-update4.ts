import { readFileSync } from "node:fs";

function assertIncludes(file: string, expected: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`${file} is missing: ${expected}`);
  }
}

assertIncludes("src/lib/signed-lease.ts", "syncLeaseCompletion");
assertIncludes("src/lib/signed-lease.ts", "generateFinalSignedLeaseDocument");
assertIncludes("src/app/admin/actions.ts", "refreshLeaseAutomation");
assertIncludes("src/app/admin/actions.ts", "renewExpiredSignatureRequest");
assertIncludes("src/app/admin/leases/[id]/page.tsx", "Lease timeline");
assertIncludes("src/app/admin/leases/[id]/page.tsx", "Refresh Automation");
assertIncludes("src/app/admin/leases/[id]/page.tsx", "Renew 7 Days");
assertIncludes("src/lib/e-signature.ts", "buildSignatureEvidenceHash");
assertIncludes("src/app/landlord/leases/[id]/page.tsx", "Electronic signature consent");
assertIncludes("src/app/applicant/leases/[id]/page.tsx", "Packet progress");
assertIncludes("src/app/landlord/leases/[id]/page.tsx", "Packet progress");
assertIncludes("package.json", '"esignature:update4:verify"');
assertIncludes("README.md", "Current package version:");
assertIncludes("CHANGELOG.md", "Lease and E-signature Hardening");

console.log("Workflow update 4 verification passed.");
