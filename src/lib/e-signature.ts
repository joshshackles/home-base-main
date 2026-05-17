import { createHash } from "node:crypto";
import { renderLeaseTemplate } from "@/lib/lease-render";

export const ELECTRONIC_SIGNATURE_CONSENT_TEXT = [
  "I consent to conduct this lease transaction electronically.",
  "I understand that my typed name is my electronic signature and has the same legal effect as a handwritten signature.",
  "I understand that I may request a paper copy and may withdraw electronic consent before signing by contacting the property administrator.",
  "I confirm that I have reviewed the lease packet before signing."
].join(" ");

export function sha256Hex(input: string | Buffer | Uint8Array) {
  return createHash("sha256").update(input).digest("hex");
}

export function buildSignatureEvidenceHash(input: {
  leasePacketId: string;
  signatureRequestId: string;
  signerEmail: string;
  signerRole: string;
  signatureText: string;
  signedAt: Date;
  documentTextHash: string;
  consentText: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return sha256Hex(JSON.stringify({
    leasePacketId: input.leasePacketId,
    signatureRequestId: input.signatureRequestId,
    signerEmail: input.signerEmail.toLowerCase(),
    signerRole: input.signerRole,
    signatureText: input.signatureText,
    signedAt: input.signedAt.toISOString(),
    documentTextHash: input.documentTextHash,
    consentText: input.consentText,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null
  }));
}

export function leaseTextHash(packet: Parameters<typeof renderLeaseTemplate>[0]) {
  return sha256Hex(renderLeaseTemplate(packet));
}
