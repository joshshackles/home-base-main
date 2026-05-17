"use server";

import { AuditAction, LeasePacketStatus, MaintenancePriority, MessageThreadStatus, MessageThreadType, SignatureRole, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import { formDataToObject, leadNoteSchema, applicationNoteSchema, leaseSignatureSchema, unitSchema, validationMessage } from "@/lib/validation";
import { baseSignatureRequestWhere, completeSignatureRequest } from "@/lib/signature-workflow";

async function requireLandlordAction() {
  return await requireRole(["LANDLORD"], "/landlord");
}

const landlordMaintenanceSchema = z.object({
  unitId: z.string().trim().min(1),
  applicationId: z.string().trim().optional(),
  subject: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.NORMAL),
  accessNotes: z.string().trim().max(1000).optional()
});

function getRequiredId(formData: FormData, label: string) {
  const value = formData.get("id");
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} is required.`);
  return value.trim();
}

async function assertOwnsUnit(unitId: string, landlordId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { ownerId: landlordId, isArchived: false } },
    select: { id: true, propertyId: true }
  });

  if (!unit) throw new Error("This record is not assigned to your landlord account.");
  return unit;
}

async function assertOwnsProperty(propertyId: string, landlordId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: landlordId, isArchived: false },
    select: { id: true }
  });

  if (!property) throw new Error("This property is not assigned to your landlord account.");
  return property;
}

async function assertOwnsLead(leadId: string, landlordId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, unit: { property: { ownerId: landlordId, isArchived: false } } },
    select: { id: true }
  });

  if (!lead) throw new Error("This lead is not assigned to your landlord account.");
  return lead;
}

async function assertOwnsApplication(applicationId: string, landlordId: string) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, unit: { property: { ownerId: landlordId, isArchived: false } } },
    select: { id: true }
  });

  if (!application) throw new Error("This application is not assigned to your landlord account.");
  return application;
}

function revalidateLandlord() {
  revalidatePath("/landlord");
  revalidatePath("/landlord/properties");
  revalidatePath("/landlord/units");
  revalidatePath("/landlord/leads");
  revalidatePath("/landlord/applications");
  revalidatePath("/landlord/leases");
  revalidatePath("/marketplace");
}

function cleanOptionalId(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function landlordUnitPayload(formData: FormData, landlordId: string, unitId?: string) {
  const parsed = unitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  if (parsed.data.status === UnitStatus.ARCHIVED) {
    throw new Error("Landlords cannot archive units from the landlord portal.");
  }

  await assertOwnsProperty(parsed.data.propertyId, landlordId);

  if (unitId) {
    await assertOwnsUnit(unitId, landlordId);
  }

  if (parsed.data.tenantUserId) {
    const tenant = await prisma.user.findFirst({
      where: { id: parsed.data.tenantUserId, isActive: true, role: { in: [UserRole.APPLICANT, UserRole.TENANT] } },
      select: { id: true }
    });
    if (!tenant) throw new Error("Selected tenant was not found or is not active.");
  }

  if (parsed.data.currentApplicationId) {
    const application = await prisma.application.findFirst({
      where: {
        id: parsed.data.currentApplicationId,
        unit: { property: { ownerId: landlordId, isArchived: false } }
      },
      select: { id: true, unitId: true, applicantUserId: true }
    });

    if (!application) throw new Error("Selected application is not assigned to your landlord account.");
    if (unitId && application.unitId !== unitId) throw new Error("Selected application must belong to this unit.");
  }

  return parsed.data;
}

export async function createLandlordUnit(formData: FormData) {
  const user = await requireLandlordAction();
  const data = await landlordUnitPayload(formData, user.userId);

  const created = await prisma.unit.create({ data });
  await writeAuditLog({ actor: user, action: AuditAction.CREATE, entityType: "Unit", entityId: created.id, message: `Landlord created unit ${created.unitNumber}.` });

  revalidateLandlord();
  redirect(`/landlord/units/${created.id}`);
}

export async function updateLandlordUnit(formData: FormData) {
  const user = await requireLandlordAction();
  const id = getRequiredId(formData, "Unit ID");
  const data = await landlordUnitPayload(formData, user.userId, id);

  const updated = await prisma.unit.update({ where: { id }, data });
  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: updated.id, message: `Landlord updated unit ${updated.unitNumber}.` });

  revalidateLandlord();
  revalidatePath(`/landlord/units/${id}`);
  redirect(`/landlord/units/${id}`);
}

export async function createLandlordMaintenanceRequest(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = landlordMaintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await assertOwnsUnit(parsed.data.unitId, user.userId);
  const applicationId = cleanOptionalId(parsed.data.applicationId);

  if (applicationId) {
    const application = await assertOwnsApplication(applicationId, user.userId);
    const linked = await prisma.application.findUnique({ where: { id: application.id }, select: { unitId: true } });
    if (linked?.unitId !== unit.id) throw new Error("Selected application must belong to this unit.");
  }

  const created = await prisma.maintenanceRequest.create({
    data: {
      unitId: unit.id,
      applicationId,
      requesterId: user.userId,
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority: parsed.data.priority,
      accessNotes: parsed.data.accessNotes || null,
      messageThreads: {
        create: {
          type: MessageThreadType.MAINTENANCE,
          status: MessageThreadStatus.WAITING_ON_STAFF,
          subject: parsed.data.subject,
          applicationId,
          createdById: user.userId,
          lastMessageAt: new Date(),
          messages: { create: { senderId: user.userId, body: parsed.data.description } }
        }
      }
    }
  });

  await writeAuditLog({ actor: user, action: AuditAction.CREATE, entityType: "MaintenanceRequest", entityId: created.id, message: `Landlord created repair request: ${created.subject}.` });
  revalidatePath(`/landlord/units/${unit.id}`);
  revalidatePath("/landlord/maintenance");
  revalidatePath("/landlord/inbox");
  redirect(`/landlord/units/${unit.id}?repair=created`);
}

export async function addLandlordLeadNote(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = leadNoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsLead(parsed.data.leadId, user.userId);

  await prisma.leadNote.create({
    data: {
      leadId: parsed.data.leadId,
      note: `[Landlord] ${parsed.data.note}`
    }
  });

  revalidateLandlord();
  revalidatePath(`/landlord/leads/${parsed.data.leadId}`);
}

export async function addLandlordApplicationNote(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = applicationNoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(parsed.data.applicationId, user.userId);

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: `[Landlord] ${parsed.data.note}`
    }
  });

  revalidateLandlord();
  revalidatePath(`/landlord/applications/${parsed.data.applicationId}`);
}


export async function signLandlordLease(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = leaseSignatureSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const signature = await completeSignatureRequest({
    actor: user,
    actorLabel: "Landlord",
    signatureText: parsed.data.signatureText,
    requestWhere: baseSignatureRequestWhere({
      requestId: parsed.data.requestId,
      userId: user.userId,
      email: user.email,
      role: SignatureRole.LANDLORD,
      leasePacketWhere: {
        application: { unit: { property: { ownerId: user.userId, isArchived: false } } }
      }
    })
  });

  await completeLeaseIfReadyAndFinalize({ leasePacketId: signature.leasePacketId, actor: user });

  revalidateLandlord();
  revalidatePath(`/landlord/leases/${signature.leasePacketId}`);
  redirect(`/landlord/leases/${signature.leasePacketId}`);
}

