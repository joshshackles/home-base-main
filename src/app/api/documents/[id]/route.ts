import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { assertReadableStoredDocument } from "@/lib/storage";

async function canAccessDocument(documentId: string) {
  const user = getCurrentUser();
  if (!user) return { allowed: false, status: 401 as const };

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      application: { include: { unit: { include: { property: true } } } },
      property: true,
      unit: { include: { property: true } },
      leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } }
    }
  });

  if (!document) return { allowed: false, status: 404 as const };
  if (user.role === "ADMIN") return { allowed: true, document, user };

  const documentApplication = document.application || document.leasePacket?.application || null;

  if ((user.role === "APPLICANT" || user.role === "TENANT") && documentApplication) {
    const ownsApplication = documentApplication.applicantUserId === user.userId || documentApplication.applicantEmail === user.email;
    const visible = document.visibility === "APPLICANT" || document.visibility === "SHARED";
    if (ownsApplication && visible) return { allowed: true, document, user };
  }

  if (user.role === "LANDLORD") {
    const propertyOwnerId = document.property?.ownerId || document.unit?.property.ownerId || documentApplication?.unit.property.ownerId;
    const visible = document.visibility === "LANDLORD" || document.visibility === "SHARED";
    if (propertyOwnerId === user.userId && visible) return { allowed: true, document, user };
  }

  return { allowed: false, status: 403 as const };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const result = await canAccessDocument(params.id);
  if (!result.allowed) return NextResponse.json({ error: "Document is not available." }, { status: result.status });

  const filePath = await assertReadableStoredDocument(result.document.storagePath);
  const body = await readFile(filePath);

  await writeAuditLog({ actor: result.user, action: AuditAction.DOWNLOAD, entityType: "Document", entityId: result.document.id, message: `Downloaded document ${result.document.title}.` });

  return new NextResponse(body, {
    headers: {
      "Content-Type": result.document.mimeType,
      "Content-Length": String(result.document.sizeBytes),
      "Content-Disposition": `attachment; filename="${result.document.originalName.replace(/"/g, "")}"`
    }
  });
}
