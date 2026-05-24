export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { listDocumentTemplates } from "@/lib/document-generation/service";
import { GeneratedDocumentTemplateType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getVerifiedCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const templateType = request.nextUrl.searchParams.get("templateType") as GeneratedDocumentTemplateType | null;
  const templates = await listDocumentTemplates(user, templateType ?? undefined);
  return NextResponse.json({ templates });
}
