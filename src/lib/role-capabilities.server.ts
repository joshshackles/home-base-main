import { AccountAccessRequestStatus, AccountAccessType, ConnectionRole, ConnectionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCapabilitySet, canAccessWorkspace, getHomeForCapabilitySet, hasCapability, type RoleCapabilityKey, type RoleWorkspace, type UserCapabilitySet } from "@/lib/role-capabilities";

export async function getUserCapabilitySet(user: Pick<SessionPayload, "userId" | "role">): Promise<UserCapabilitySet> {
  const [approvedAccess, vendorProfile, vendorConnection] = await Promise.all([
    prisma.accountAccessRequest.findMany({
      where: {
        userId: user.userId,
        status: AccountAccessRequestStatus.APPROVED
      },
      select: { type: true }
    }),
    prisma.vendorProfile.findFirst({ where: { userId: user.userId, isActive: true }, select: { id: true } }),
    prisma.profileConnection.findFirst({
      where: {
        targetUserId: user.userId,
        assignedRole: ConnectionRole.PREFERRED_VENDOR,
        status: ConnectionStatus.ACTIVE
      },
      select: { id: true }
    })
  ]);

  const accessTypes = approvedAccess.map((access) => access.type);
  if ((vendorProfile || vendorConnection) && !accessTypes.includes(AccountAccessType.VENDOR)) {
    accessTypes.push(AccountAccessType.VENDOR);
  }

  return buildCapabilitySet(user.role, accessTypes);
}

export async function requireWorkspaceAccess(workspace: RoleWorkspace, nextPath: string) {
  const user = await requireUser(nextPath);
  const capabilitySet = await getUserCapabilitySet(user);

  if (!canAccessWorkspace(capabilitySet, workspace)) {
    redirect(getHomeForCapabilitySet(capabilitySet));
  }

  return { user, capabilitySet };
}

export async function requireCapability(capability: RoleCapabilityKey, nextPath: string) {
  const user = await requireUser(nextPath);
  const capabilitySet = await getUserCapabilitySet(user);

  if (!hasCapability(capabilitySet, capability)) {
    redirect(getHomeForCapabilitySet(capabilitySet));
  }

  return { user, capabilitySet };
}
