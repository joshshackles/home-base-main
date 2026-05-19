"use server";

import {
  AccountAccessRequestStatus,
  AccountAccessType,
  AuditAction,
  ConnectionRole,
  ConnectionStatus,
  DocumentCategory,
  DocumentStatus,
  DocumentVisibility,
  MaintenanceRequestStatus,
  NotificationDeliveryStatus,
  NotificationTemplateKey,
  TaskItemPriority,
  TaskItemStatus,
  TaskItemType,
  VendorInvoiceStatus,
  VendorPayoutStatus,
  VendorWorkLogStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { createVendorInvitation } from "@/lib/vendor-invitations";
import { saveUploadedDocument } from "@/lib/storage";

function text(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function dollarsToCents(raw: string) {
  const normalized = raw.replace(/[$,]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

function parseNullableDate(raw: string) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function revalidateVendorPages() {
  revalidatePath("/admin/vendors");
  revalidatePath("/landlord/vendors");
  revalidatePath("/vendor");
  revalidatePath("/vendor/jobs");
  revalidatePath("/vendor/invoices");
  revalidatePath("/admin/maintenance");
  revalidatePath("/landlord/maintenance");
}

async function assertOwnerCanUseUnit(
  actor: Awaited<ReturnType<typeof requireUser>>,
  unitId: string | null,
) {
  if (!unitId || actor.role === "ADMIN") return null;
  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      property: { ownerId: actor.userId, isArchived: false },
    },
    select: { id: true, property: { select: { ownerId: true } } },
  });
  if (!unit) throw new Error("You can only use rentals from your portfolio.");
  return unit;
}

async function ownerIdForActor(
  actor: Awaited<ReturnType<typeof requireUser>>,
  unitId?: string | null,
) {
  if (actor.role !== "ADMIN") return actor.userId;
  if (unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { property: { select: { ownerId: true } } },
    });
    return unit?.property.ownerId ?? actor.userId;
  }
  return actor.userId;
}

const externalVendorInvitationSchema = z.object({
  companyName: z.string().min(2).max(160),
  contactName: z.string().max(120).nullable(),
  trade: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).nullable(),
  unitId: z.string().nullable(),
  licenseNumber: z.string().max(80).nullable(),
  insuranceExpiresAt: z.date().nullable(),
  hourlyRate: z.number().int().min(0).nullable(),
  isPreferred: z.boolean(),
  notes: z.string().max(2000).nullable(),
});

const vendorProfileSchema = z.object({
  vendorUserId: z.string().min(1),
  companyName: z.string().min(2).max(160),
  trade: z.string().min(2).max(100),
  phone: z.string().max(40).nullable(),
  email: z.string().email().nullable().optional(),
  unitId: z.string().nullable(),
  licenseNumber: z.string().max(80).nullable(),
  insuranceExpiresAt: z.date().nullable(),
  hourlyRate: z.number().int().min(0).nullable(),
  isPreferred: z.boolean(),
  notes: z.string().max(2000).nullable(),
});

const recurringMaintenanceSchema = z.object({
  unitId: z.string().min(1),
  title: z.string().min(3).max(160),
  description: z.string().max(2000).nullable(),
  dueAt: z.date().nullable(),
  cadence: z.string().max(80).nullable(),
  assignedToId: z.string().nullable(),
  priority: z.nativeEnum(TaskItemPriority).default(TaskItemPriority.NORMAL),
});

export async function inviteExternalVendor(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/vendors");
  const parsed = externalVendorInvitationSchema.parse({
    companyName: text(formData, "companyName"),
    contactName: optionalText(formData, "contactName"),
    trade: text(formData, "trade"),
    email: text(formData, "email").toLowerCase(),
    phone: optionalText(formData, "phone"),
    unitId: optionalText(formData, "unitId"),
    licenseNumber: optionalText(formData, "licenseNumber"),
    insuranceExpiresAt: parseNullableDate(text(formData, "insuranceExpiresAt")),
    hourlyRate: text(formData, "hourlyRate")
      ? dollarsToCents(text(formData, "hourlyRate"))
      : null,
    isPreferred: text(formData, "isPreferred") === "yes",
    notes: optionalText(formData, "notes"),
  });

  await assertOwnerCanUseUnit(actor, parsed.unitId);
  const ownerUserId = await ownerIdForActor(actor, parsed.unitId);

  await createVendorInvitation({
    ownerUserId,
    createdById: actor.userId,
    unitId: parsed.unitId,
    email: parsed.email,
    companyName: parsed.companyName,
    contactName: parsed.contactName,
    trade: parsed.trade,
    phone: parsed.phone,
    licenseNumber: parsed.licenseNumber,
    insuranceExpiresAt: parsed.insuranceExpiresAt,
    hourlyRate: parsed.hourlyRate,
    isPreferred: parsed.isPreferred,
    notes: parsed.notes,
    actor,
  });

  await revalidateVendorPages();
}

export async function createVendorProfile(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/vendors");
  const parsed = vendorProfileSchema.parse({
    vendorUserId: text(formData, "vendorUserId"),
    companyName: text(formData, "companyName"),
    trade: text(formData, "trade"),
    phone: optionalText(formData, "phone"),
    email: optionalText(formData, "email"),
    unitId: optionalText(formData, "unitId"),
    licenseNumber: optionalText(formData, "licenseNumber"),
    insuranceExpiresAt: parseNullableDate(text(formData, "insuranceExpiresAt")),
    hourlyRate: text(formData, "hourlyRate")
      ? dollarsToCents(text(formData, "hourlyRate"))
      : null,
    isPreferred: text(formData, "isPreferred") === "yes",
    notes: optionalText(formData, "notes"),
  });

  await assertOwnerCanUseUnit(actor, parsed.unitId);
  const ownerUserId = await ownerIdForActor(actor, parsed.unitId);

  const profile = await prisma.vendorProfile.upsert({
    where: { userId: parsed.vendorUserId },
    update: {
      ownerUserId,
      companyName: parsed.companyName,
      trade: parsed.trade,
      phone: parsed.phone,
      email: parsed.email,
      unitId: parsed.unitId,
      licenseNumber: parsed.licenseNumber,
      insuranceExpiresAt: parsed.insuranceExpiresAt,
      hourlyRate: parsed.hourlyRate,
      isPreferred: parsed.isPreferred,
      notes: parsed.notes,
      isActive: true,
      inviteStatus: "ACCEPTED",
    },
    create: {
      userId: parsed.vendorUserId,
      ownerUserId,
      companyName: parsed.companyName,
      trade: parsed.trade,
      phone: parsed.phone,
      email: parsed.email,
      unitId: parsed.unitId,
      licenseNumber: parsed.licenseNumber,
      insuranceExpiresAt: parsed.insuranceExpiresAt,
      hourlyRate: parsed.hourlyRate,
      isPreferred: parsed.isPreferred,
      notes: parsed.notes,
      createdById: actor.userId,
    },
  });

  const existingAccess = await prisma.accountAccessRequest.findFirst({
    where: { userId: parsed.vendorUserId, type: AccountAccessType.VENDOR },
    select: { id: true },
  });
  if (existingAccess) {
    await prisma.accountAccessRequest.update({
      where: { id: existingAccess.id },
      data: {
        status: AccountAccessRequestStatus.APPROVED,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        reviewNote: "Enabled from Vendor Portal.",
      },
    });
  } else {
    await prisma.accountAccessRequest.create({
      data: {
        userId: parsed.vendorUserId,
        type: AccountAccessType.VENDOR,
        status: AccountAccessRequestStatus.APPROVED,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        organization: parsed.companyName,
        reason: "Vendor Portal access.",
      },
    });
  }

  await prisma.profileConnection.upsert({
    where: {
      landlordUserId_targetUserId_scopeKey_assignedRole: {
        landlordUserId: ownerUserId,
        targetUserId: parsed.vendorUserId,
        scopeKey: parsed.unitId ?? "PORTFOLIO",
        assignedRole: ConnectionRole.PREFERRED_VENDOR,
      },
    },
    update: {
      status: ConnectionStatus.ACTIVE,
      unitId: parsed.unitId,
      notes: parsed.notes,
    },
    create: {
      landlordUserId: ownerUserId,
      targetUserId: parsed.vendorUserId,
      unitId: parsed.unitId,
      scopeKey: parsed.unitId ?? "PORTFOLIO",
      assignedRole: ConnectionRole.PREFERRED_VENDOR,
      status: ConnectionStatus.ACTIVE,
      notes: parsed.notes,
    },
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "VendorProfile",
    entityId: profile.id,
    message: "Vendor profile enabled.",
    metadata: {
      vendorUserId: parsed.vendorUserId,
      companyName: parsed.companyName,
      trade: parsed.trade,
    },
  });
  await revalidateVendorPages();
}

export async function assignVendorToMaintenance(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/vendors");
  const requestId = text(formData, "maintenanceRequestId");
  const vendorUserId = optionalText(formData, "vendorUserId");
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      unit: {
        select: {
          id: true,
          property: { select: { ownerId: true, isArchived: true } },
        },
      },
    },
  });
  if (!request) throw new Error("Maintenance request not found.");
  if (actor.role !== "ADMIN" && request.unit?.property.ownerId !== actor.userId)
    throw new Error(
      "You can only assign vendors to your maintenance requests.",
    );
  await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      assignedToId: vendorUserId,
      status: vendorUserId
        ? MaintenanceRequestStatus.WAITING_ON_VENDOR
        : request.status,
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "MaintenanceRequest",
    entityId: requestId,
    message: vendorUserId
      ? "Vendor assigned to maintenance request."
      : "Vendor assignment cleared.",
    metadata: { vendorUserId },
  });
  await revalidateVendorPages();
}

export async function acceptVendorMaintenanceJob(formData: FormData) {
  const actor = await requireUser("/vendor/jobs");
  await assertVendorPortalAccess(actor);
  const requestId = text(formData, "maintenanceRequestId");
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, assignedToId: true, subject: true, status: true },
  });
  if (!request || request.assignedToId !== actor.userId) throw new Error("You can only accept assigned vendor jobs.");
  await prisma.$transaction([
    prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: { status: MaintenanceRequestStatus.IN_PROGRESS },
    }),
    prisma.vendorWorkLog.create({
      data: {
        vendorUserId: actor.userId,
        maintenanceRequestId: request.id,
        status: VendorWorkLogStatus.ON_SITE,
        title: "Vendor accepted job",
        notes: optionalText(formData, "notes") ?? "Accepted from mobile field mode.",
        createdById: actor.userId,
      },
    }),
  ]);
  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "MaintenanceRequest",
    entityId: request.id,
    message: `Vendor accepted job: ${request.subject}.`,
  });
  await revalidateVendorPages();
}

export async function addVendorWorkLog(formData: FormData) {
  const actor = await requireUser("/vendor/jobs");
  await assertVendorPortalAccess(actor);
  const maintenanceRequestId = optionalText(formData, "maintenanceRequestId");
  const status =
    (text(formData, "status") as VendorWorkLogStatus) ||
    VendorWorkLogStatus.NOTE;
  if (!Object.values(VendorWorkLogStatus).includes(status))
    throw new Error("Invalid work-log status.");
  if (maintenanceRequestId) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: maintenanceRequestId },
      select: { assignedToId: true },
    });
    if (!request || request.assignedToId !== actor.userId)
      throw new Error("You can only update assigned vendor jobs.");
  }
  const log = await prisma.vendorWorkLog.create({
    data: {
      vendorUserId: actor.userId,
      vendorProfileId: optionalText(formData, "vendorProfileId"),
      maintenanceRequestId,
      status,
      title: text(formData, "title") || "Vendor update",
      notes: optionalText(formData, "notes"),
      laborMinutes: text(formData, "laborMinutes")
        ? Number(text(formData, "laborMinutes"))
        : null,
      materialsCost: text(formData, "materialsCost")
        ? dollarsToCents(text(formData, "materialsCost"))
        : null,
      createdById: actor.userId,
    },
  });
  if (maintenanceRequestId) {
    if (status === VendorWorkLogStatus.COMPLETED) {
      await prisma.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: {
          status: MaintenanceRequestStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    } else if (
      status === VendorWorkLogStatus.EN_ROUTE ||
      status === VendorWorkLogStatus.ON_SITE
    ) {
      await prisma.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: { status: MaintenanceRequestStatus.IN_PROGRESS },
      });
    }
  }
  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "VendorWorkLog",
    entityId: log.id,
    message: "Vendor work log created.",
    metadata: { maintenanceRequestId, status },
  });
  await revalidateVendorPages();
}

export async function uploadVendorMaintenancePhoto(formData: FormData) {
  const actor = await requireUser("/vendor/jobs");
  await assertVendorPortalAccess(actor);
  const maintenanceRequestId = text(formData, "maintenanceRequestId");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("A field photo is required.");
  if (!file.type.startsWith("image/")) throw new Error("Field updates only accept image files.");
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: maintenanceRequestId },
    include: { unit: { select: { id: true, property: { select: { ownerId: true } } } } },
  });
  if (!request || request.assignedToId !== actor.userId) throw new Error("You can only upload photos for assigned vendor jobs.");
  const stored = await saveUploadedDocument(file);
  const document = await prisma.document.create({
    data: {
      title: text(formData, "title") || `Field photo - ${request.subject}`,
      category: DocumentCategory.OTHER,
      status: DocumentStatus.UPLOADED,
      visibility: DocumentVisibility.LANDLORD,
      ...stored,
      unitId: request.unitId,
      applicationId: request.applicationId,
      uploadedById: actor.userId,
      notes: optionalText(formData, "notes") ?? `Maintenance photo for ${request.subject}.`,
    },
  });
  await prisma.vendorWorkLog.create({
    data: {
      vendorUserId: actor.userId,
      maintenanceRequestId: request.id,
      status: VendorWorkLogStatus.NOTE,
      title: "Field photo uploaded",
      notes: document.title,
      createdById: actor.userId,
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.UPLOAD,
    entityType: "Document",
    entityId: document.id,
    message: "Vendor uploaded maintenance field photo.",
    metadata: { maintenanceRequestId },
  });
  await revalidateVendorPages();
}

export async function createVendorEstimate(formData: FormData) {
  const actor = await requireUser("/vendor/jobs");
  await assertVendorPortalAccess(actor);
  const maintenanceRequestId = text(formData, "maintenanceRequestId");
  const amount = dollarsToCents(text(formData, "amount"));
  if (amount <= 0) throw new Error("Estimate amount must be greater than zero.");
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: maintenanceRequestId },
    select: {
      id: true,
      subject: true,
      assignedToId: true,
      unitId: true,
      unit: { select: { property: { select: { ownerId: true } } } },
    },
  });
  if (!request || request.assignedToId !== actor.userId) throw new Error("You can only estimate assigned vendor jobs.");
  const ownerUserId = request.unit?.property.ownerId;
  if (!ownerUserId) throw new Error("Estimate needs a landlord owner.");
  const estimate = await prisma.vendorInvoice.create({
    data: {
      vendorUserId: actor.userId,
      ownerUserId,
      unitId: request.unitId,
      maintenanceRequestId: request.id,
      title: text(formData, "title") || `Estimate: ${request.subject}`,
      description: optionalText(formData, "description"),
      amount,
      status: VendorInvoiceStatus.SUBMITTED,
      submittedAt: new Date(),
      createdById: actor.userId,
    },
  });
  await prisma.vendorWorkLog.create({
    data: {
      vendorUserId: actor.userId,
      maintenanceRequestId: request.id,
      status: VendorWorkLogStatus.NOTE,
      title: "Estimate submitted",
      notes: `${estimate.title} for ${amount} cents.`,
      createdById: actor.userId,
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.SEND,
    entityType: "VendorInvoice",
    entityId: estimate.id,
    message: "Vendor estimate submitted for approval.",
    metadata: { maintenanceRequestId, amount },
  });
  await revalidateVendorPages();
}

export async function createVendorInvoice(formData: FormData) {
  const actor = await requireUser("/vendor/invoices");
  await assertVendorPortalAccess(actor);
  const maintenanceRequestId = optionalText(formData, "maintenanceRequestId");
  let ownerUserId = optionalText(formData, "ownerUserId");
  let unitId = optionalText(formData, "unitId");
  if (maintenanceRequestId) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: maintenanceRequestId },
      select: {
        assignedToId: true,
        unitId: true,
        unit: { select: { property: { select: { ownerId: true } } } },
      },
    });
    if (!request || request.assignedToId !== actor.userId)
      throw new Error("You can only invoice assigned vendor jobs.");
    ownerUserId = ownerUserId ?? request.unit?.property.ownerId ?? null;
    unitId = unitId ?? request.unitId;
  }
  if (!ownerUserId) throw new Error("Invoices need an owner/landlord.");
  const amount = dollarsToCents(text(formData, "amount"));
  if (amount <= 0) throw new Error("Invoice amount must be greater than zero.");
  const submitNow = text(formData, "submitNow") === "yes";
  const invoice = await prisma.vendorInvoice.create({
    data: {
      vendorUserId: actor.userId,
      vendorProfileId: optionalText(formData, "vendorProfileId"),
      ownerUserId,
      unitId,
      maintenanceRequestId,
      invoiceNumber: optionalText(formData, "invoiceNumber"),
      title: text(formData, "title") || "Vendor invoice",
      description: optionalText(formData, "description"),
      amount,
      status: submitNow
        ? VendorInvoiceStatus.SUBMITTED
        : VendorInvoiceStatus.DRAFT,
      submittedAt: submitNow ? new Date() : null,
      createdById: actor.userId,
    },
  });
  await writeAuditLog({
    actor,
    action: submitNow ? AuditAction.SEND : AuditAction.CREATE,
    entityType: "VendorInvoice",
    entityId: invoice.id,
    message: submitNow
      ? "Vendor invoice submitted."
      : "Vendor invoice drafted.",
    metadata: { amount, maintenanceRequestId },
  });
  await prisma.notificationDelivery
    .create({
      data: {
        recipientUserId: ownerUserId,
        key: NotificationTemplateKey.MAINTENANCE_UPDATE,
        status: NotificationDeliveryStatus.SENT,
        title: "Vendor invoice submitted",
        body: `${actor.name || actor.email} submitted an invoice for ${text(formData, "title") || "vendor work"}.`,
        actionHref: "/landlord/vendors",
        entityType: "VendorInvoice",
        entityId: invoice.id,
        priority: 2,
        createdById: actor.userId,
        sentAt: new Date(),
      },
    })
    .catch(() => null);
  await revalidateVendorPages();
}

export async function updateVendorInvoiceStatus(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/vendors");
  const id = text(formData, "id");
  const status = text(formData, "status") as VendorInvoiceStatus;
  if (!Object.values(VendorInvoiceStatus).includes(status))
    throw new Error("Invalid invoice status.");
  const invoice = await prisma.vendorInvoice.findUnique({
    where: { id },
    include: { unit: { select: { property: { select: { ownerId: true } } } } },
  });
  if (!invoice) throw new Error("Vendor invoice not found.");
  if (
    actor.role !== "ADMIN" &&
    invoice.ownerUserId !== actor.userId &&
    invoice.unit?.property.ownerId !== actor.userId
  )
    throw new Error("You can only review invoices for your portfolio.");
  await prisma.vendorInvoice.update({
    where: { id },
    data: {
      status,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
      submittedAt:
        status === VendorInvoiceStatus.SUBMITTED ? new Date() : undefined,
      paidAt: status === VendorInvoiceStatus.PAID ? new Date() : undefined,
      rejectionReason:
        status === VendorInvoiceStatus.REJECTED
          ? optionalText(formData, "rejectionReason")
          : null,
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.STATUS_CHANGE,
    entityType: "VendorInvoice",
    entityId: id,
    message: `Vendor invoice marked ${status}.`,
    metadata: { status },
  });
  await revalidateVendorPages();
}

export async function approveVendorInvoiceForPayout(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/vendors");
  const id = text(formData, "id");
  const invoice = await prisma.vendorInvoice.findUnique({
    where: { id },
    include: {
      unit: { select: { property: { select: { ownerId: true } } } },
      maintenanceRequest: true,
    },
  });
  if (!invoice) throw new Error("Vendor invoice not found.");
  if (
    actor.role !== "ADMIN" &&
    invoice.ownerUserId !== actor.userId &&
    invoice.unit?.property.ownerId !== actor.userId
  )
    throw new Error("You can only approve invoices for your portfolio.");
  const payout = await prisma.vendorPayout.create({
    data: {
      ownerUserId: invoice.ownerUserId,
      vendorUserId: invoice.vendorUserId,
      unitId: invoice.unitId,
      maintenanceRequestId: invoice.maintenanceRequestId,
      amount: invoice.amount,
      description: invoice.title,
      status: VendorPayoutStatus.APPROVAL_REQUIRED,
    },
  });
  await prisma.vendorInvoice.update({
    where: { id },
    data: {
      status: VendorInvoiceStatus.APPROVED,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
      vendorPayoutId: payout.id,
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "VendorPayout",
    entityId: payout.id,
    message: "Vendor payout prepared from approved invoice.",
    metadata: { invoiceId: id, amount: invoice.amount },
  });
  await revalidateVendorPages();
}

export async function createRecurringMaintenanceTask(formData: FormData) {
  const actor = await requireRole(["ADMIN", "LANDLORD"], "/landlord/maintenance");
  const parsed = recurringMaintenanceSchema.parse({
    unitId: text(formData, "unitId"),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    dueAt: parseNullableDate(text(formData, "dueAt")),
    cadence: optionalText(formData, "cadence"),
    assignedToId: optionalText(formData, "assignedToId"),
    priority: (text(formData, "priority") as TaskItemPriority) || TaskItemPriority.NORMAL,
  });
  await assertOwnerCanUseUnit(actor, parsed.unitId);
  const task = await prisma.taskItem.create({
    data: {
      unitId: parsed.unitId,
      title: parsed.title,
      description: parsed.description,
      type: TaskItemType.MAINTENANCE,
      status: TaskItemStatus.TODO,
      priority: parsed.priority,
      dueAt: parsed.dueAt,
      assignedToId: parsed.assignedToId,
      createdById: actor.userId,
      source: "recurring_maintenance",
      metadata: { cadence: parsed.cadence ?? "one-time", mobileFieldMode: true },
    },
  });
  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "TaskItem",
    entityId: task.id,
    message: "Recurring maintenance task created.",
    metadata: { cadence: parsed.cadence, unitId: parsed.unitId },
  });
  revalidatePath("/landlord/maintenance");
  revalidatePath("/admin/maintenance");
  revalidatePath("/landlord/tasks");
}
