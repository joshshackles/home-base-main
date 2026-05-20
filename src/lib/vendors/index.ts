import {
  AccountAccessRequestStatus,
  AccountAccessType,
  ConnectionRole,
  ConnectionStatus,
  MaintenanceRequestStatus,
  TaskItemStatus,
  UserRole,
  VendorInvoiceStatus,
  VendorPayoutStatus,
  VendorWorkLogStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthorizedUser } from "@/lib/authorization";

export function formatVendorStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SLA_HOURS_BY_PRIORITY = {
  URGENT: 24,
  HIGH: 48,
  NORMAL: 96,
  LOW: 168,
} as const;

function slaDueAt(createdAt: Date, priority: string) {
  const hours = SLA_HOURS_BY_PRIORITY[priority as keyof typeof SLA_HOURS_BY_PRIORITY] ?? SLA_HOURS_BY_PRIORITY.NORMAL;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

function isOpenMaintenance(status: MaintenanceRequestStatus) {
  return status !== MaintenanceRequestStatus.COMPLETED && status !== MaintenanceRequestStatus.CANCELLED;
}

export async function hasVendorPortalAccess(user: AuthorizedUser) {
  if (user.role === UserRole.ADMIN) return true;
  const [profile, access, connection] = await Promise.all([
    prisma.vendorProfile.findFirst({
      where: { userId: user.userId, isActive: true },
      select: { id: true },
    }),
    prisma.accountAccessRequest.findFirst({
      where: {
        userId: user.userId,
        type: AccountAccessType.VENDOR,
        status: AccountAccessRequestStatus.APPROVED,
      },
      select: { id: true },
    }),
    prisma.profileConnection.findFirst({
      where: {
        targetUserId: user.userId,
        assignedRole: ConnectionRole.PREFERRED_VENDOR,
        status: ConnectionStatus.ACTIVE,
      },
      select: { id: true },
    }),
  ]);
  return Boolean(profile || access || connection);
}

export async function assertVendorPortalAccess(user: AuthorizedUser) {
  if (!(await hasVendorPortalAccess(user)))
    throw new Error("Vendor portal access is not enabled for your account.");
}

export async function getVendorAssignableUsers(ownerUserId?: string) {
  const vendorAccessUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        {
          accountAccessRequests: {
            some: {
              type: { in: [AccountAccessType.VENDOR, AccountAccessType.MAINTENANCE] },
              status: AccountAccessRequestStatus.APPROVED,
            },
          },
        },
        {
          targetConnections: {
            some: {
              assignedRole: ConnectionRole.PREFERRED_VENDOR,
              status: ConnectionStatus.ACTIVE,
              ...(ownerUserId ? { landlordUserId: ownerUserId } : {}),
            },
          },
        },
        {
          vendorProfile: ownerUserId
            ? { ownerUserId, isActive: true }
            : { isActive: true },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      vendorProfile: {
        select: { companyName: true, trade: true, isPreferred: true },
      },
    },
    orderBy: { email: "asc" },
  });
  return vendorAccessUsers;
}

export async function getOwnerVendorCenter(ownerUserId?: string) {
  const scopedUnitWhere: Prisma.UnitWhereInput = ownerUserId
    ? { property: { ownerId: ownerUserId, isArchived: false } }
    : {};
  const maintenanceWhere: Prisma.MaintenanceRequestWhereInput = ownerUserId
    ? { unit: { property: { ownerId: ownerUserId, isArchived: false } } }
    : {};
  const invoiceWhere: Prisma.VendorInvoiceWhereInput = ownerUserId
    ? { ownerUserId }
    : {};
  const payoutWhere: Prisma.VendorPayoutWhereInput = ownerUserId
    ? { ownerUserId }
    : {};
  const profileWhere: Prisma.VendorProfileWhereInput = ownerUserId
    ? { ownerUserId }
    : {};
  const invitationWhere: Prisma.VendorInvitationWhereInput = ownerUserId
    ? { ownerUserId }
    : {};

  const [profiles, invitations, jobs, invoices, payouts, units, vendorUsers, recurringTasks] =
    await Promise.all([
      prisma.vendorProfile.findMany({
        where: profileWhere,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: { select: { name: true } },
            },
          },
          _count: { select: { invoices: true, workLogs: true } },
        },
        orderBy: [{ isPreferred: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.vendorInvitation.findMany({
        where: invitationWhere,
        include: {
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: { select: { name: true } },
            },
          },
        },
        orderBy: [{ status: "asc" }, { invitedAt: "desc" }],
        take: 50,
      }),
      prisma.maintenanceRequest.findMany({
        where: maintenanceWhere,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: { select: { name: true } },
            },
          },
          vendorWorkLogs: { orderBy: { createdAt: "desc" }, take: 2 },
          vendorInvoices: { orderBy: { createdAt: "desc" }, take: 3 },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 50,
      }),
      prisma.vendorInvoice.findMany({
        where: invoiceWhere,
        include: {
          vendor: { select: { id: true, name: true, email: true } },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: { select: { name: true } },
            },
          },
          maintenanceRequest: { select: { id: true, subject: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.vendorPayout.findMany({
        where: payoutWhere,
        include: {
          vendor: { select: { id: true, name: true, email: true } },
          unit: {
            select: { unitNumber: true, property: { select: { name: true } } },
          },
          maintenanceRequest: { select: { subject: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.unit.findMany({
        where: scopedUnitWhere,
        select: {
          id: true,
          unitNumber: true,
          property: { select: { name: true } },
        },
        orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
        take: 200,
      }),
      getVendorAssignableUsers(ownerUserId),
      prisma.taskItem.findMany({
        where: {
          type: "MAINTENANCE",
          source: "recurring_maintenance",
          status: { in: [TaskItemStatus.TODO, TaskItemStatus.IN_PROGRESS, TaskItemStatus.WAITING, TaskItemStatus.BLOCKED] },
          ...(ownerUserId ? { unit: { property: { ownerId: ownerUserId, isArchived: false } } } : {}),
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          unit: { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 30,
      }),
    ]);

  const openJobRecords = jobs.filter((job) => isOpenMaintenance(job.status));
  const openJobs = openJobRecords.length;
  const unassignedJobs = openJobRecords.filter((job) => !job.assignedTo).length;
  const waitingVendorAcceptance = openJobRecords.filter((job) => job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR).length;
  const slaBreaches = openJobRecords.filter((job) => slaDueAt(job.createdAt, job.priority).getTime() < Date.now()).length;
  const payoutEligibleInvoices = invoices.filter((invoice) => invoice.status === VendorInvoiceStatus.APPROVED && !invoice.vendorPayoutId).length;
  const submittedInvoices = invoices.filter(
    (invoice) => invoice.status === VendorInvoiceStatus.SUBMITTED,
  ).length;
  const unpaidInvoiceAmount = invoices
    .filter(
      (invoice) =>
        invoice.status === VendorInvoiceStatus.SUBMITTED ||
        invoice.status === VendorInvoiceStatus.APPROVED,
    )
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingPayoutAmount = payouts
    .filter(
      (payout) =>
        payout.status === VendorPayoutStatus.APPROVAL_REQUIRED ||
        payout.status === VendorPayoutStatus.APPROVED ||
        payout.status === VendorPayoutStatus.PROCESSING,
    )
    .reduce((sum, payout) => sum + payout.amount, 0);

  return {
    profiles,
    invitations,
    jobs,
    invoices,
    payouts,
    units,
    vendorUsers,
    recurringTasks,
    metrics: {
      vendorCount: profiles.length,
      openJobs,
      unassignedJobs,
      waitingVendorAcceptance,
      slaBreaches,
      submittedInvoices,
      payoutEligibleInvoices,
      unpaidInvoiceAmount,
      pendingPayoutAmount,
    },
  };
}

export async function getVendorPortal(userId: string) {
  const [profiles, jobs, invoices, payouts, workLogs, photos] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { userId, isActive: true },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { assignedToId: userId },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: { select: { name: true, ownerId: true } },
          },
        },
        requester: { select: { name: true, email: true } },
        vendorWorkLogs: { orderBy: { createdAt: "desc" }, take: 3 },
        vendorInvoices: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50,
    }),
    prisma.vendorInvoice.findMany({
      where: { vendorUserId: userId },
      include: {
        owner: { select: { name: true, email: true } },
        unit: {
          select: { unitNumber: true, property: { select: { name: true } } },
        },
        maintenanceRequest: { select: { id: true, subject: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.vendorPayout.findMany({
      where: { vendorUserId: userId },
      include: {
        owner: { select: { name: true, email: true } },
        unit: {
          select: { unitNumber: true, property: { select: { name: true } } },
        },
        maintenanceRequest: { select: { subject: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    prisma.vendorWorkLog.findMany({
      where: { vendorUserId: userId },
      include: { maintenanceRequest: { select: { subject: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.document.findMany({
      where: { uploadedById: userId, notes: { contains: "Maintenance photo", mode: "insensitive" } },
      include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const openJobRecords = jobs.filter((job) => isOpenMaintenance(job.status));
  const openJobs = openJobRecords.length;
  const waitingAcceptance = openJobRecords.filter((job) => job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR).length;
  const slaBreaches = openJobRecords.filter((job) => slaDueAt(job.createdAt, job.priority).getTime() < Date.now()).length;
  const payoutEligibleInvoices = invoices.filter((invoice) => invoice.status === VendorInvoiceStatus.APPROVED && !invoice.vendorPayoutId).length;
  const approvedInvoiceAmount = invoices
    .filter(
      (invoice) =>
        invoice.status === VendorInvoiceStatus.APPROVED ||
        invoice.status === VendorInvoiceStatus.PAID,
    )
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingInvoiceAmount = invoices
    .filter(
      (invoice) =>
        invoice.status === VendorInvoiceStatus.DRAFT ||
        invoice.status === VendorInvoiceStatus.SUBMITTED,
    )
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  return {
    profiles,
    jobs,
    invoices,
    payouts,
    workLogs,
    photos,
    metrics: {
      openJobs,
      waitingAcceptance,
      slaBreaches,
      payoutEligibleInvoices,
      invoiceCount: invoices.length,
      approvedInvoiceAmount,
      pendingInvoiceAmount,
    },
  };
}

export function vendorCanAccessMaintenance(
  user: AuthorizedUser,
  request: {
    assignedToId: string | null;
    unit?: { property: { ownerId: string | null; isArchived: boolean } } | null;
  },
) {
  if (user.role === UserRole.ADMIN) return true;
  if (request.assignedToId === user.userId) return true;
  return false;
}

export { VendorInvoiceStatus, VendorWorkLogStatus };
