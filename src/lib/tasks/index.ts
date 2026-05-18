import { TaskItemPriority, TaskItemStatus, TaskItemType, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export const openTaskStatuses: TaskItemStatus[] = [TaskItemStatus.TODO, TaskItemStatus.IN_PROGRESS, TaskItemStatus.BLOCKED, TaskItemStatus.WAITING];

export type TaskFilters = {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  owner?: "mine" | "all";
};

export function taskStatusLabel(status: TaskItemStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function taskPriorityWeight(priority: TaskItemPriority) {
  return { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 }[priority] ?? 0;
}

export function isTaskOverdue(dueAt: Date | null, status: TaskItemStatus) {
  return Boolean(dueAt && dueAt < new Date() && status !== TaskItemStatus.DONE && status !== TaskItemStatus.CANCELLED);
}

export function getTaskScopeWhere(user: SessionPayload): Prisma.TaskItemWhereInput {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.LANDLORD) {
    return {
      OR: [
        { createdById: user.userId },
        { assignedToId: user.userId },
        { property: { ownerId: user.userId, isArchived: false } },
        { unit: { property: { ownerId: user.userId, isArchived: false } } },
        { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } },
        { maintenanceRequest: { unit: { property: { ownerId: user.userId, isArchived: false } } } },
        { leasePacket: { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } } },
        { document: { OR: [{ property: { ownerId: user.userId, isArchived: false } }, { unit: { property: { ownerId: user.userId, isArchived: false } } }, { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } }] } }
      ]
    };
  }
  return {
    OR: [
      { createdById: user.userId },
      { assignedToId: user.userId },
      { unit: { tenantUserId: user.userId } },
      { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
      { maintenanceRequest: { requesterId: user.userId } },
      { document: { uploadedById: user.userId } }
    ]
  };
}

function filterWhere(filters: TaskFilters): Prisma.TaskItemWhereInput {
  const where: Prisma.TaskItemWhereInput = {};
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { unit: { unitNumber: { contains: filters.q, mode: "insensitive" } } },
      { unit: { property: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  if (filters.status && filters.status !== "ALL") where.status = filters.status as TaskItemStatus;
  if (filters.priority && filters.priority !== "ALL") where.priority = filters.priority as TaskItemPriority;
  if (filters.type && filters.type !== "ALL") where.type = filters.type as TaskItemType;
  return where;
}

export async function getTaskCenter(user: SessionPayload, filters: TaskFilters = {}) {
  const where: Prisma.TaskItemWhereInput = { AND: [getTaskScopeWhere(user), filterWhere(filters), filters.owner === "mine" ? { assignedToId: user.userId } : {}] };
  const tasks = await prisma.taskItem.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      property: { select: { id: true, name: true, city: true, state: true } },
      unit: { select: { id: true, unitNumber: true, property: { select: { name: true, city: true, state: true } } } },
      application: { select: { id: true, applicantName: true, status: true } },
      maintenanceRequest: { select: { id: true, subject: true, status: true } },
      leasePacket: { select: { id: true, status: true, template: { select: { name: true } } } },
      document: { select: { id: true, title: true, category: true } }
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200
  });

  const [open, overdue, dueSoon, mine, blocked, done] = await Promise.all([
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { status: { in: openTaskStatuses } }] } }),
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { status: { in: openTaskStatuses }, dueAt: { lt: new Date() } }] } }),
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { status: { in: openTaskStatuses }, dueAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }] } }),
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { assignedToId: user.userId, status: { in: openTaskStatuses } }] } }),
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { status: TaskItemStatus.BLOCKED }] } }),
    prisma.taskItem.count({ where: { AND: [getTaskScopeWhere(user), { status: TaskItemStatus.DONE }] } })
  ]);

  return { tasks, metrics: { open, overdue, dueSoon, mine, blocked, done } };
}

export async function canManageTask(user: SessionPayload, taskId: string) {
  const task = await prisma.taskItem.findFirst({ where: { id: taskId, AND: [getTaskScopeWhere(user)] }, select: { id: true } });
  return Boolean(task);
}
