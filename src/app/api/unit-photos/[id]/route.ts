import { NextResponse } from "next/server";
import { UnitStatus, UserRole } from "@prisma/client";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { canAccessUnit } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { readStoredDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const photo = await prisma.unitPhoto.findUnique({
    where: { id: params.id },
    include: { unit: { include: { property: true } } }
  });

  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const isPublicListing = photo.unit.status === UnitStatus.AVAILABLE && !photo.unit.property.isArchived;
  if (!isPublicListing) {
    const user = await getVerifiedCurrentUser();
    const canView = user && (user.role === UserRole.ADMIN || (await canAccessUnit(user, photo.unitId)));
    if (!canView) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const bytes = await readStoredDocument(photo.storagePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.sizeBytes),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename="${photo.originalName.replace(/"/g, "")}"`
    }
  });
}
