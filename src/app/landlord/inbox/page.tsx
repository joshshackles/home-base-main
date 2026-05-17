export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";
import { applyOptimisticInboxReadState, markVisibleInboxThreadRead, selectedInboxThreadId } from "@/lib/messaging";
import { canWriteInternalNote, visibleMessageWhereForUser, visibleThreadWhereForUser } from "@/lib/authorization";

export default async function LandlordInboxPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/inbox");
  const selectedThreadId = selectedInboxThreadId(searchParams);
  const allowInternalNotes = await canWriteInternalNote(user);
  const messageVisibilityWhere = await visibleMessageWhereForUser(user);
  const threadVisibilityWhere = await visibleThreadWhereForUser(user);
  const ownerScope = { ownerId: user.userId };
  const rawThreads = await prisma.messageThread.findMany({
    where: {
      AND: [
        threadVisibilityWhere,
        {
          OR: [
            { maintenanceRequest: { unit: { property: ownerScope } } },
            { application: { unit: { property: ownerScope } } },
            { createdById: user.userId }
          ]
        }
      ]
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      application: { include: { unit: { include: { property: true } } } },
      maintenanceRequest: { include: { unit: { include: { property: true } } } },
      messages: { where: messageVisibilityWhere, include: { sender: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } }
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
  });

  await markVisibleInboxThreadRead(user, selectedThreadId, rawThreads.map((thread) => thread.id));
  const threads = applyOptimisticInboxReadState(rawThreads, user, selectedThreadId);

  return <TextingInbox currentUserId={user.userId} threads={threads} allowInternalNotes={allowInternalNotes} selectedThreadId={selectedThreadId} filters={searchParams} basePath="/landlord/inbox" staffInbox />;
}
