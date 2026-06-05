"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createActivePlatformFeePolicy } from "@/lib/payments/platform-fee-policy";

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseFloat(String(formData.get(key) ?? ""));
  return Number.isFinite(value) ? value : fallback;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createActivePlatformFeePolicyAction(formData: FormData) {
  const actor = await requireRole(["ADMIN"], "/admin/payments/platform-revenue");
  const policy = await createActivePlatformFeePolicy({
    name: optionalString(formData, "name") ?? "HomeBase platform fee",
    description: optionalString(formData, "description"),
    percent: numberFromForm(formData, "percent", 1),
    fixedCents: Math.round(numberFromForm(formData, "fixedDollars", 0) * 100),
    createdById: actor.userId,
    auditNote: optionalString(formData, "auditNote") ?? "Platform fee policy updated from the admin revenue center."
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "PlatformFeePolicyRecord",
    entityId: policy.id,
    message: "Updated active HomeBase platform fee policy.",
    metadata: { policyId: policy.id, percent: policy.percent, fixedCents: policy.fixedCents, appliesTo: policy.appliesTo }
  });

  revalidatePath("/admin/payments/platform-revenue");
  revalidatePath("/landlord/payments");
  redirect("/admin/payments/platform-revenue?policy=updated");
}
