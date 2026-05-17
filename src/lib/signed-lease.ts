import { AuditAction, DocumentCategory, DocumentStatus, DocumentVisibility, LeasePacketStatus, SecurityEventType, SignatureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderLeaseTemplate } from "@/lib/lease-render";
import { createTextPdfBuffer } from "@/lib/pdf";
import { saveGeneratedDocument } from "@/lib/storage";
import { writeAuditLog, type AuditActor } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";

function safeSlug(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "lease";
}

function formatSignatureDate(value: Date | null) {
  return value ? value.toLocaleString() : "Not signed";
}

export async function renderSignedLeaseText(leasePacketId: string) {
  const packet = await prisma.leasePacket.findUnique({
    where: { id: leasePacketId },
    include: {
      template: true,
      application: {
        include: {
          applicantUser: true,
          unit: { include: { property: { include: { owner: true } } } }
        }
      },
      signatureRequests: { orderBy: [{ signerRole: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!packet) throw new Error("Lease packet was not found.");

  const baseLease = renderLeaseTemplate(packet);
  const signatureBlock = packet.signatureRequests.map((request) => {
    const lines = [
      `${request.signerRole} SIGNATURE`,
      `Signer: ${request.signerName} <${request.signerEmail}>`,
      `Status: ${request.status}`,
      `Signature: ${request.signatureText ?? "Not signed"}`,
      `Signed At: ${formatSignatureDate(request.signedAt)}`,
      `IP Address: ${request.ipAddress ?? "Not captured"}`,
      `User Agent: ${request.userAgent ?? "Not captured"}`,
      `Signature Request ID: ${request.id}`
    ];
    return lines.join("\n");
  }).join("\n\n");

  return `${baseLease}\n\n\nSIGNED LEASE COMPLETION CERTIFICATE\n\nLease Packet ID: ${packet.id}\nApplication ID: ${packet.applicationId}\nCompleted At: ${formatSignatureDate(packet.completedAt)}\nFinal Document ID: ${packet.finalDocumentId ?? "Pending generation"}\n\n${signatureBlock || "No signature requests were found."}`;
}

export async function generateFinalSignedLeaseDocument({ leasePacketId, actor }: { leasePacketId: string; actor?: AuditActor | null }) {
  const packet = await prisma.leasePacket.findUnique({
    where: { id: leasePacketId },
    include: {
      application: { include: { unit: { include: { property: true } } } },
      signatureRequests: true
    }
  });

  if (!packet) throw new Error("Lease packet was not found.");
  if (packet.status !== LeasePacketStatus.COMPLETED) throw new Error("Final signed PDFs can only be generated after a lease packet is completed.");
  if (packet.signatureRequests.length === 0) throw new Error("No signature requests exist for this lease packet.");
  if (packet.signatureRequests.some((request) => request.status !== SignatureStatus.SIGNED)) {
    throw new Error("All signature requests must be signed before finalizing the lease.");
  }

  const text = await renderSignedLeaseText(leasePacketId);
  const safeApplicant = safeSlug(packet.application.applicantName);
  const originalName = `signed-lease-${safeApplicant}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdf = createTextPdfBuffer({ title: `Final Signed Lease - ${packet.application.applicantName}`, body: text });
  const stored = await saveGeneratedDocument(pdf, originalName, "application/pdf");

  const document = await prisma.document.create({
    data: {
      title: `Final signed lease - ${packet.application.applicantName}`,
      category: DocumentCategory.LEASE,
      status: DocumentStatus.ACCEPTED,
      visibility: DocumentVisibility.SHARED,
      applicationId: packet.applicationId,
      propertyId: packet.application.unit.propertyId,
      unitId: packet.application.unitId,
      leasePacketId: packet.id,
      uploadedById: actor?.userId ?? null,
      notes: "Final signed lease PDF generated after all required signature requests were completed. Treat this version as the completed lease record unless the packet is voided and reissued.",
      ...stored
    }
  });

  await prisma.leasePacket.update({
    where: { id: packet.id },
    data: {
      finalDocumentId: document.id,
      finalPdfGeneratedAt: new Date(),
      lockedAt: packet.lockedAt ?? new Date()
    }
  });

  await prisma.leaseNote.create({
    data: {
      leasePacketId: packet.id,
      note: `[System] Generated final signed lease PDF ${document.originalName}.`
    }
  });

  await writeAuditLog({
    actor: actor ?? null,
    action: AuditAction.COMPLETE,
    entityType: "FinalSignedLeasePdf",
    entityId: document.id,
    message: `Generated final signed lease PDF for ${packet.application.applicantName}.`,
    metadata: { leasePacketId: packet.id, applicationId: packet.applicationId, documentId: document.id }
  });

  await writeSecurityEvent({
    type: SecurityEventType.FINAL_LEASE_GENERATED,
    userId: actor?.userId ?? null,
    email: actor?.email ?? null,
    message: "Final signed lease PDF generated.",
    metadata: { leasePacketId: packet.id, documentId: document.id }
  });

  return document;
}

export async function completeLeaseIfReadyAndFinalize({ leasePacketId, actor }: { leasePacketId: string; actor?: AuditActor | null }) {
  const remaining = await prisma.signatureRequest.count({ where: { leasePacketId, status: SignatureStatus.PENDING } });
  const signed = await prisma.signatureRequest.count({ where: { leasePacketId, status: SignatureStatus.SIGNED } });
  const blocked = await prisma.signatureRequest.count({ where: { leasePacketId, status: { in: [SignatureStatus.DECLINED, SignatureStatus.VOIDED] } } });

  if (remaining === 0 && signed > 0 && blocked === 0) {
    const packet = await prisma.leasePacket.update({
      where: { id: leasePacketId },
      data: { status: LeasePacketStatus.COMPLETED, completedAt: new Date(), lockedAt: new Date() },
      select: { id: true, finalDocumentId: true }
    });

    await prisma.leaseNote.create({ data: { leasePacketId, note: "[System] All required signatures are complete. Lease packet marked completed and locked." } });

    if (!packet.finalDocumentId) {
      await generateFinalSignedLeaseDocument({ leasePacketId, actor });
    }
  }
}
