"use server";

import { ScheduleEventStatus, ScheduleEventType, ScheduleEventVisibility, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageScheduleEvent } from "@/lib/calendar";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullable(value: string) {
  return value.length > 0 ? value : null;
}

function parseDateTime(raw: string) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function participantIds(formData: FormData) {
  return formData.getAll("participantIds").filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

const scheduleSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(2000).optional().nullable(),
  type: z.nativeEnum(ScheduleEventType),
  status: z.nativeEnum(ScheduleEventStatus),
  visibility: z.nativeEnum(ScheduleEventVisibility),
  startsAt: z.date(),
  endsAt: z.date(),
  allDay: z.boolean().default(false),
  location: z.string().max(240).nullable().optional(),
  meetingUrl: z.string().max(500).nullable().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  propertyId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  taskItemId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional()
});

async function revalidateCalendarPages() {
  revalidatePath("/admin/calendar");
  revalidatePath("/landlord/calendar");
  revalidatePath("/applicant/calendar");
  revalidatePath("/admin");
  revalidatePath("/landlord");
  revalidatePath("/applicant");
}

export async function createScheduleEvent(formData: FormData) {
  const actor = await requireUser("/calendar");
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.LANDLORD) throw new Error("You do not have permission to create calendar events.");
  const startsAt = parseDateTime(value(formData, "startsAt"));
  const endsAt = parseDateTime(value(formData, "endsAt"));
  const parsed = scheduleSchema.parse({
    title: value(formData, "title"),
    description: nullable(value(formData, "description")),
    type: value(formData, "type") || ScheduleEventType.GENERAL,
    status: value(formData, "status") || ScheduleEventStatus.SCHEDULED,
    visibility: value(formData, "visibility") || ScheduleEventVisibility.PARTICIPANTS,
    startsAt,
    endsAt,
    allDay: value(formData, "allDay") === "on",
    location: nullable(value(formData, "location")),
    meetingUrl: nullable(value(formData, "meetingUrl")),
    reminderMinutes: Number(value(formData, "reminderMinutes") || 60),
    propertyId: nullable(value(formData, "propertyId")),
    unitId: nullable(value(formData, "unitId")),
    taskItemId: nullable(value(formData, "taskItemId")),
    assignedToId: nullable(value(formData, "assignedToId"))
  });
  if (parsed.endsAt <= parsed.startsAt) throw new Error("End time must be after start time.");

  if (actor.role === UserRole.LANDLORD) {
    if (parsed.propertyId) {
      const property = await prisma.property.findFirst({ where: { id: parsed.propertyId, ownerId: actor.userId, isArchived: false }, select: { id: true } });
      if (!property) throw new Error("You can only schedule events for your own portfolio.");
    }
    if (parsed.unitId) {
      const unit = await prisma.unit.findFirst({ where: { id: parsed.unitId, property: { ownerId: actor.userId, isArchived: false } }, select: { id: true, propertyId: true } });
      if (!unit) throw new Error("You can only schedule events for your own rentals.");
      parsed.propertyId = parsed.propertyId ?? unit.propertyId;
    }
  }

  const ids = Array.from(new Set([parsed.assignedToId, actor.userId, ...participantIds(formData)].filter(Boolean) as string[]));
  const event = await prisma.scheduleEvent.create({
    data: {
      ...parsed,
      createdById: actor.userId,
      source: "manual",
      participants: { create: ids.map((userId) => ({ userId })) }
    }
  });
  await writeAuditLog({ actor, action: "CREATE", entityType: "ScheduleEvent", entityId: event.id, message: "Calendar event created.", metadata: { title: event.title, type: event.type, startsAt: event.startsAt } });
  await revalidateCalendarPages();
}

export async function updateScheduleEventStatus(formData: FormData) {
  const actor = await requireUser("/calendar");
  const id = value(formData, "id");
  const status = value(formData, "status") as ScheduleEventStatus;
  if (!Object.values(ScheduleEventStatus).includes(status)) throw new Error("Invalid event status.");
  if (!(await canManageScheduleEvent(actor, id))) throw new Error("You do not have access to this calendar event.");
  await prisma.scheduleEvent.update({ where: { id }, data: { status } });
  await writeAuditLog({ actor, action: "STATUS_CHANGE", entityType: "ScheduleEvent", entityId: id, message: `Calendar event marked ${status}.`, metadata: { status } });
  await revalidateCalendarPages();
}

export async function assignScheduleEvent(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/calendar");
  const id = value(formData, "id");
  const assignedToId = nullable(value(formData, "assignedToId"));
  if (!(await canManageScheduleEvent(actor, id))) throw new Error("You do not have access to this calendar event.");
  await prisma.scheduleEvent.update({ where: { id }, data: { assignedToId } });
  if (assignedToId) {
    await prisma.scheduleEventParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId: assignedToId } },
      update: {},
      create: { eventId: id, userId: assignedToId }
    });
  }
  await writeAuditLog({ actor, action: "UPDATE", entityType: "ScheduleEvent", entityId: id, message: "Calendar event assignment updated.", metadata: { assignedToId } });
  await revalidateCalendarPages();
}

export async function createEventFromTask(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/calendar");
  const taskItemId = value(formData, "taskItemId");
  const startsAt = parseDateTime(value(formData, "startsAt"));
  const endsAt = parseDateTime(value(formData, "endsAt"));
  if (!startsAt || !endsAt || endsAt <= startsAt) throw new Error("Choose a valid start and end time.");
  const task = await prisma.taskItem.findFirst({
    where: { id: taskItemId, ...(actor.role === UserRole.LANDLORD ? { OR: [{ property: { ownerId: actor.userId, isArchived: false } }, { unit: { property: { ownerId: actor.userId, isArchived: false } } }, { createdById: actor.userId }, { assignedToId: actor.userId }] } : {}) },
    select: { id: true, title: true, description: true, type: true, propertyId: true, unitId: true, assignedToId: true }
  });
  if (!task) throw new Error("Task not found.");
  const event = await prisma.scheduleEvent.create({
    data: {
      title: task.title,
      description: task.description,
      type: task.type === "MAINTENANCE" ? ScheduleEventType.MAINTENANCE : task.type === "INSPECTION" ? ScheduleEventType.INSPECTION : task.type === "MOVE_IN" ? ScheduleEventType.MOVE_IN : task.type === "MOVE_OUT" ? ScheduleEventType.MOVE_OUT : task.type === "LEASING" ? ScheduleEventType.TOUR : ScheduleEventType.TASK,
      startsAt,
      endsAt,
      propertyId: task.propertyId,
      unitId: task.unitId,
      taskItemId: task.id,
      assignedToId: task.assignedToId,
      createdById: actor.userId,
      source: "task",
      participants: { create: Array.from(new Set([actor.userId, task.assignedToId].filter(Boolean) as string[])).map((userId) => ({ userId })) }
    }
  });
  await writeAuditLog({ actor, action: "CREATE", entityType: "ScheduleEvent", entityId: event.id, message: "Task scheduled on calendar.", metadata: { taskItemId } });
  await revalidateCalendarPages();
}
