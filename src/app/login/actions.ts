"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createDatabaseSession, setSessionCookie, clearSessionCookie, getVerifiedCurrentUser, getRequestClientMetadata, revokeCurrentSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { clearLoginRateLimit, checkLoginRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/public-form-security";
import { formDataToObject, loginSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { writeSecurityEvent } from "@/lib/security-events";
import { AuditAction, SecurityEventType } from "@prisma/client";

const DATABASE_LOCK_THRESHOLD = 8;
const DATABASE_LOCK_MINUTES = 15;

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/applicant";
  return value;
}

function dashboardForRole(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "LANDLORD") return "/landlord";
  if (role === "INSPECTOR") return "/admin/inspections";
  if (role === "APPLICANT" || role === "TENANT") return "/applicant";
  return "/marketplace";
}

function destinationForRole(next: string, role: string, forcePasswordReset?: boolean) {
  if (forcePasswordReset) return "/account/password?reason=required";
  if (next.startsWith("/admin") && role !== "ADMIN" && role !== "INSPECTOR") return dashboardForRole(role);
  if (next.startsWith("/landlord") && role !== "LANDLORD") return dashboardForRole(role);
  if (next.startsWith("/applicant") && role !== "APPLICANT" && role !== "TENANT") return dashboardForRole(role);
  return next;
}

async function recordFailedLogin(email: string, userId?: string | null, currentFailedCount = 0) {
  const nextFailedCount = currentFailedCount + 1;
  const shouldLock = nextFailedCount >= DATABASE_LOCK_THRESHOLD;
  const lockedUntil = shouldLock ? new Date(Date.now() + DATABASE_LOCK_MINUTES * 60 * 1000) : null;

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: nextFailedCount,
        lockedUntil
      }
    });
  }

  await writeSecurityEvent({
    type: shouldLock ? SecurityEventType.ACCOUNT_LOCKED : SecurityEventType.LOGIN_FAILURE,
    userId: userId ?? null,
    email,
    message: shouldLock ? "Account temporarily locked after repeated failed login attempts." : "Failed login attempt."
  });
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(validationMessage(parsed.error))}&next=${encodeURIComponent("/applicant")}`);
  }

  const { email, password } = parsed.data;
  const next = safeNextPath(parsed.data.next || "/applicant");

  const clientIp = getClientIp();
  const rateLimit = await checkLoginRateLimit(email, clientIp);

  if (rateLimit.limited) {
    await writeSecurityEvent({
      type: SecurityEventType.LOGIN_FAILURE,
      email,
      message: `Durable login rate limit reached. Reset at ${rateLimit.resetAt.toISOString()}.`
    });
    redirect(`/login?error=${encodeURIComponent("Too many login attempts. Please wait a few minutes and try again.")}&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
      forcePasswordReset: true,
      failedLoginCount: true,
      lockedUntil: true
    }
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await writeSecurityEvent({ type: SecurityEventType.LOGIN_FAILURE, userId: user.id, email, message: "Login blocked because the account is temporarily locked." });
    redirect(`/login?error=${encodeURIComponent("This account is temporarily locked. Please wait a few minutes and try again, or reset the password.")}&next=${encodeURIComponent(next)}`);
  }

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    await recordFailedLogin(email, user?.id, user?.failedLoginCount ?? 0);
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}&next=${encodeURIComponent(next)}`);
  }

  await clearLoginRateLimit(email, clientIp);

  const token = await createDatabaseSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }, getRequestClientMetadata());

  setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await writeAuditLog({ actor: { userId: user.id, email: user.email, role: user.role }, action: AuditAction.LOGIN, entityType: "Session", entityId: user.id, message: "User signed in." });
  await writeSecurityEvent({ type: SecurityEventType.LOGIN_SUCCESS, userId: user.id, email: user.email, message: "Successful login." });
  redirect(destinationForRole(next, user.role, user.forcePasswordReset));
}

export async function logoutAction() {
  const user = await getVerifiedCurrentUser();
  await revokeCurrentSession();
  clearSessionCookie();
  if (user) {
    await writeAuditLog({ actor: user, action: AuditAction.LOGOUT, entityType: "Session", entityId: user.userId, message: "User signed out." });
    await writeSecurityEvent({ type: SecurityEventType.LOGOUT, userId: user.userId, email: user.email, message: "User signed out." });
  }
  redirect("/");
}
