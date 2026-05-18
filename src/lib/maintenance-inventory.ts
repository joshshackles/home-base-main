import { MaintenanceAssetStatus, MaintenanceAssetType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string, max = 240) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${key} must be ${max} characters or fewer.`);
  return trimmed;
}

function requiredText(formData: FormData, key: string, label: string, max = 240) {
  const value = text(formData, key, max);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key, 32);
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date.`);
  return date;
}

function optionalCents(formData: FormData, key: string) {
  const value = text(formData, key, 24);
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${key} must be a positive amount.`);
  return Math.round(number * 100);
}

function optionalEnum<T extends Record<string, string>>(formData: FormData, key: string, allowed: T, fallback: T[keyof T]) {
  const value = text(formData, key, 80);
  return Object.values(allowed).includes(value as T[keyof T]) ? (value as T[keyof T]) : fallback;
}

export function maintenanceInventoryPaths(base: "admin" | "landlord") {
  return [`/${base}`, `/${base}/inventory`, `/${base}/maintenance`, `/${base}/reports/maintenance`];
}

export async function getInventoryAssetAccess(assetId: string, ownerId?: string) {
  return prisma.maintenanceAsset.findFirst({
    where: {
      id: assetId,
      ...(ownerId ? { OR: [{ ownerId }, { property: { ownerId } }, { unit: { property: { ownerId } } }] } : {})
    },
    select: { id: true, ownerId: true, unitId: true, propertyId: true, name: true }
  });
}

export async function createMaintenanceAssetFromForm(formData: FormData, options: { actorId: string; ownerId?: string }) {
  const unitId = text(formData, "unitId", 80);
  const propertyId = text(formData, "propertyId", 80);
  let ownerId = options.ownerId ?? text(formData, "ownerId", 80);

  if (unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, ...(options.ownerId ? { property: { ownerId: options.ownerId, isArchived: false } } : {}) },
      select: { id: true, propertyId: true, property: { select: { ownerId: true } } }
    });
    if (!unit) throw new Error("Selected rental was not found or is not in this portfolio.");
    ownerId = ownerId ?? unit.property.ownerId;
  }

  if (propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ...(options.ownerId ? { ownerId: options.ownerId, isArchived: false } : {}) },
      select: { id: true, ownerId: true }
    });
    if (!property) throw new Error("Selected property was not found or is not in this portfolio.");
    ownerId = ownerId ?? property.ownerId;
  }

  const payload: Prisma.MaintenanceAssetCreateInput = {
    type: optionalEnum(formData, "type", MaintenanceAssetType, MaintenanceAssetType.OTHER),
    status: optionalEnum(formData, "status", MaintenanceAssetStatus, MaintenanceAssetStatus.ACTIVE),
    name: requiredText(formData, "name", "Asset name", 120),
    make: text(formData, "make", 120),
    model: text(formData, "model", 120),
    serialNumber: text(formData, "serialNumber", 160),
    location: text(formData, "location", 180),
    installedAt: optionalDate(formData, "installedAt"),
    warrantyExpiresAt: optionalDate(formData, "warrantyExpiresAt"),
    nextServiceDueAt: optionalDate(formData, "nextServiceDueAt"),
    notes: text(formData, "notes", 2000),
    ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
    ...(propertyId ? { property: { connect: { id: propertyId } } } : {}),
    ...(unitId ? { unit: { connect: { id: unitId } } } : {})
  };

  return prisma.maintenanceAsset.create({ data: payload });
}

export async function createAssetServiceRecordFromForm(formData: FormData, options: { actorId: string; ownerId?: string }) {
  const assetId = requiredText(formData, "assetId", "Asset", 80);
  const asset = await getInventoryAssetAccess(assetId, options.ownerId);
  if (!asset) throw new Error("Selected asset was not found or is not in this portfolio.");

  const nextServiceDueAt = optionalDate(formData, "nextServiceDueAt");
  const record = await prisma.assetServiceRecord.create({
    data: {
      assetId,
      createdById: options.actorId,
      serviceDate: optionalDate(formData, "serviceDate") ?? new Date(),
      vendorName: text(formData, "vendorName", 160),
      summary: requiredText(formData, "summary", "Service summary", 1000),
      costCents: optionalCents(formData, "cost"),
      nextServiceDueAt
    }
  });

  await prisma.maintenanceAsset.update({
    where: { id: assetId },
    data: {
      status: nextServiceDueAt ? MaintenanceAssetStatus.ACTIVE : undefined,
      nextServiceDueAt: nextServiceDueAt ?? undefined
    }
  });

  return record;
}

export async function createAssetWarrantyFromForm(formData: FormData, options: { ownerId?: string }) {
  const assetId = requiredText(formData, "assetId", "Asset", 80);
  const asset = await getInventoryAssetAccess(assetId, options.ownerId);
  if (!asset) throw new Error("Selected asset was not found or is not in this portfolio.");
  const expiresAt = optionalDate(formData, "expiresAt");

  const warranty = await prisma.assetWarranty.create({
    data: {
      assetId,
      providerName: text(formData, "providerName", 160),
      policyNumber: text(formData, "policyNumber", 160),
      coverageNotes: text(formData, "coverageNotes", 2000),
      expiresAt,
      documentUrl: text(formData, "documentUrl", 500)
    }
  });

  if (expiresAt) {
    await prisma.maintenanceAsset.update({ where: { id: assetId }, data: { warrantyExpiresAt: expiresAt } });
  }

  return warranty;
}

export async function createKeyLockRecordFromForm(formData: FormData, options: { ownerId?: string }) {
  const assetId = requiredText(formData, "assetId", "Key or lock asset", 80);
  const asset = await getInventoryAssetAccess(assetId, options.ownerId);
  if (!asset) throw new Error("Selected asset was not found or is not in this portfolio.");

  return prisma.keyLockRecord.create({
    data: {
      assetId,
      keyCode: text(formData, "keyCode", 120),
      lockLocation: text(formData, "lockLocation", 180),
      issuedTo: text(formData, "issuedTo", 160),
      issuedAt: optionalDate(formData, "issuedAt"),
      returnedAt: optionalDate(formData, "returnedAt"),
      notes: text(formData, "notes", 1000)
    }
  });
}
