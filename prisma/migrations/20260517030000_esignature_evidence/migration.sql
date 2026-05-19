-- Add electronic-signature consent and tamper-evidence metadata.
ALTER TABLE "SignatureRequest"
  ADD COLUMN "electronicConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "electronicConsentText" TEXT,
  ADD COLUMN "electronicConsentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "documentTextHash" TEXT,
  ADD COLUMN "signatureEvidenceHash" TEXT,
  ADD COLUMN "finalPdfHash" TEXT;

ALTER TABLE "Document"
  ADD COLUMN "sha256Hash" TEXT;

CREATE INDEX "SignatureRequest_documentTextHash_idx" ON "SignatureRequest"("documentTextHash");
CREATE INDEX "SignatureRequest_signatureEvidenceHash_idx" ON "SignatureRequest"("signatureEvidenceHash");
CREATE INDEX "Document_sha256Hash_idx" ON "Document"("sha256Hash");
