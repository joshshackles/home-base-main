"use server";

import { redirect } from "next/navigation";
import { AuditAction, SecurityEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { appUrl, createSecureToken, hashToken } from "@/lib/tokens";
import { formDataToObject, passwordResetRequestSchema, passwordResetSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";
import { sendEmail } from "@/lib/email";

const RESET_TOKEN_MINUTES = 45;

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(validationMessage(parsed.error))}`);
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isActive: true } });

  if (user?.isActive) {
    const token = createSecureToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000)
      }
    });
    const resetLink = `${appUrl()}/reset-password?token=${token}`;
    const emailResult = await sendEmail({
      to: email,
      subject: "Reset your HomeBase MLS password",
      body: `Hello,\n\nA password reset was requested for your HomeBase MLS account. This link expires in ${RESET_TOKEN_MINUTES} minutes.\n\nReset your password here: ${resetLink}\n\nIf you did not request this, you can ignore this message.`
    });
    await writeSecurityEvent({ type: SecurityEventType.PASSWORD_RESET_REQUESTED, userId: user.id, email, message: "Password reset requested.", metadata: { emailDeliveryStatus: emailResult.ok ? "SENT" : "FAILED", emailProvider: emailResult.provider } });
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = passwordResetSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(`/reset-password?error=${encodeURIComponent(validationMessage(parsed.error))}`);
  }

  const tokenHash = hashToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
      isActive: true
    },
    select: { id: true, email: true, role: true }
  });

  if (!user) {
    redirect(`/reset-password?error=${encodeURIComponent("This reset link is invalid or expired.")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(parsed.data.password),
      passwordChangedAt: new Date(),
      forcePasswordReset: false,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  await writeAuditLog({ actor: { userId: user.id, email: user.email, role: user.role }, action: AuditAction.UPDATE, entityType: "User", entityId: user.id, message: "Password reset completed." });
  await writeSecurityEvent({ type: SecurityEventType.PASSWORD_RESET_COMPLETED, userId: user.id, email: user.email, message: "Password reset completed." });
  redirect("/login?message=Password%20updated.%20Please%20sign%20in.");
}
