import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createBackupManifest } from "@/lib/admin-ops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await requireRole(["ADMIN"], "/admin/backups");
  const { searchParams } = new URL(request.url);
  const label = searchParams.get("label") || undefined;
  const { backup, serialized } = await createBackupManifest(actor, label);
  const filename = `homebase-backup-${backup.createdAt.toISOString().slice(0, 10)}-${backup.id}.json`;

  return new NextResponse(serialized, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-homebase-backup-id": backup.id,
      "x-homebase-backup-checksum": backup.checksum || ""
    }
  });
}
