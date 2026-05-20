import { AccountAccessRequestStatus, type AccountAccessRequest } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessTypeToModule, getDashboardHomeForModule, roleToPrimaryModule, type DashboardModule } from "@/lib/dashboard/role-config";

export type DashboardAccess = {
  primaryModule: DashboardModule;
  modules: DashboardModule[];
  approvedAccessTypes: string[];
  accessRequests: Pick<AccountAccessRequest, "id" | "type" | "status" | "organization" | "reason" | "createdAt">[];
};

export async function getUserDashboardAccess(user: Pick<SessionPayload, "userId" | "role">): Promise<DashboardAccess> {
  const accessRequests = await prisma.accountAccessRequest.findMany({
    where: { userId: user.userId },
    select: { id: true, type: true, status: true, organization: true, reason: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  const primaryModule = roleToPrimaryModule[user.role];
  const modules = new Set<DashboardModule>([primaryModule]);

  for (const request of accessRequests) {
    if (request.status === AccountAccessRequestStatus.APPROVED) modules.add(accessTypeToModule[request.type]);
  }

  return {
    primaryModule,
    modules: [...modules],
    approvedAccessTypes: accessRequests.filter((request) => request.status === AccountAccessRequestStatus.APPROVED).map((request) => request.type),
    accessRequests
  };
}

export function canAccessDashboardModule(access: DashboardAccess, module: DashboardModule) {
  return access.modules.includes(module);
}

export function getDashboardHomeForRole(access: DashboardAccess) {
  return getDashboardHomeForModule(access.primaryModule);
}
