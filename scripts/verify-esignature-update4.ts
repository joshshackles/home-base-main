import { readFileSync } from "node:fs";

const checks: Array<[string, string, string]> = [
  ["src/lib/signature-workflow.ts", "completeSignatureRequest", "centralized signature completion helper"],
  ["src/lib/signature-workflow.ts", "updateMany", "idempotent pending-only signature update"],
  ["src/lib/signature-workflow.ts", "SIGNATURE_COMPLETED", "signature completion security event"],
  ["src/lib/signature-workflow.ts", "assertSignatureTextLooksIntentional", "typed-signature validation"],
  ["src/lib/signature-workflow.ts", "SIGNATURE_EXPIRED", "expired signature security event"],
  ["src/lib/e-signature.ts", "normalizeTypedSignature", "signature normalization helper"],
  ["src/lib/e-signature.ts", "validateSignatureReadiness", "signature readiness guard"],
  ["src/lib/signed-lease.ts", "if (packet.finalDocumentId)", "final signed PDF idempotency guard"],
  ["src/lib/signed-lease.ts", "alreadyGenerated", "duplicate final lease document guard"],
  ["src/app/applicant/actions.ts", "completeSignatureRequest", "applicant signature action uses hardened workflow"],
  ["src/app/landlord/actions.ts", "completeSignatureRequest", "landlord signature action uses hardened workflow"],
  ["src/app/admin/actions.ts", "This packet already has completed signatures", "resend guard for partially signed packets"],
  ["src/app/admin/actions.ts", "SIGNATURE_REQUESTED", "signature request security event"],
  ["package.json", "esignature:update4:verify", "package verification script"]
];

let failed = false;
for (const [file, needle, label] of checks) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(needle)) {
    failed = true;
    console.error(`Missing ${label}: expected ${needle} in ${file}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

if (failed) process.exit(1);
console.log("E-signature Update 4 verification passed.");
