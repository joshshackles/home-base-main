import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { exportDataSnapshot } from "@/lib/data-portability";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireRole(["ADMIN"], "/admin/system");
  const snapshot = await exportDataSnapshot(actor.email);
  const filename = `homebase-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
