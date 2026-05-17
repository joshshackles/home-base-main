export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";
import { visibleMessageWhereForUser, visibleThreadWhereForUser } from "@/lib/authorization";

export default async function ApplicantInboxPage({ searchParams }: { searchParams?: { thread?: string } }) {
  const user = await requireUser("/applicant/inbox");
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

  const threads = rawThreads.map((thread) => ({
    ...thread,
    lastMessageAt: thread.lastMessageAt ?? thread.createdAt
  }));

  return <TextingInbox currentUserId={user.userId} threads={threads} selectedThreadId={searchParams?.thread} />;
}
