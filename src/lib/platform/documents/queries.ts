import { DocumentCategory, DocumentVisibility, Prisma, UserRole } from "@prisma/client";
import { getVisibleDocumentCenter } from "@/lib/documents/center";
import { prisma } from "@/lib/prisma";
import { definePlatformQuery } from "@/lib/platform/service";

type DocumentCenterSearchParams = Record<string, string | string[] | undefined> | undefined;

function getParam(searchParams: DocumentCenterSearchParams, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function activeUnitScopeForActor(actor: { userId: string; role: UserRole }): Prisma.UnitWhereInput {
  if (actor.role === UserRole.ADMIN) {
    return { property: { isArchived: false }, NOT: { status: "ARCHIVED" } };
  }

  return { property: { ownerId: actor.userId, isArchived: false }, NOT: { status: "ARCHIVED" } };
}

function applicationScopeForActor(actor: { userId: string; role: UserRole }): Prisma.ApplicationWhereInput {
  if (actor.role === UserRole.ADMIN) {
    return { unit: { property: { isArchived: false } } };
  }

  return { unit: { property: { ownerId: actor.userId, isArchived: false } } };
}

function leasePacketScopeForActor(actor: { userId: string; role: UserRole }): Prisma.LeasePacketWhereInput {
  if (actor.role === UserRole.ADMIN) {
    return { application: { unit: { property: { isArchived: false } } } };
  }

  return { application: { unit: { property: { ownerId: actor.userId, isArchived: false } } } };
}

export const getLandlordDocumentCenterModel = definePlatformQuery(async (ctx, searchParams: DocumentCenterSearchParams) => {
  const [center, units, applications, leasePackets] = await Promise.all([
    getVisibleDocumentCenter(ctx.actor, {
      q: getParam(searchParams, "q"),
      category: getParam(searchParams, "category"),
      status: getParam(searchParams, "status")
    }),
    prisma.unit.findMany({
      where: activeUnitScopeForActor(ctx.actor),
      include: { property: true },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
    }),
    prisma.application.findMany({
      where: applicationScopeForActor(ctx.actor),
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 120
    }),
    prisma.leasePacket.findMany({
      where: leasePacketScopeForActor(ctx.actor),
      include: {
        template: { select: { name: true } },
        application: { include: { unit: { include: { property: true } } } },
        signatureRequests: true,
        documents: { select: { id: true, status: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 120
    })
  ]);

  const pendingSignatureCount = leasePackets.reduce((total, packet) => total + packet.signatureRequests.filter((request) => request.status === "PENDING").length, 0);
  const completedLeases = leasePackets.filter((packet) => packet.status === "COMPLETED").length;
  const packetDocumentCount = leasePackets.reduce((total, packet) => total + packet.documents.length, 0);

  return {
    center,
    units,
    applications,
    leasePackets,
    documentCategoryOptions: Object.values(DocumentCategory),
    documentVisibilityOptions: Object.values(DocumentVisibility).filter((value) => value !== DocumentVisibility.INTERNAL),
    leaseSummary: {
      packetCount: leasePackets.length,
      pendingSignatureCount,
      completedLeases,
      packetDocumentCount
    }
  };
});
