import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { markQuickBooksOAuthStarted } from "@/lib/integrations-real";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireRole(["ADMIN", "LANDLORD"], "/admin/integrations");
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
  const url = await markQuickBooksOAuthStarted(connectionId, user.userId, user.role === "LANDLORD" ? user.userId : undefined);
  return NextResponse.redirect(url);
}
