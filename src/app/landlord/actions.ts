"use server";

import { AccountAccessType, AuditAction, ApplicationStatus, ConnectionRole, ConnectionStatus, LeasePacketStatus, MaintenancePriority, MessageThreadStatus, MessageThreadType, RentalLifecycleStatus, SignatureRole, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
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
import { sendEmail } from "@/lib/email";
import { appUrl, createSecureToken, hashToken } from "@/lib/tokens";
import { syncUnitStaffConnections, upsertProfileConnection } from "@/lib/profile-connections";

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

const tenantAssignmentSchema = z.object({
  unitId: z.string().trim().min(1),
  tenantUserId: z.string().trim().optional(),
  tenantName: z.string().trim().max(160).optional(),
  tenantEmail: z.string().trim().email().optional(),
  tenantPhone: z.string().trim().max(40).optional()
});

const staffAssignmentSchema = z.object({
  unitId: z.string().trim().min(1),
  propertyManagerUserId: z.string().trim().optional(),
  maintenanceUserId: z.string().trim().optional(),
  caseworkerUserId: z.string().trim().optional()
});

const rentalLifecycleSchema = z.object({
  unitId: z.string().trim().min(1),
  lifecycleStatus: z.nativeEnum(RentalLifecycleStatus)
});

const unitContactSchema = z.object({
  unitId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).optional()
});

const unitTermsSchema = z.object({
  unitId: z.string().trim().min(1),
  rentAmount: z.coerce.number().int().min(0).max(100000),
  deposit: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).nullable()),
  averageUtilityBill: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).nullable()),
  rentDueDay: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(1).max(31).nullable()),
  leaseTermsNote: z.string().trim().max(2000).optional(),
  moveInFeesNote: z.string().trim().max(2000).optional(),
  lateFeePolicy: z.string().trim().max(2000).optional()
});

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

async function saveUnitPhotos(unitId: string, files: File[], existing = 0) {
  if (files.length === 0) return [];
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

  return createdIds;
}

function photoFilesFromFormData(formData: FormData) {
  return formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
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
  const photos = photoFilesFromFormData(formData);

  const created = await prisma.unit.create({ data });
  const createdPhotos = await saveUnitPhotos(created.id, photos, 0);
  await writeAuditLog({ actor: user, action: AuditAction.CREATE, entityType: "Unit", entityId: created.id, message: `Landlord created unit ${created.unitNumber}.` });
  if (createdPhotos.length > 0) {
    await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: created.id, message: `Landlord uploaded ${createdPhotos.length} unit photo(s) while creating the unit.` });
  }

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

  const photos = photoFilesFromFormData(formData);
  const createdPhotos = await saveUnitPhotos(created.unit.id, photos, 0);

  await writeAuditLog({
    actor: user,
    action: AuditAction.CREATE,
    entityType: "Unit",
    entityId: created.unit.id,
    message: `Landlord created single-family home listing ${created.property.name}.`
  });
  if (createdPhotos.length > 0) {
    await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: created.unit.id, message: `Landlord uploaded ${createdPhotos.length} home photo(s) while creating the listing.` });
  }

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
  const createdIds = await saveUnitPhotos(unitId, files, existing);

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

async function userHasAccess(userId: string, allowed: AccountAccessType[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      accountAccessRequests: { where: { status: "APPROVED", type: { in: allowed } }, select: { id: true } }
    }
  });
  return Boolean(user && (user.role === UserRole.ADMIN || user.role === UserRole.LANDLORD || (allowed.includes(AccountAccessType.MAINTENANCE) && user.role === UserRole.INSPECTOR) || user.accountAccessRequests.length > 0));
}


export async function updateLandlordUnitLifecycleStatus(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = rentalLifecycleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await assertOwnsUnit(parsed.data.unitId, user.userId);

  const unitStatus = parsed.data.lifecycleStatus === RentalLifecycleStatus.OCCUPIED
    ? UnitStatus.OCCUPIED
    : parsed.data.lifecycleStatus === RentalLifecycleStatus.ARCHIVED
      ? UnitStatus.ARCHIVED
      : parsed.data.lifecycleStatus === RentalLifecycleStatus.MAINTENANCE_HOLD
        ? UnitStatus.UNAVAILABLE
        : parsed.data.lifecycleStatus === RentalLifecycleStatus.APPLICATION_PENDING || parsed.data.lifecycleStatus === RentalLifecycleStatus.LEASE_PENDING || parsed.data.lifecycleStatus === RentalLifecycleStatus.MOVE_IN_SCHEDULED
          ? UnitStatus.PENDING
          : UnitStatus.AVAILABLE;

  await prisma.unit.update({
    where: { id: parsed.data.unitId },
    data: { lifecycleStatus: parsed.data.lifecycleStatus, status: unitStatus }
  });

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: parsed.data.unitId, message: `Updated rental lifecycle to ${parsed.data.lifecycleStatus}.` });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${parsed.data.unitId}`);
  redirect(`/landlord/units/${parsed.data.unitId}?status=updated`);
}

export async function assignLandlordUnitTenant(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = tenantAssignmentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await assertOwnsUnit(parsed.data.unitId, user.userId);

  let createdInviteToken: string | null = null;
  let tenant = parsed.data.tenantUserId
    ? await prisma.user.findUnique({ where: { id: parsed.data.tenantUserId }, select: { id: true, email: true, name: true } })
    : null;

  const email = parsed.data.tenantEmail?.toLowerCase();
  if (!tenant && email) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
    if (existing) {
      tenant = await prisma.user.update({
        where: { id: existing.id },
        data: { name: cleanOptionalText(parsed.data.tenantName) ?? existing.name ?? undefined, role: UserRole.TENANT, isActive: true },
        select: { id: true, email: true, name: true }
      });
    } else {
      createdInviteToken = createSecureToken();
      tenant = await prisma.user.create({
        data: {
          email,
          name: cleanOptionalText(parsed.data.tenantName) ?? email,
          role: UserRole.TENANT,
          isActive: true,
          forcePasswordReset: true,
          passwordResetTokenHash: hashToken(createdInviteToken),
          passwordResetExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        },
        select: { id: true, email: true, name: true }
      });
    }
  }

  if (!tenant) throw new Error("Choose an existing tenant or enter a tenant email address.");

  const application = await prisma.application.create({
    data: {
      unitId: parsed.data.unitId,
      applicantUserId: tenant.id,
      applicantName: cleanOptionalText(parsed.data.tenantName) ?? tenant.name ?? tenant.email,
      applicantEmail: tenant.email,
      applicantPhone: cleanOptionalText(parsed.data.tenantPhone),
      status: ApplicationStatus.APPROVED,
      summary: "Tenant assignment created from landlord unit workflow."
    }
  });

  await prisma.unit.update({
    where: { id: parsed.data.unitId },
    data: {
      tenantUserId: tenant.id,
      currentApplicationId: application.id,
      status: UnitStatus.OCCUPIED,
      lifecycleStatus: RentalLifecycleStatus.OCCUPIED
    }
  });

  await upsertProfileConnection({
    landlordUserId: user.userId,
    targetUserId: tenant.id,
    unitId: parsed.data.unitId,
    assignedRole: ConnectionRole.CONNECTED_RENTER,
    notes: "Current tenant assigned from landlord unit workflow."
  });

  if (createdInviteToken) {
    const inviteUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(createdInviteToken)}`;
    await sendEmail({
      to: tenant.email,
      toName: tenant.name,
      subject: "You've been added to HomeBase",
      body: `You have been added as the tenant for a HomeBase unit. Use this secure link to set your password and join the workflow: ${inviteUrl}`
    });
  }

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: parsed.data.unitId, message: `Assigned tenant ${tenant.email} and marked unit occupied.` });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${parsed.data.unitId}`);
  redirect(`/landlord/units/${parsed.data.unitId}?tenant=assigned`);
}

export async function assignLandlordUnitStaff(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = staffAssignmentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await assertOwnsUnit(parsed.data.unitId, user.userId);

  const propertyManagerUserId = cleanOptionalId(parsed.data.propertyManagerUserId);
  const maintenanceUserId = cleanOptionalId(parsed.data.maintenanceUserId);
  const caseworkerUserId = cleanOptionalId(parsed.data.caseworkerUserId);

  if (propertyManagerUserId && !(await userHasAccess(propertyManagerUserId, [AccountAccessType.PROPERTY_MANAGER, AccountAccessType.LANDLORD]))) throw new Error("Selected property manager does not have approved property manager access.");
  if (maintenanceUserId && !(await userHasAccess(maintenanceUserId, [AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR]))) throw new Error("Selected maintenance contact does not have approved maintenance access.");
  if (caseworkerUserId && !(await userHasAccess(caseworkerUserId, [AccountAccessType.CASEWORKER]))) throw new Error("Selected caseworker does not have approved caseworker access.");

  await prisma.$transaction(async (tx) => {
    await tx.unit.update({
      where: { id: parsed.data.unitId },
      data: { propertyManagerUserId, maintenanceUserId, caseworkerUserId }
    });
  });

  await syncUnitStaffConnections({
    landlordUserId: user.userId,
    unitId: parsed.data.unitId,
    propertyManagerUserId,
    maintenanceUserId,
    caseworkerUserId
  });

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: parsed.data.unitId, message: "Updated unit staff assignments." });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${parsed.data.unitId}`);
  redirect(`/landlord/units/${parsed.data.unitId}?staff=assigned`);
}

export async function addLandlordUnitContact(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = unitContactSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const unit = await prisma.unit.findFirst({ where: { id: parsed.data.unitId, property: { ownerId: user.userId, isArchived: false } }, select: { id: true, importantContacts: true } });
  if (!unit) throw new Error("This unit is not assigned to your landlord account.");

  const parts = [
    parsed.data.name,
    parsed.data.role ? `(${parsed.data.role})` : null,
    parsed.data.email || null,
    parsed.data.phone || null,
    parsed.data.note || null
  ].filter(Boolean);
  const nextContacts = [unit.importantContacts, parts.join(" - ")].filter(Boolean).join("\n");
  await prisma.unit.update({ where: { id: unit.id }, data: { importantContacts: nextContacts } });
  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: unit.id, message: "Added an important unit contact." });
  revalidatePath(`/landlord/units/${unit.id}`);
  redirect(`/landlord/units/${unit.id}?contact=added`);
}


export async function revokeLandlordProfileConnection(formData: FormData) {
  const user = await requireLandlordAction();
  const connectionId = String(formData.get("connectionId") ?? "").trim();
  if (!connectionId) throw new Error("Choose a profile connection to revoke.");

  const connection = await prisma.profileConnection.findFirst({
    where: {
      id: connectionId,
      landlordUserId: user.userId,
      status: ConnectionStatus.ACTIVE
    },
    select: {
      id: true,
      target: { select: { email: true, name: true } },
      assignedRole: true,
      unitId: true
    }
  });

  if (!connection) throw new Error("This profile connection was not found or is already inactive.");

  await prisma.profileConnection.update({
    where: { id: connection.id },
    data: { status: ConnectionStatus.REVOKED }
  });

  await writeAuditLog({
    actor: user,
    action: AuditAction.UPDATE,
    entityType: "ProfileConnection",
    entityId: connection.id,
    message: `Revoked ${connection.assignedRole} access for ${connection.target.email}.`,
    metadata: { unitId: connection.unitId ?? null }
  });

  revalidatePath("/landlord/contacts");
  if (connection.unitId) revalidatePath(`/landlord/units/${connection.unitId}`);
  redirect("/landlord/contacts?status=revoked");
}

export async function updateLandlordUnitTerms(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = unitTermsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await assertOwnsUnit(parsed.data.unitId, user.userId);

  await prisma.unit.update({
    where: { id: parsed.data.unitId },
    data: {
      rentAmount: parsed.data.rentAmount,
      deposit: parsed.data.deposit,
      averageUtilityBill: parsed.data.averageUtilityBill,
      rentDueDay: parsed.data.rentDueDay,
      leaseTermsNote: cleanOptionalText(parsed.data.leaseTermsNote),
      moveInFeesNote: cleanOptionalText(parsed.data.moveInFeesNote),
      lateFeePolicy: cleanOptionalText(parsed.data.lateFeePolicy)
    }
  });

  await writeAuditLog({ actor: user, action: AuditAction.UPDATE, entityType: "Unit", entityId: parsed.data.unitId, message: "Updated rent, deposit, and move-in terms." });
  revalidateLandlord();
  revalidatePath(`/landlord/units/${parsed.data.unitId}`);
  redirect(`/landlord/units/${parsed.data.unitId}?terms=updated`);
}

export async function createLandlordMaintenanceRequest(formData: FormData) {
  const user = await requireLandlordAction();
  const parsed = landlordMaintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await prisma.unit.findFirst({
    where: { id: parsed.data.unitId, property: { ownerId: user.userId, isArchived: false } },
    select: { id: true, maintenanceUserId: true }
  });
  if (!unit) throw new Error("This record is not assigned to your landlord account.");
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
      assignedToId: unit.maintenanceUserId,
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
