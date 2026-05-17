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
assertIncludes("src/app/landlord/actions.ts", "buildSignatureEvidenceHash");
assertIncludes("src/app/landlord/leases/[id]/page.tsx", "Electronic signature consent");
assertIncludes("src/app/applicant/leases/[id]/page.tsx", "Packet progress");
assertIncludes("src/app/landlord/leases/[id]/page.tsx", "Packet progress");
assertIncludes("package.json", '"version": "1.7.4"');
assertIncludes("README.md", "Current package version: **1.7.4**");
assertIncludes("CHANGELOG.md", "v1.7.4");

console.log("Workflow update 4 verification passed.");
