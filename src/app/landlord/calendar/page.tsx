export const dynamic = "force-dynamic";

import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarCenter } from "@/lib/calendar";
import { CalendarCenterView } from "@/components/calendar/CalendarCenterView";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CalendarPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/calendar");
  const [center, users, properties, units, tasks] = await Promise.all([
    getCalendarCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), type: getParam(searchParams, "type"), range: (getParam(searchParams, "range") || "upcoming") as "upcoming" | "today" | "week" | "month" | "all", owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all" }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ role: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true, role: true }, take: 250 }),
    prisma.property.findMany({ where: { ownerId: user.userId, isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true, state: true }, take: 250 }),
    prisma.unit.findMany({ where: { property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } }, include: { property: { select: { name: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 300 }),
    prisma.taskItem.findMany({ where: { OR: [{ createdById: user.userId }, { assignedToId: user.userId }, { property: { ownerId: user.userId, isArchived: false } }, { unit: { property: { ownerId: user.userId, isArchived: false } } }] }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], select: { id: true, title: true, type: true, status: true }, take: 200 })
  ]);

  return <CalendarCenterView title="Landlord calendar" description="A unified rental operations calendar for showings, maintenance, inspections, move-ins, renewals, rent reminders, and team follow-up." basePath="landlord" center={center} searchParams={searchParams} canCreate users={users.map((u) => ({ id: u.id, label: `${u.name || u.email} · ${u.role}` }))} properties={properties.map((p) => ({ id: p.id, label: `${p.name} · ${p.city}, ${p.state}` }))} units={units.map((u) => ({ id: u.id, label: `${u.property.name} #${u.unitNumber}` }))} tasks={tasks.map((t) => ({ id: t.id, label: `${t.title} · ${t.type} · ${t.status}` }))} />;
}
