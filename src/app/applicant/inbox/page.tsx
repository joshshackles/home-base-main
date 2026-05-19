export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";
import { applyOptimisticInboxReadState, markVisibleInboxThreadRead, selectedInboxThreadId } from "@/lib/messaging";
import { visibleMessageWhereForUser, visibleThreadWhereForUser } from "@/lib/authorization";

export default async function ApplicantInboxPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireUser("/applicant/inbox");
  const selectedThreadId = selectedInboxThreadId(searchParams);
  const messageVisibilityWhere = await visibleMessageWhereForUser(user);
  const threadVisibilityWhere = await visibleThreadWhereForUser(user);
  const rawThreads = await prisma.messageThread.findMany({
    where: {
      AND: [
        threadVisibilityWhere,
        {
          OR: [
            { createdById: user.userId },
            { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
            { maintenanceRequest: { requesterId: user.userId } }
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

  return <TextingInbox currentUserId={user.userId} threads={threads} selectedThreadId={selectedThreadId} filters={searchParams} basePath="/applicant/inbox" staffInbox={false} />;
}
