import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const slide = await prisma.homepageHeroSlide.findUnique({
    where: { id: params.id },
    select: { storagePath: true, mimeType: true, isActive: true }
  });

  if (!slide) return new NextResponse("Not found", { status: 404 });

  const bytes = await readStoredDocument(slide.storagePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": slide.mimeType,
      "Cache-Control": slide.isActive ? "public, max-age=300, stale-while-revalidate=86400" : "private, max-age=60"
    }
  });
}
