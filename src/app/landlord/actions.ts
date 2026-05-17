"use server";

import { AuditAction, LeasePacketStatus, SignatureRole, SignatureStatus, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import { formDataToObject, leadNoteSchema, applicationNoteSchema, leaseSignatureSchema, unitSchema, validationMessage } from "@/lib/validation";

async function requireLandlordAction() {
  return await requireRole(["LANDLORD"], "/landlord");
}

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

export async function updateLandlordUnit(formData: FormData) {
  const user = await requireLandlordAction();
  const id = getRequiredId(formData, "Unit ID");
  await assertOwnsUnit(id, user.userId);

  const parsed = unitSchema.omit({ propertyId: true }).safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  if (parsed.data.status === UnitStatus.ARCHIVED) {
    throw new Error("Landlords cannot archive units from the landlord portal.");
  }

  await prisma.unit.update({
    where: { id },
    data: parsed.data
  });

  revalidateLandlord();
  redirect("/landlord/units");
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

  const request = await prisma.signatureRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      signerRole: SignatureRole.LANDLORD,
      status: SignatureStatus.PENDING,
      leasePacket: {
        status: LeasePacketStatus.SENT_FOR_SIGNATURE,
        application: { unit: { property: { ownerId: user.userId, isArchived: false } } }
      },
      OR: [{ signerUserId: user.userId }, { signerEmail: user.email }]
    },
    include: { leasePacket: { select: { id: true, applicationId: true } } }
  });

  if (!request) throw new Error("This signature request is not available for your landlord account.");
  if (request.expiresAt && request.expiresAt < new Date()) {
    await prisma.signatureRequest.update({ where: { id: request.id }, data: { status: SignatureStatus.EXPIRED } });
    throw new Error("This signature request has expired. Please ask the administrator to resend or extend it.");
  }

  const h = headers();
  await prisma.signatureRequest.update({
    where: { id: request.id },
    data: {
      signerUserId: user.userId,
      signatureText: parsed.data.signatureText,
      status: SignatureStatus.SIGNED,
      signedAt: new Date(),
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null
    }
  });

  await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[Landlord] ${user.email} signed the lease packet.` } });
  await writeAuditLog({ actor: user, action: AuditAction.SIGN, entityType: "SignatureRequest", entityId: request.id, message: `Landlord signature completed by ${user.email}.`, metadata: { leasePacketId: request.leasePacketId } });
  await completeLeaseIfReadyAndFinalize({ leasePacketId: request.leasePacketId, actor: user });

  revalidateLandlord();
  revalidatePath(`/landlord/leases/${request.leasePacketId}`);
  redirect(`/landlord/leases/${request.leasePacketId}`);
}
