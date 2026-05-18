import { ScheduleEventStatus, ScheduleEventType, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { activeOccupancyStatuses } from "@/lib/relationship-lifecycle";

export type CalendarFilters = {
  q?: string;
  status?: string;
  type?: string;
  range?: "upcoming" | "today" | "week" | "month" | "all";
  owner?: "mine" | "all";
};

export const activeScheduleStatuses: ScheduleEventStatus[] = [ScheduleEventStatus.SCHEDULED, ScheduleEventStatus.CONFIRMED, ScheduleEventStatus.IN_PROGRESS];

export function scheduleStatusLabel(status: ScheduleEventStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function scheduleTypeLabel(type: ScheduleEventType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function getRangeWhere(range: CalendarFilters["range"]): Prisma.ScheduleEventWhereInput {
  const now = new Date();
  if (range === "all") return {};
  if (range === "today") return { startsAt: { gte: startOfToday(), lt: endOfToday() } };
  if (range === "week") return { startsAt: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } };
  if (range === "month") return { startsAt: { gte: now, lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } };
  return { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
}

export function getScheduleScopeWhere(user: SessionPayload): Prisma.ScheduleEventWhereInput {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.LANDLORD) {
    return {
      OR: [
        { createdById: user.userId },
        { assignedToId: user.userId },
        { participants: { some: { userId: user.userId } } },
        { property: { ownerId: user.userId, isArchived: false } },
        { unit: { property: { ownerId: user.userId, isArchived: false } } },
        { taskItem: { OR: [{ createdById: user.userId }, { assignedToId: user.userId }, { property: { ownerId: user.userId, isArchived: false } }, { unit: { property: { ownerId: user.userId, isArchived: false } } }] } }
      ]
    };
  }
  return {
    OR: [
      { createdById: user.userId },
      { assignedToId: user.userId },
      { participants: { some: { userId: user.userId } } },
      { unit: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } }] } },
      { taskItem: { OR: [{ createdById: user.userId }, { assignedToId: user.userId }, { unit: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } }] } }] } }
    ]
  };
}

function filterWhere(filters: CalendarFilters): Prisma.ScheduleEventWhereInput {
  const where: Prisma.ScheduleEventWhereInput = {};
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { location: { contains: filters.q, mode: "insensitive" } },
      { unit: { unitNumber: { contains: filters.q, mode: "insensitive" } } },
      { unit: { property: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  if (filters.status && filters.status !== "ALL") where.status = filters.status as ScheduleEventStatus;
  if (filters.type && filters.type !== "ALL") where.type = filters.type as ScheduleEventType;
  return where;
}

export async function getCalendarCenter(user: SessionPayload, filters: CalendarFilters = {}) {
  const scopedWhere = getScheduleScopeWhere(user);
  const where: Prisma.ScheduleEventWhereInput = {
    AND: [scopedWhere, filterWhere(filters), getRangeWhere(filters.range), filters.owner === "mine" ? { OR: [{ assignedToId: user.userId }, { participants: { some: { userId: user.userId } } }] } : {}]
  };

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      property: { select: { id: true, name: true, city: true, state: true } },
      unit: { select: { id: true, unitNumber: true, property: { select: { name: true, city: true, state: true } } } },
      taskItem: { select: { id: true, title: true, status: true, priority: true } },
      participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, take: 6 }
    },
    orderBy: [{ startsAt: "asc" }, { status: "asc" }],
    take: 250
  });

  const now = new Date();
  const [today, upcoming, overdue, mine, tours, maintenance] = await Promise.all([
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { startsAt: { gte: startOfToday(), lt: endOfToday() }, status: { in: activeScheduleStatuses } }] } }),
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { startsAt: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { in: activeScheduleStatuses } }] } }),
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { endsAt: { lt: now }, status: { in: [ScheduleEventStatus.SCHEDULED, ScheduleEventStatus.CONFIRMED, ScheduleEventStatus.IN_PROGRESS] } }] } }),
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { OR: [{ assignedToId: user.userId }, { participants: { some: { userId: user.userId } } }], status: { in: activeScheduleStatuses } }] } }),
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { type: ScheduleEventType.TOUR, status: { in: activeScheduleStatuses } }] } }),
    prisma.scheduleEvent.count({ where: { AND: [scopedWhere, { type: { in: [ScheduleEventType.MAINTENANCE, ScheduleEventType.INSPECTION] }, status: { in: activeScheduleStatuses } }] } })
  ]);

  return { events, metrics: { today, upcoming, overdue, mine, tours, maintenance } };
}

export async function canManageScheduleEvent(user: SessionPayload, eventId: string) {
  const event = await prisma.scheduleEvent.findFirst({ where: { id: eventId, AND: [getScheduleScopeWhere(user)] }, select: { id: true } });
  return Boolean(event);
}
