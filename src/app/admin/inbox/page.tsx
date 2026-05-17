export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";

export default async function AdminInboxPage() {
  const user = await requireRole(["ADMIN"], "/admin/inbox");
  const rawThreads = await prisma.messageThread.findMany({
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
