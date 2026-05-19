import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const validation = readFileSync("src/lib/validation.ts", "utf8");
const signatureWorkflow = readFileSync("src/lib/signature-workflow.ts", "utf8");
const signedLease = readFileSync("src/lib/signed-lease.ts", "utf8");
const applicantLeasePage = readFileSync("src/app/applicant/leases/[id]/page.tsx", "utf8");

const required = [
  [schema, "electronicConsentAccepted", "SignatureRequest stores electronic consent flag"],
  [schema, "electronicConsentText", "SignatureRequest stores consent text"],
  [schema, "documentTextHash", "SignatureRequest stores lease text hash"],
  [schema, "signatureEvidenceHash", "SignatureRequest stores evidence hash"],
  [schema, "finalPdfHash", "SignatureRequest stores final PDF hash"],
  [schema, "sha256Hash", "Document stores SHA-256 hash"],
  [validation, "electronicConsentAccepted", "Signature form validates consent checkbox"],
  [signatureWorkflow, "buildSignatureEvidenceHash", "Signature workflow creates evidence hash"],
  [signatureWorkflow, "leaseTextHash", "Signature workflow captures document hash"],
  [signatureWorkflow, "ELECTRONIC_SIGNATURE_CONSENT_TEXT", "Signature workflow uses fixed consent disclosure"],
  [signedLease, "sha256Hex(pdf)", "Final signed PDF is hashed"],
  [signedLease, "finalPdfHash", "Final PDF hash is stored with signature evidence"],
  [applicantLeasePage, "Electronic signature consent", "Applicant signature UI includes explicit consent"],
];

const failures = required.filter(([contents, needle]) => !contents.includes(needle));

if (failures.length) {
  console.error("E-signature verification failed:");
  for (const [, , label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log("E-signature verification passed.");
