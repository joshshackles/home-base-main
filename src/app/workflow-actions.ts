"use server";

import { AccountAccessType, AuditAction, MaintenancePriority, MaintenanceRequestStatus, MessageThreadStatus, MessageThreadType, SecurityEventType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";

const maintenanceSchema = z.object({
  unitId: z.string().optional(),
  applicationId: z.string().optional(),
  subject: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.NORMAL),
  accessNotes: z.string().trim().max(1000).optional()
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(MaintenanceRequestStatus),
  assignedToId: z.string().optional()
});

const messageSchema = z.object({
  threadId: z.string().optional(),
  subject: z.string().trim().min(3).max(160).optional(),
  body: z.string().trim().min(2).max(4000),
  type: z.nativeEnum(MessageThreadType).default(MessageThreadType.GENERAL),
  applicationId: z.string().optional(),
  maintenanceRequestId: z.string().optional(),
  isInternal: z.coerce.boolean().optional()
});

function obj(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function cleanId(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

async function ensureApplicantApplicationAccess(userId: string, email: string, applicationId?: string) {
  if (!applicationId) return null;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, OR: [{ applicantUserId: userId }, { applicantEmail: email }] },
    select: { id: true, unitId: true }
  });
  if (!application) throw new Error("Application was not found or is not connected to your account.");
  return application;
}

async function ensureStaffMaintenanceAccess(user: { userId: string; role: UserRole }, id: string) {
  if (user.role === UserRole.ADMIN) {
    return await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id } });
  }

  return await prisma.maintenanceRequest.findFirstOrThrow({
    where: { id, unit: { property: { ownerId: user.userId } } }
  });
}

async function hasStaffMessagingAccess(user: { userId: string; role: UserRole }) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.LANDLORD || user.role === UserRole.INSPECTOR) return true;

  const approvedAccess = await prisma.accountAccessRequest.findFirst({
    where: {
      userId: user.userId,
      status: "APPROVED",
      type: { in: [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER, AccountAccessType.CASEWORKER, AccountAccessType.INSPECTOR, AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR] }
    },
    select: { id: true }
  });

  return Boolean(approvedAccess);
}

export async function createMaintenanceRequest(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/maintenance");
  const parsed = maintenanceSchema.parse(obj(formData));
  const applicationId = cleanId(parsed.applicationId);
  const application = await ensureApplicantApplicationAccess(user.userId, user.email, applicationId);

  const unitId = application?.unitId ?? cleanId(parsed.unitId);
  if (!unitId) throw new Error("Select a unit or application for this request.");

  const created = await prisma.maintenanceRequest.create({
    data: {
      unitId,
      applicationId: application?.id ?? null,
      requesterId: user.userId,
      subject: parsed.subject,
      description: parsed.description,
      priority: parsed.priority,
      accessNotes: parsed.accessNotes || null,
      messageThreads: {
        create: {
          type: MessageThreadType.MAINTENANCE,
          status: MessageThreadStatus.WAITING_ON_STAFF,
          subject: parsed.subject,
          applicationId: application?.id ?? null,
          createdById: user.userId,
          lastMessageAt: new Date(),
          messages: { create: { senderId: user.userId, body: parsed.description } }
        }
      }
    }
  });

  await writeAuditLog({ actor: user, action: AuditAction.CREATE, entityType: "MaintenanceRequest", entityId: created.id, message: `Created maintenance request: ${created.subject}.` });
  await writeSecurityEvent({ type: SecurityEventType.MAINTENANCE_REQUEST_CREATED, userId: user.userId, email: user.email, message: `Maintenance request created: ${created.subject}.`, metadata: { maintenanceRequestId: created.id } });
  revalidatePath("/applicant/maintenance");
  revalidatePath("/admin/maintenance");
  redirect("/applicant/maintenance?created=1");
}

export async function updateMaintenanceRequestStatus(formData: FormData) {
  const user = await requireRole(["ADMIN", "LANDLORD"], "/admin/maintenance");
  const parsed = statusSchema.parse(obj(formData));
  await ensureStaffMaintenanceAccess(user, parsed.id);
  const completedAt = parsed.status === MaintenanceRequestStatus.COMPLETED ? new Date() : null;
  await prisma.maintenanceRequest.update({
    where: { id: parsed.id },
    data: { status: parsed.status, assignedToId: cleanId(parsed.assignedToId) ?? null, completedAt }
  });
  await writeAuditLog({ actor: user, action: AuditAction.STATUS_CHANGE, entityType: "MaintenanceRequest", entityId: parsed.id, message: `Updated maintenance status to ${parsed.status}.` });
  revalidatePath("/admin/maintenance");
  revalidatePath("/landlord/maintenance");
  revalidatePath("/applicant/maintenance");
}

export async function sendWorkflowMessage(formData: FormData) {
  const user = await requireUser("/inbox");
  const parsed = messageSchema.parse(obj(formData));
  const isStaff = await hasStaffMessagingAccess(user);
  const isInternal = Boolean(parsed.isInternal && isStaff);
  let threadId = cleanId(parsed.threadId);

  if (!threadId) {
    if (!parsed.subject) throw new Error("Subject is required for a new message thread.");
    const created = await prisma.messageThread.create({
      data: {
        type: parsed.type,
        status: isStaff ? MessageThreadStatus.WAITING_ON_APPLICANT : MessageThreadStatus.WAITING_ON_STAFF,
        subject: parsed.subject,
        applicationId: cleanId(parsed.applicationId) ?? null,
        maintenanceRequestId: cleanId(parsed.maintenanceRequestId) ?? null,
        createdById: user.userId,
        lastMessageAt: new Date(),
        messages: { create: { senderId: user.userId, body: parsed.body, isInternal } }
      }
    });
    threadId = created.id;
  } else {
    await prisma.$transaction([
      prisma.message.create({ data: { threadId, senderId: user.userId, body: parsed.body, isInternal } }),
      prisma.messageThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date(), status: isStaff ? MessageThreadStatus.WAITING_ON_APPLICANT : MessageThreadStatus.WAITING_ON_STAFF } })
    ]);
  }

  await writeAuditLog({ actor: user, action: AuditAction.NOTE, entityType: "MessageThread", entityId: threadId, message: "Sent workflow message." });
  await writeSecurityEvent({ type: SecurityEventType.MESSAGE_SENT, userId: user.userId, email: user.email, message: "Workflow message sent.", metadata: { threadId } });
  revalidatePath("/admin/inbox");
  revalidatePath("/landlord/inbox");
  revalidatePath("/applicant/inbox");
}
