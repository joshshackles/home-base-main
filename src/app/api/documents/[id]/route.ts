export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { getAuthorizedDocument, logAuthorizationDenied } from "@/lib/authorization";
import { writeAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { readStoredDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getVerifiedCurrentUser();
  if (!user) return NextResponse.json({ error: "Document is not available." }, { status: 401 });

  const document = await getAuthorizedDocument(user, params.id);
  if (!document) {
    await logAuthorizationDenied(user, "Document", params.id, "Document download rejected by visibility or ownership rules.");
    return NextResponse.json({ error: "Document is not available." }, { status: 403 });
  }

  const body = await readStoredDocument(document.storagePath);

  await writeAuditLog({ actor: user, action: AuditAction.DOWNLOAD, entityType: "Document", entityId: document.id, message: `Downloaded document ${document.title}.` });

  return new NextResponse(body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${document.originalName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
