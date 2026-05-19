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


export function normalizeTypedSignature(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function assertSignatureTextLooksIntentional(value: string, expectedName?: string | null) {
  const normalized = normalizeTypedSignature(value);
  if (normalized.length < 2) throw new Error("Typed signature must include your legal name.");
  if (/^(test|asdf|signature|signed)$/i.test(normalized)) {
    throw new Error("Typed signature must be your legal name, not placeholder text.");
  }

  if (expectedName) {
    const expectedTokens = normalizeTypedSignature(expectedName).toLowerCase().split(" ").filter((token) => token.length > 1);
    const provided = normalized.toLowerCase();
    const hasMeaningfulOverlap = expectedTokens.length === 0 || expectedTokens.some((token) => provided.includes(token));
    if (!hasMeaningfulOverlap) {
      throw new Error("Typed signature should match the signer name on the signature request.");
    }
  }
}

export function validateSignatureReadiness(input: {
  request: {
    status: string;
    signatureText?: string | null;
    signedAt?: Date | null;
    electronicConsentAccepted?: boolean | null;
    signerName?: string | null;
  };
  leasePacket: { status: string; lockedAt?: Date | null; completedAt?: Date | null; voidedAt?: Date | null };
}) {
  if (input.request.status !== "PENDING") {
    throw new Error("This signature request is no longer pending.");
  }
  if (input.request.signatureText || input.request.signedAt || input.request.electronicConsentAccepted) {
    throw new Error("This signature request already contains completion evidence.");
  }
  if (input.leasePacket.status !== "SENT_FOR_SIGNATURE") {
    throw new Error("This lease packet is not currently open for signature.");
  }
  if (input.leasePacket.completedAt || input.leasePacket.voidedAt) {
    throw new Error("Completed or voided lease packets cannot accept new signatures.");
  }
}
