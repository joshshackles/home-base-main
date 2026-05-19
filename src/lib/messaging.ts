import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MessagingReader = {
  userId: string;
  role: UserRole;
};

export function isStaffMessagingUser(user: MessagingReader) {
  return user.role === UserRole.ADMIN || user.role === UserRole.LANDLORD || user.role === UserRole.INSPECTOR;
}

export async function markInboxThreadsRead(user: MessagingReader, threadIds: string[]) {
  const uniqueThreadIds = Array.from(new Set(threadIds.filter(Boolean)));
  if (uniqueThreadIds.length === 0) return;

  const now = new Date();
  if (isStaffMessagingUser(user)) {
    await prisma.message.updateMany({
      where: {
        threadId: { in: uniqueThreadIds },
        senderId: { not: user.userId },
        readByStaffAt: null
      },
      data: { readByStaffAt: now }
    });
    return;
  }

  await prisma.message.updateMany({
    where: {
      threadId: { in: uniqueThreadIds },
      senderId: { not: user.userId },
      isInternal: false,
      readByApplicantAt: null
    },
    data: { readByApplicantAt: now }
  });
}


export type InboxSearchParams = Record<string, string | string[] | undefined> | undefined;

export function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function selectedInboxThreadId(searchParams?: InboxSearchParams) {
  const selected = firstSearchParam(searchParams?.thread);
  return selected && selected.trim().length > 0 ? selected.trim() : undefined;
}

export function applyOptimisticInboxReadState<
  TThread extends { id: string; createdAt: Date; lastMessageAt: Date | null; messages: TMessage[] },
  TMessage extends { senderId: string; isInternal?: boolean | null; readByStaffAt?: Date | null; readByApplicantAt?: Date | null }
>(threads: TThread[], user: MessagingReader, selectedThreadId?: string, readAt: Date = new Date()) {
  if (!selectedThreadId) {
    return threads.map((thread) => ({ ...thread, lastMessageAt: thread.lastMessageAt ?? thread.createdAt }));
  }

  const staffReader = isStaffMessagingUser(user);

  return threads.map((thread) => ({
    ...thread,
    lastMessageAt: thread.lastMessageAt ?? thread.createdAt,
    messages: thread.messages.map((message) => {
      if (thread.id !== selectedThreadId || message.senderId === user.userId) return message;
      if (!staffReader && message.isInternal) return message;
      return staffReader
        ? { ...message, readByStaffAt: message.readByStaffAt ?? readAt }
        : { ...message, readByApplicantAt: message.readByApplicantAt ?? readAt };
    })
  }));
}

export async function markVisibleInboxThreadRead(user: MessagingReader, selectedThreadId: string | undefined, visibleThreadIds: string[]) {
  if (!selectedThreadId || !visibleThreadIds.includes(selectedThreadId)) return false;
  await markInboxThreadsRead(user, [selectedThreadId]);
  return true;
}
