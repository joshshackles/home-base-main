import { MaintenancePriority, MaintenanceRequestStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerVendorCenter } from "@/lib/vendors";
import type { PlatformContext } from "@/lib/platform/types";

export type MaintenanceCommandCenterFilters = {
  status?: string;
  priority?: string;
  q?: string;
};

export const CLOSED_MAINTENANCE_STATUSES: MaintenanceRequestStatus[] = [
  MaintenanceRequestStatus.COMPLETED,
  MaintenanceRequestStatus.CANCELLED
];

export function slaDueAt(createdAt: Date, priority: string) {
  const hours = priority === "URGENT" ? 24 : priority === "HIGH" ? 48 : priority === "LOW" ? 168 : 96;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function isOpenMaintenanceStatus(status: MaintenanceRequestStatus) {
  return !CLOSED_MAINTENANCE_STATUSES.includes(status);
}

export function getMaintenanceNextAction(request: {
  status: MaintenanceRequestStatus;
  assignedToId: string | null;
  vendorInvoices: { status: string }[];
}) {
  if (request.status === MaintenanceRequestStatus.COMPLETED) return "Review closeout notes";
  if (request.status === MaintenanceRequestStatus.CANCELLED) return "Review cancellation history";
  if (request.vendorInvoices.some((invoice) => invoice.status === "SUBMITTED")) return "Review vendor estimate";
  if (!request.assignedToId) return "Assign staff or vendor";
  if (request.status === MaintenanceRequestStatus.WAITING_ON_TENANT) return "Message tenant for access";
  if (request.status === MaintenanceRequestStatus.WAITING_ON_VENDOR) return "Follow up with vendor";
  if (request.status === MaintenanceRequestStatus.NEW) return "Triage request";
  return "Track field progress";
}

export async function getLandlordMaintenanceCommandCenter(ctx: PlatformContext, filters: MaintenanceCommandCenterFilters = {}) {
  const selectedStatus = Object.values(MaintenanceRequestStatus).includes(filters.status as MaintenanceRequestStatus)
    ? (filters.status as MaintenanceRequestStatus)
    : undefined;
  const selectedPriority = Object.values(MaintenancePriority).includes(filters.priority as MaintenancePriority)
    ? (filters.priority as MaintenancePriority)
    : undefined;
  const query = filters.q?.trim();

  const baseWhere: Prisma.MaintenanceRequestWhereInput = ctx.actor.role === UserRole.ADMIN ? {} : { unit: { property: { ownerId: ctx.actor.userId } } };
  const requestWhere: Prisma.MaintenanceRequestWhereInput = {
    AND: [
      baseWhere,
      selectedStatus ? { status: selectedStatus } : {},
      selectedPriority ? { priority: selectedPriority } : {},
      query
        ? {
            OR: [
              { subject: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { accessNotes: { contains: query, mode: "insensitive" } },
              { requester: { name: { contains: query, mode: "insensitive" } } },
              { requester: { email: { contains: query, mode: "insensitive" } } },
              { unit: { unitNumber: { contains: query, mode: "insensitive" } } },
              { unit: { property: { name: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {}
    ]
  };

  const [requests, allRequests, staff, vendorCenter] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where: requestWhere,
      include: {
        requester: { select: { name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        unit: { include: { property: true } },
        application: true,
        vendorWorkLogs: { orderBy: { createdAt: "desc" }, take: 3 },
        vendorInvoices: { orderBy: { createdAt: "desc" }, take: 3 },
        messageThreads: { include: { messages: { include: { sender: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 3 } } }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.maintenanceRequest.findMany({
      where: baseWhere,
      include: {
        assignedTo: { select: { id: true } },
        vendorInvoices: { select: { status: true } },
        messageThreads: { select: { messages: { select: { id: true } } } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.LANDLORD, UserRole.INSPECTOR] }, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { email: "asc" }
    }),
    getOwnerVendorCenter(ctx.actor.role === UserRole.ADMIN ? undefined : ctx.actor.userId)
  ]);

  const openRequests = allRequests.filter((request) => isOpenMaintenanceStatus(request.status));
  const unassignedCount = openRequests.filter((request) => !request.assignedToId).length;
  const waitingVendorCount = allRequests.filter((request) => request.status === MaintenanceRequestStatus.WAITING_ON_VENDOR).length;
  const slaRiskCount = openRequests.filter((request) => slaDueAt(request.createdAt, request.priority).getTime() < Date.now()).length;
  const submittedEstimateCount = vendorCenter.invoices.filter((invoice) => invoice.status === "SUBMITTED").length;
  const statusCounts = Object.fromEntries(Object.values(MaintenanceRequestStatus).map((status) => [status, allRequests.filter((request) => request.status === status).length])) as Record<MaintenanceRequestStatus, number>;
  const urgentPriorityCount = allRequests.filter((request) => request.priority === MaintenancePriority.URGENT).length;
  const needsAttention = openRequests
    .filter((request) => !request.assignedToId || request.status === MaintenanceRequestStatus.WAITING_ON_VENDOR || slaDueAt(request.createdAt, request.priority).getTime() < Date.now() || request.vendorInvoices.some((invoice) => invoice.status === "SUBMITTED"))
    .slice(0, 4);

  return {
    filters: {
      selectedStatus,
      selectedPriority,
      query
    },
    requests,
    allRequests,
    staff,
    vendorCenter,
    openRequests,
    metrics: {
      openCount: openRequests.length,
      unassignedCount,
      waitingVendorCount,
      slaRiskCount,
      submittedEstimateCount
    },
    statusCounts,
    urgentPriorityCount,
    needsAttention
  };
}
