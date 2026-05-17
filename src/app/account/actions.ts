"use server";

import { redirect } from "next/navigation";
import { AuditAction, SecurityEventType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { formDataToObject, passwordChangeSchema, validationMessage } from "@/lib/validation";
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
