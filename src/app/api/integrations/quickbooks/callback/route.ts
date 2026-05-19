import { NextResponse } from "next/server";
import { handleQuickBooksOAuthCallback } from "@/lib/integrations-real";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connection = await handleQuickBooksOAuthCallback({
    code: searchParams.get("code"),
    realmId: searchParams.get("realmId"),
    state: searchParams.get("state"),
    error: searchParams.get("error")
  });
  const target = connection.ownerId ? "/landlord/integrations?quickbooks=connected" : "/admin/integrations?quickbooks=connected";
  return NextResponse.redirect(new URL(target, request.url));
}
