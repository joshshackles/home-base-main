export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { previewDocument } from "@/lib/document-generation/service";

export async function POST(request: NextRequest) {
  const user = await getVerifiedCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const body = await request.json();
    const preview = await previewDocument(user, {
      ...body,
      dateRange: body.dateRange ? {
        from: body.dateRange.from ? new Date(body.dateRange.from) : undefined,
        to: body.dateRange.to ? new Date(body.dateRange.to) : undefined
      } : undefined
    });
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document preview failed." }, { status: 400 });
  }
}
