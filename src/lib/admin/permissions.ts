import { redirect } from "next/navigation";
import { AccountAccessRequestStatus, AccountAccessType, UserRole } from "@prisma/client";
import { requireRole, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminAccessState = {
  user: SessionPayload;
  isAdmin: boolean;
  isSuperUser: boolean;
  bootstrapMode: boolean;
};

function configuredSuperUserEmails() {
  return (process.env.HOMEBASE_SUPER_USER_EMAILS || process.env.SUPER_USER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function hasExplicitSuperUserGrant(userId: string) {
  const grant = await prisma.accountAccessRequest.findFirst({
    where: {
      userId,
      type: AccountAccessType.SUPER_USER,
      status: AccountAccessRequestStatus.APPROVED
    },
    select: { id: true }
  });

  return Boolean(grant);
}

async function hasAnyExplicitSuperUser() {
  const grant = await prisma.accountAccessRequest.findFirst({
    where: {
      type: AccountAccessType.SUPER_USER,
      status: AccountAccessRequestStatus.APPROVED
    },
    select: { id: true }
  });

  return Boolean(grant);
}

export async function getAdminAccessState(user: SessionPayload): Promise<AdminAccessState> {
  const isAdmin = user.role === UserRole.ADMIN;
  if (!isAdmin) return { user, isAdmin: false, isSuperUser: false, bootstrapMode: false };

  if (configuredSuperUserEmails().includes(user.email.toLowerCase())) {
    return { user, isAdmin: true, isSuperUser: true, bootstrapMode: false };
  }

  if (await hasExplicitSuperUserGrant(user.userId)) {
    return { user, isAdmin: true, isSuperUser: true, bootstrapMode: false };
  }

  const bootstrapMode = !(await hasAnyExplicitSuperUser());
  return { user, isAdmin: true, isSuperUser: bootstrapMode, bootstrapMode };
}

export async function requireAdmin(nextPath = "/admin") {
  const user = await requireRole([UserRole.ADMIN], nextPath);
  return getAdminAccessState(user);
}

export async function requireSuperUser(nextPath = "/admin/command-center") {
  const state = await requireAdmin(nextPath);
  if (state.isSuperUser) return state;
  redirect("/not-authorized");
}

export async function canAccessAdminCommandCenter(user: SessionPayload) {
  return (await getAdminAccessState(user)).isAdmin;
}

export async function canManageSampleData(user: SessionPayload) {
  return (await getAdminAccessState(user)).isSuperUser;
}

export async function canViewSecurityAlerts(user: SessionPayload) {
  return (await getAdminAccessState(user)).isSuperUser;
}

export async function canManageAdminOperations(user: SessionPayload) {
  return (await getAdminAccessState(user)).isSuperUser;
}

export async function canManageSuperUserGrants(user: SessionPayload) {
  return (await getAdminAccessState(user)).isSuperUser;
}

export async function assertSuperUser(user: SessionPayload, message = "Super user access is required for this action.") {
  if ((await getAdminAccessState(user)).isSuperUser) return;
  throw new Error(message);
}

export function isElevatedAccessType(type: AccountAccessType) {
  return type === AccountAccessType.ADMIN || type === AccountAccessType.SUPER_USER;
}
