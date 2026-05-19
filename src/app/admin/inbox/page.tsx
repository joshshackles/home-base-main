export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";
import { applyOptimisticInboxReadState, markVisibleInboxThreadRead, selectedInboxThreadId } from "@/lib/messaging";

export default async function AdminInboxPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["ADMIN"], "/admin/inbox");
  const selectedThreadId = selectedInboxThreadId(searchParams);
  const rawThreads = await prisma.messageThread.findMany({
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      application: { include: { unit: { include: { property: true } } } },
      maintenanceRequest: { include: { unit: { include: { property: true } } } },
      messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } }
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
  });

  await markVisibleInboxThreadRead(user, selectedThreadId, rawThreads.map((thread) => thread.id));
  const threads = applyOptimisticInboxReadState(rawThreads, user, selectedThreadId);

  return <TextingInbox currentUserId={user.userId} threads={threads} allowInternalNotes selectedThreadId={selectedThreadId} filters={searchParams} basePath="/admin/inbox" staffInbox />;
}
