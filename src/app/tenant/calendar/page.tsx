export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarCenter } from "@/lib/calendar";
import { CalendarCenterView } from "@/components/calendar/CalendarCenterView";
import { activeOccupancyStatuses } from "@/lib/relationship-lifecycle";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TenantCalendarPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["TENANT"], "/tenant/calendar");
  const [center, properties, units, tasks] = await Promise.all([
    getCalendarCenter(user, {
      q: getParam(searchParams, "q"),
      status: getParam(searchParams, "status"),
      type: getParam(searchParams, "type"),
      range: (getParam(searchParams, "range") || "upcoming") as "upcoming" | "today" | "week" | "month" | "all",
      owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all"
    }),
    prisma.property.findMany({
      where: { units: { some: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } }] } }, isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, state: true },
      take: 250
    }),
    prisma.unit.findMany({
      where: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } }] },
      include: { property: { select: { name: true } } },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
      take: 300
    }),
    prisma.taskItem.findMany({
      where: { OR: [{ createdById: user.userId }, { assignedToId: user.userId }, { unit: { OR: [{ tenantUserId: user.userId }, { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } }] } }] },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, type: true, status: true },
      take: 200
    })
  ]);

  return (
    <CalendarCenterView
      title="Resident calendar"
      description="Upcoming lease dates, rent reminders, inspections, maintenance windows, notices, and resident tasks tied to your home."
      basePath="tenant"
      center={center}
      searchParams={searchParams}
      users={[]}
      properties={properties.map((property) => ({ id: property.id, label: `${property.name} - ${property.city}, ${property.state}` }))}
      units={units.map((unit) => ({ id: unit.id, label: `${unit.property.name} #${unit.unitNumber}` }))}
      tasks={tasks.map((task) => ({ id: task.id, label: `${task.title} - ${task.type} - ${task.status}` }))}
    />
  );
}
