"use server";

import { LeaseTemplateKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

function text(formData: FormData, key: string, label: string, max = 20000) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} is required.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function optionalText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${key} must be ${max} characters or fewer.`);
  return trimmed;
}

function kind(formData: FormData) {
  const raw = formData.get("kind");
  return Object.values(LeaseTemplateKind).includes(raw as LeaseTemplateKind) ? raw as LeaseTemplateKind : LeaseTemplateKind.RESIDENTIAL;
}

function state(formData: FormData) {
  const value = optionalText(formData, "jurisdictionState", 2);
  return value ? value.toUpperCase() : null;
}

export async function createLandlordLeaseTemplate(formData: FormData) {
  const actor = await requireRole(["LANDLORD"], "/landlord/lease-templates");
  const template = await prisma.leaseTemplate.create({
    data: {
      name: text(formData, "name", "Template name", 160),
      description: optionalText(formData, "description"),
      body: text(formData, "body", "Template body"),
      kind: kind(formData),
      jurisdictionState: state(formData),
      isActive: formData.get("isActive") === "on",
      isSystem: false,
      ownerUserId: actor.userId
    }
  });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "LeaseTemplate", entityId: template.id, message: `Created landlord lease template ${template.name}.` });
  revalidatePath("/landlord/lease-templates");
  redirect("/landlord/lease-templates");
}

export async function updateLandlordLeaseTemplate(formData: FormData) {
  const actor = await requireRole(["LANDLORD"], "/landlord/lease-templates");
  const id = text(formData, "id", "Template ID", 120);
  const existing = await prisma.leaseTemplate.findFirst({ where: { id, ownerUserId: actor.userId }, select: { id: true, version: true } });
  if (!existing) throw new Error("You can only edit templates owned by your landlord account.");
  const template = await prisma.leaseTemplate.update({
    where: { id },
    data: {
      name: text(formData, "name", "Template name", 160),
      description: optionalText(formData, "description"),
      body: text(formData, "body", "Template body"),
      kind: kind(formData),
      jurisdictionState: state(formData),
      isActive: formData.get("isActive") === "on",
      version: { increment: 1 }
    }
  });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "LeaseTemplate", entityId: template.id, message: `Updated landlord lease template ${template.name}.` });
  revalidatePath("/landlord/lease-templates");
  revalidatePath(`/landlord/lease-templates/${id}`);
}
