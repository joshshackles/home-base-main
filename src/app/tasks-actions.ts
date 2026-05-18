"use server";

import { TaskItemPriority, TaskItemStatus, TaskItemType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageTask, getTaskScopeWhere } from "@/lib/tasks";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullable(value: string) {
  return value.length > 0 ? value : null;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const taskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  type: z.nativeEnum(TaskItemType),
  priority: z.nativeEnum(TaskItemPriority),
  dueAt: z.date().nullable().optional(),
  propertyId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  applicationId: z.string().nullable().optional(),
  maintenanceRequestId: z.string().nullable().optional(),
  leasePacketId: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional()
});

async function revalidateTaskPages() {
  revalidatePath("/admin/tasks");
  revalidatePath("/landlord/tasks");
  revalidatePath("/applicant/tasks");
  revalidatePath("/admin");
  revalidatePath("/landlord");
  revalidatePath("/applicant");
}

export async function createTaskItem(formData: FormData) {
  const actor = await requireUser("/tasks");
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.LANDLORD) throw new Error("You do not have permission to create tasks.");
  const parsed = taskSchema.parse({
    title: value(formData, "title"),
    description: nullable(value(formData, "description")),
    type: value(formData, "type") || TaskItemType.GENERAL,
    priority: value(formData, "priority") || TaskItemPriority.NORMAL,
    dueAt: parseDate(value(formData, "dueAt")),
    propertyId: nullable(value(formData, "propertyId")),
    unitId: nullable(value(formData, "unitId")),
    applicationId: nullable(value(formData, "applicationId")),
    maintenanceRequestId: nullable(value(formData, "maintenanceRequestId")),
    leasePacketId: nullable(value(formData, "leasePacketId")),
    documentId: nullable(value(formData, "documentId")),
    assignedToId: nullable(value(formData, "assignedToId"))
  });

  if (actor.role === UserRole.LANDLORD) {
    if (parsed.propertyId) {
      const property = await prisma.property.findFirst({ where: { id: parsed.propertyId, ownerId: actor.userId, isArchived: false }, select: { id: true } });
      if (!property) throw new Error("You can only create tasks for your own portfolio.");
    }
    if (parsed.unitId) {
      const unit = await prisma.unit.findFirst({ where: { id: parsed.unitId, property: { ownerId: actor.userId, isArchived: false } }, select: { id: true, propertyId: true } });
      if (!unit) throw new Error("You can only create tasks for your own rentals.");
      parsed.propertyId = parsed.propertyId ?? unit.propertyId;
    }
  }

  const task = await prisma.taskItem.create({ data: { ...parsed, createdById: actor.userId, source: "manual" } });
  await writeAuditLog({ actor, action: "CREATE", entityType: "TaskItem", entityId: task.id, message: "Task created.", metadata: { title: task.title, type: task.type, priority: task.priority } });
  await revalidateTaskPages();
}

export async function updateTaskStatus(formData: FormData) {
  const actor = await requireUser("/tasks");
  const id = value(formData, "id");
  const status = value(formData, "status") as TaskItemStatus;
  if (!Object.values(TaskItemStatus).includes(status)) throw new Error("Invalid task status.");
  if (!(await canManageTask(actor, id))) throw new Error("You do not have access to this task.");
  await prisma.taskItem.update({
    where: { id },
    data: {
      status,
      completedAt: status === TaskItemStatus.DONE ? new Date() : null,
      cancelledAt: status === TaskItemStatus.CANCELLED ? new Date() : null
    }
  });
  await writeAuditLog({ actor, action: status === TaskItemStatus.DONE ? "COMPLETE" : "STATUS_CHANGE", entityType: "TaskItem", entityId: id, message: `Task marked ${status}.`, metadata: { status } });
  await revalidateTaskPages();
}

export async function assignTaskItem(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/tasks");
  const id = value(formData, "id");
  const assignedToId = nullable(value(formData, "assignedToId"));
  if (!(await canManageTask(actor, id))) throw new Error("You do not have access to this task.");
  await prisma.taskItem.update({ where: { id }, data: { assignedToId } });
  await writeAuditLog({ actor, action: "UPDATE", entityType: "TaskItem", entityId: id, message: "Task assignment updated.", metadata: { assignedToId } });
  await revalidateTaskPages();
}

export async function createTaskFromMaintenance(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/tasks");
  const maintenanceRequestId = value(formData, "maintenanceRequestId");
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: maintenanceRequestId, ...(actor.role === UserRole.LANDLORD ? { unit: { property: { ownerId: actor.userId, isArchived: false } } } : {}) },
    include: { unit: true }
  });
  if (!request) throw new Error("Maintenance request not found.");
  const task = await prisma.taskItem.create({
    data: {
      title: `Work order: ${request.subject}`,
      description: request.description,
      type: TaskItemType.MAINTENANCE,
      priority: request.priority === "URGENT" ? TaskItemPriority.URGENT : request.priority === "HIGH" ? TaskItemPriority.HIGH : TaskItemPriority.NORMAL,
      unitId: request.unitId,
      propertyId: request.unit?.propertyId ?? null,
      maintenanceRequestId: request.id,
      assignedToId: request.assignedToId,
      createdById: actor.userId,
      source: "maintenance"
    }
  });
  await writeAuditLog({ actor, action: "CONVERT", entityType: "TaskItem", entityId: task.id, message: "Maintenance request converted to task/work order.", metadata: { maintenanceRequestId } });
  await revalidateTaskPages();
}
