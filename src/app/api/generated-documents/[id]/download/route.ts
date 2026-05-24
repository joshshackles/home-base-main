export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getGeneratedDocumentFile } from "@/lib/document-generation/storage";
import { requireDocumentPermission } from "@/lib/document-generation/permissions";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getVerifiedCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  try {
    requireDocumentPermission(user, "document.download");
  } catch {
    return NextResponse.json({ error: "Generated document is not available." }, { status: 403 });
  }

  const document = await prisma.generatedDocument.findUnique({ where: { id: params.id } });
  if (!document || !document.storagePath || !document.mimeType) return NextResponse.json({ error: "Generated document is not available." }, { status: 404 });
  if (user.role === "LANDLORD" && document.generatedById !== user.userId) return NextResponse.json({ error: "Generated document is not available." }, { status: 403 });

  const body = await getGeneratedDocumentFile(document.storagePath);
  await writeAuditLog({ actor: user, action: AuditAction.DOWNLOAD, entityType: "GeneratedDocument", entityId: document.id, message: `Downloaded generated document ${document.title}.` });

  return new NextResponse(body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${(document.originalName ?? document.title).replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
