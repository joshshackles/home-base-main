"use server";

import { AuditAction, LeasePacketStatus, MaintenancePriority, MessageThreadStatus, MessageThreadType, SignatureRole, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import { formDataToObject, leadNoteSchema, applicationNoteSchema, leaseSignatureSchema, propertySchema, unitSchema, validationMessage } from "@/lib/validation";
import { baseSignatureRequestWhere, completeSignatureRequest } from "@/lib/signature-workflow";
import { removeStoredDocument, saveUploadedDocument } from "@/lib/storage";

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

const singleFamilyHomeSchema = z.object({
  name: z.string().trim().max(160).optional(),
  addressLine: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zip: z.string().trim().min(5).max(10),
  status: z.nativeEnum(UnitStatus).default(UnitStatus.AVAILABLE),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  rentAmount: z.coerce.number().int().min(0).max(100000),
  deposit: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).nullable()),
  squareFeet: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).nullable()),
  voucherFriendly: z.coerce.boolean().default(false),
  utilitiesNote: z.string().trim().max(2000).optional(),
  petPolicy: z.string().trim().max(2000).optional(),
  accessibility: z.string().trim().max(2000).optional(),
  schoolDistrict: z.string().trim().max(160).optional(),
  neighborhood: z.string().trim().max(160).optional(),
  nearbyFeatures: z.string().trim().max(2000).optional(),
  yearBuilt: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).nullable()),
  roofAgeYears: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).max(150).nullable()),
  averageUtilityBill: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).nullable()),
  parkingInfo: z.string().trim().max(2000).optional(),
  laundryInfo: z.string().trim().max(2000).optional(),
  appliancesIncluded: z.string().trim().max(2000).optional(),
  flooringInfo: z.string().trim().max(2000).optional(),
  yardInfo: z.string().trim().max(2000).optional(),
  smokingPolicy: z.string().trim().max(1000).optional(),
  leaseTermsNote: z.string().trim().max(2000).optional(),
  moveInFeesNote: z.string().trim().max(2000).optional(),
  rentDueDay: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(1).max(31).nullable()),
  lateFeePolicy: z.string().trim().max(2000).optional(),
  previousTenantNotes: z.string().trim().max(4000).optional(),
  description: z.string().trim().max(4000).optional()
});

const MAX_UNIT_PHOTOS = 12;

function cleanOptionalText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
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

export async function createLandlordProperty(formData: FormData) {
  const user = await requireLandlordAction();
  const raw = formDataToObject(formData);
  raw.ownerId = user.userId;
  raw.isArchived = false;
  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const created = await prisma.property.create({
    data: {
      ...parsed.data,
      ownerId: user.userId,
      isArchived: false
    }
  });

  await writeAuditLog({
    actor: user,
    action: AuditAction.CREATE,
    entityType: "Property",
    entityId: created.id,
    message: `Landlord created property ${created.name}.`
  });

  revalidateLandlord();
  redirect("/landlord/units/new?property=created");
}

export async function createLandlordSingleFamilyHome(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = singleFamilyHomeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  if (parsed.data.status === UnitStatus.ARCHIVED) throw new Error("Landlords cannot archive homes from the landlord portal.");

  const propertyName = parsed.data.name?.trim() || parsed.data.addressLine;
  const created = await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        name: propertyName,
        addressLine: parsed.data.addressLine,
        city: parsed.data.city,
        state: parsed.data.state,
        zip: parsed.data.zip,
        description: parsed.data.description || null,
        ownerId: user.userId,
        isArchived: false
      }
    });

    const unit = await tx.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "Home",
        bedrooms: parsed.data.bedrooms,
        bathrooms: parsed.data.bathrooms,
        rentAmount: parsed.data.rentAmount,
        deposit: parsed.data.deposit,
        squareFeet: parsed.data.squareFeet,
        voucherFriendly: parsed.data.voucherFriendly,
        utilitiesNote: parsed.data.utilitiesNote || null,
        petPolicy: parsed.data.petPolicy || null,
        accessibility: parsed.data.accessibility || null,
        schoolDistrict: cleanOptionalText(parsed.data.schoolDistrict),
        neighborhood: cleanOptionalText(parsed.data.neighborhood),
        nearbyFeatures: cleanOptionalText(parsed.data.nearbyFeatures),
        yearBuilt: parsed.data.yearBuilt,
        roofAgeYears: parsed.data.roofAgeYears,
        averageUtilityBill: parsed.data.averageUtilityBill,
        parkingInfo: cleanOptionalText(parsed.data.parkingInfo),
        laundryInfo: cleanOptionalText(parsed.data.laundryInfo),
        appliancesIncluded: cleanOptionalText(parsed.data.appliancesIncluded),
        flooringInfo: cleanOptionalText(parsed.data.flooringInfo),
        yardInfo: cleanOptionalText(parsed.data.yardInfo),
        smokingPolicy: cleanOptionalText(parsed.data.smokingPolicy),
        leaseTermsNote: cleanOptionalText(parsed.data.leaseTermsNote),
        moveInFeesNote: cleanOptionalText(parsed.data.moveInFeesNote),
        rentDueDay: parsed.data.rentDueDay,
        lateFeePolicy: cleanOptionalText(parsed.data.lateFeePolicy),
        previousTenantNotes: cleanOptionalText(parsed.data.previousTenantNotes),
        description: parsed.data.description || null,
        status: parsed.data.status
      }
    });

    return { property, unit };
  });

  await writeAuditLog({
    actor: user,
    action: AuditAction.CREATE,
    entityType: "Unit",
    entityId: created.unit.id,
    message: `Landlord created single-family home listing ${created.property.name}.`
  });

  revalidateLandlord();
  redirect(`/landlord/units/${created.unit.id}?home=created`);
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

export async function uploadLandlordUnitPhotos(formData: FormData) {
  const user = await requireLandlordAction();
  const unitId = getRequiredId(formData, "Unit ID");
  await assertOwnsUnit(unitId, user.userId);

  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) throw new Error("Choose at least one image to upload.");

  const existing = await prisma.unitPhoto.count({ where: { unitId } });
  if (existing + files.length > MAX_UNIT_PHOTOS) {
    throw new Error(`Each unit can have up to ${MAX_UNIT_PHOTOS} photos. Remove a photo before uploading more.`);
  }

  const hasFeatured = await prisma.unitPhoto.findFirst({ where: { unitId, isFeatured: true }, select: { id: true } });
  const createdIds: string[] = [];

  for (const [index, file] of files.entries()) {
    if (!file.type.startsWith("image/")) throw new Error("Unit photos must be image files.");
    const stored = await saveUploadedDocument(file);
    const created = await prisma.unitPhoto.create({
      data: {
        unitId,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storagePath: stored.storagePath,
        sortOrder: existing + index,
        isFeatured: !hasFeatured && index === 0
      }
    });
    createdIds.push(created.id);
  }

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: unitId, message: `Landlord uploaded ${createdIds.length} unit photo(s).` });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${unitId}`);
  redirect(`/landlord/units/${unitId}?photos=uploaded`);
}

export async function setFeaturedLandlordUnitPhoto(formData: FormData) {
  const user = await requireLandlordAction();
  const unitId = getRequiredId(formData, "Unit ID");
  const photoId = typeof formData.get("photoId") === "string" ? String(formData.get("photoId")).trim() : "";
  if (!photoId) throw new Error("Photo ID is required.");
  await assertOwnsUnit(unitId, user.userId);

  const photo = await prisma.unitPhoto.findFirst({ where: { id: photoId, unitId }, select: { id: true } });
  if (!photo) throw new Error("Photo was not found for this unit.");

  await prisma.$transaction([
    prisma.unitPhoto.updateMany({ where: { unitId }, data: { isFeatured: false } }),
    prisma.unitPhoto.update({ where: { id: photo.id }, data: { isFeatured: true } })
  ]);

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: unitId, message: "Landlord changed the featured unit photo." });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${unitId}`);
  redirect(`/landlord/units/${unitId}?photos=featured`);
}

export async function deleteLandlordUnitPhoto(formData: FormData) {
  const user = await requireLandlordAction();
  const unitId = getRequiredId(formData, "Unit ID");
  const photoId = typeof formData.get("photoId") === "string" ? String(formData.get("photoId")).trim() : "";
  if (!photoId) throw new Error("Photo ID is required.");
  await assertOwnsUnit(unitId, user.userId);

  const photo = await prisma.unitPhoto.findFirst({ where: { id: photoId, unitId } });
  if (!photo) throw new Error("Photo was not found for this unit.");

  await prisma.unitPhoto.delete({ where: { id: photo.id } });
  await removeStoredDocument(photo.storagePath);

  if (photo.isFeatured) {
    const nextPhoto = await prisma.unitPhoto.findFirst({ where: { unitId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    if (nextPhoto) await prisma.unitPhoto.update({ where: { id: nextPhoto.id }, data: { isFeatured: true } });
  }

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: unitId, message: "Landlord deleted a unit photo." });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${unitId}`);
  redirect(`/landlord/units/${unitId}?photos=deleted`);
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
