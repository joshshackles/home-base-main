import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole(["ADMIN"], "/admin/system");
  const filePath = path.join(process.cwd(), "sample-data", "homebase-sample-6-users-each-10-homes.json");
  const body = await readFile(filePath, "utf8");

  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": "attachment; filename=\"homebase-sample-6-users-each-10-homes.json\""
    }
  });
}
