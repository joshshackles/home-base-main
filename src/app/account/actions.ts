"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AccountAccessType, AuditAction, SecurityEventType, UserRole } from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { accountAccessRequestSchema, accountAccessReviewSchema, formDataToObject, passwordChangeSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";

function errorRedirect(message: string): never {
  redirect(`/account/password?error=${encodeURIComponent(message)}`);
}

export async function changePasswordAction(formData: FormData) {
  const actor = await requireUser("/account/password");
  const parsed = passwordChangeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) errorRedirect(validationMessage(parsed.error));

  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { id: true, email: true, passwordHash: true } });
  if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    errorRedirect("Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: actor.userId },
    data: {
      passwordHash: hashPassword(parsed.data.newPassword),
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "User", entityId: actor.userId, message: "User changed their password." });
  await writeSecurityEvent({ type: SecurityEventType.PASSWORD_CHANGED, userId: actor.userId, email: actor.email, message: "Password changed by signed-in user." });
  redirect("/account/password?success=Password%20updated");
}

export async function requestAccountAccessAction(formData: FormData) {
  const actor = await requireUser("/applicant");
  const parsed = accountAccessRequestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const existing = await prisma.accountAccessRequest.findFirst({
    where: {
      userId: actor.userId,
      type: parsed.data.type,
      status: { in: ["PENDING", "APPROVED"] }
    },
    select: { id: true }
  });

  if (!existing) {
    await prisma.accountAccessRequest.create({
      data: {
        userId: actor.userId,
        type: parsed.data.type,
        organization: parsed.data.organization,
        reason: parsed.data.reason
      }
    });

    await writeAuditLog({
      actor,
      action: AuditAction.CREATE,
      entityType: "AccountAccessRequest",
      message: `Requested ${parsed.data.type.toLowerCase().replaceAll("_", " ")} access.`
    });
  }

  revalidatePath("/applicant");
  revalidatePath("/landlord");
  revalidatePath("/admin");
  redirect("/applicant?access=requested");
}

const accessTypeToUserRole: Partial<Record<AccountAccessType, UserRole>> = {
  [AccountAccessType.LANDLORD]: UserRole.LANDLORD,
  [AccountAccessType.INSPECTOR]: UserRole.INSPECTOR,
  [AccountAccessType.ADMIN]: UserRole.ADMIN
};

export async function reviewAccountAccessAction(formData: FormData) {
  const actor = await requireRole([UserRole.ADMIN], "/admin/users");
  const parsed = accountAccessReviewSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const request = await prisma.accountAccessRequest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, userId: true, type: true, status: true }
  });

  if (!request) throw new Error("Access request was not found.");
  if (request.status !== "PENDING") {
    revalidatePath("/admin");
    redirect("/admin?access=already-reviewed");
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountAccessRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.status,
        reviewNote: parsed.data.reviewNote,
        reviewedById: actor.userId,
        reviewedAt: new Date()
      }
    });

    const promotedRole = parsed.data.status === "APPROVED" ? accessTypeToUserRole[request.type] : null;
    if (promotedRole) {
      await tx.user.update({
        where: { id: request.userId },
        data: { role: promotedRole }
      });
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "AccountAccessRequest",
    entityId: request.id,
    message: `${parsed.data.status.toLowerCase()} ${request.type.toLowerCase().replaceAll("_", " ")} access request.`
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/applicant");
  revalidatePath("/landlord");
  redirect("/admin?access=reviewed");
}
