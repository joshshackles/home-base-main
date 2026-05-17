import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TextingInbox } from "@/components/messaging/TextingInbox";

export default async function ApplicantInboxPage() {
  const user = await requireUser("/applicant/inbox");
  const threads = await prisma.messageThread.findMany({
    where: {
      OR: [
        { createdById: user.userId },
        { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
        { maintenanceRequest: { requesterId: user.userId } }
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

  return <TextingInbox currentUserId={user.userId} threads={threads} />;
}
