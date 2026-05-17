export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";

export default async function LandlordInboxPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/inbox");
  const ownerScope = user.role === "ADMIN" ? {} : { ownerId: user.userId };
  const rawThreads = await prisma.messageThread.findMany({
    where: {
      OR: [
        { maintenanceRequest: { unit: { property: ownerScope } } },
        { application: { unit: { property: ownerScope } } },
        { createdById: user.userId }
      ]
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      application: { include: { unit: { include: { property: true } } } },
      maintenanceRequest: { include: { unit: { include: { property: true } } } },
      messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } }
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
  });

  const threads = rawThreads.map((thread) => ({
    ...thread,
    lastMessageAt: thread.lastMessageAt ?? thread.createdAt
  }));

  return <TextingInbox currentUserId={user.userId} threads={threads} allowInternalNotes />;
}
