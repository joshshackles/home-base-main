import {
  ApplicationStatus,
  AuditAction,
  ConnectionRole,
  ConnectionStatus,
  OccupancyStatus,
  RelationshipLifecycleEventType,
  RentalLifecycleStatus,
  UnitStatus,
  UserRole,
  type Prisma,
  type User
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type RelationshipActor = Pick<User, "id" | "email" | "name" | "role"> | { userId: string; email: string; name?: string | null; role: string };

export type TenantDashboardMode = "APPLICANT" | "TENANT" | "HYBRID" | "FORMER_TENANT";

function actorId(actor: RelationshipActor) {
  return "userId" in actor ? actor.userId : actor.id;
}

function actorForAudit(actor: RelationshipActor) {
  return {
    userId: actorId(actor),
    email: actor.email,
    name: actor.name ?? null,
    role: actor.role as UserRole
  };
}

export function activeOccupancyStatuses(): OccupancyStatus[] {
  return [OccupancyStatus.PENDING_MOVE_IN, OccupancyStatus.ACTIVE, OccupancyStatus.RENEWAL_PENDING, OccupancyStatus.NOTICE_GIVEN, OccupancyStatus.MOVE_OUT_SCHEDULED];
}

export function historicalOccupancyStatuses(): OccupancyStatus[] {
  return [OccupancyStatus.FORMER, OccupancyStatus.CANCELLED];
}

export function isActiveOccupancyStatus(status: OccupancyStatus) {
  return status !== OccupancyStatus.FORMER && status !== OccupancyStatus.CANCELLED;
}

export function activeOccupancyWhereForUser(userId: string): Prisma.OccupancyWhereInput {
  return { userId, status: { in: activeOccupancyStatuses() } };
}

export function historicalOccupancyWhereForUser(userId: string): Prisma.OccupancyWhereInput {
  return { userId, status: { in: historicalOccupancyStatuses() } };
}

export function occupancyAwareUnitAccessWhere(userId: string, email?: string | null): Prisma.UnitWhereInput {
  const applicationOr: Prisma.ApplicationWhereInput[] = [{ applicantUserId: userId }];
  if (email) applicationOr.push({ applicantEmail: email });
  return {
    OR: [
      { tenantUserId: userId },
      { occupancies: { some: { userId, status: { in: activeOccupancyStatuses() } } } },
      { applications: { some: { OR: applicationOr } } }
    ]
  };
}

export async function getTenantDashboardMode(userId: string, email: string): Promise<TenantDashboardMode> {
  const [activeOccupancyCount, legacyTenantUnitCount, activeApplicationCount, formerOccupancyCount] = await Promise.all([
    prisma.occupancy.count({ where: activeOccupancyWhereForUser(userId) }),
    prisma.unit.count({ where: { tenantUserId: userId } }),
    prisma.application.count({ where: { OR: [{ applicantUserId: userId }, { applicantEmail: email }], status: { in: [ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] } } }),
    prisma.occupancy.count({ where: historicalOccupancyWhereForUser(userId) })
  ]);

  if (activeOccupancyCount > 0 || legacyTenantUnitCount > 0) return activeApplicationCount > 0 ? "HYBRID" : "TENANT";
  if (formerOccupancyCount > 0 && activeApplicationCount === 0) return "FORMER_TENANT";
  return "APPLICANT";
}

export async function activateTenantFromApplication(input: {
  applicationId: string;
  actor: RelationshipActor;
  leasePacketId?: string | null;
  moveInDate?: Date | null;
  notes?: string | null;
}) {
  const now = new Date();
  const actorUserId = actorId(input.actor);

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: input.applicationId },
      include: {
        unit: { include: { property: true } },
        applicantUser: true,
        leasePackets: { orderBy: { updatedAt: "desc" }, take: 1 }
      }
    });

    if (!application) throw new Error("Application was not found.");
    if (!application.applicantUserId || !application.applicantUser) {
      throw new Error("Connect this application to an applicant portal user before activating tenant access.");
    }

    const leasePacketId = input.leasePacketId ?? application.leasePackets[0]?.id ?? null;
    const leasePacket = leasePacketId
      ? await tx.leasePacket.findUnique({ where: { id: leasePacketId }, select: { id: true, leaseStartDate: true, leaseEndDate: true, status: true } })
      : null;

    const moveInDate = input.moveInDate ?? leasePacket?.leaseStartDate ?? null;
    const occupancyStatus = moveInDate && moveInDate.getTime() > now.getTime() ? OccupancyStatus.PENDING_MOVE_IN : OccupancyStatus.ACTIVE;
    const lifecycleStatus = occupancyStatus === OccupancyStatus.PENDING_MOVE_IN ? RentalLifecycleStatus.MOVE_IN_SCHEDULED : RentalLifecycleStatus.OCCUPIED;

    await tx.user.update({
      where: { id: application.applicantUserId },
      data: { role: application.applicantUser.role === UserRole.APPLICANT ? UserRole.TENANT : application.applicantUser.role }
    });

    await tx.application.update({ where: { id: application.id }, data: { status: ApplicationStatus.APPROVED } });

    await tx.unit.update({
      where: { id: application.unitId },
      data: {
        tenantUserId: application.applicantUserId,
        currentApplicationId: application.id,
        status: UnitStatus.OCCUPIED,
        lifecycleStatus
      }
    });

    await tx.profileConnection.upsert({
      where: {
        landlordUserId_targetUserId_scopeKey_assignedRole: {
          landlordUserId: application.unit.property.ownerId ?? actorUserId,
          targetUserId: application.applicantUserId,
          scopeKey: application.unitId,
          assignedRole: ConnectionRole.CONNECTED_RENTER
        }
      },
      update: { status: ConnectionStatus.ACTIVE, unitId: application.unitId, notes: "Tenant relationship activated from approved application." },
      create: {
        landlordUserId: application.unit.property.ownerId ?? actorUserId,
        targetUserId: application.applicantUserId,
        unitId: application.unitId,
        scopeKey: application.unitId,
        assignedRole: ConnectionRole.CONNECTED_RENTER,
        status: ConnectionStatus.ACTIVE,
        notes: "Tenant relationship activated from approved application."
      }
    });

    const occupancy = await tx.occupancy.upsert({
      where: { applicationId_userId: { applicationId: application.id, userId: application.applicantUserId } },
      update: {
        unitId: application.unitId,
        leasePacketId,
        status: occupancyStatus,
        lifecycleEvent: RelationshipLifecycleEventType.TENANT_ACTIVATED,
        moveInDate,
        leaseStartDate: leasePacket?.leaseStartDate ?? moveInDate,
        leaseEndDate: leasePacket?.leaseEndDate ?? null,
        moveOutDate: null,
        endedAt: null,
        notes: input.notes ?? "Tenant relationship activated from application approval.",
        createdById: actorUserId
      },
      create: {
        userId: application.applicantUserId,
        unitId: application.unitId,
        applicationId: application.id,
        leasePacketId,
        status: occupancyStatus,
        relationship: ConnectionRole.CONNECTED_RENTER,
        lifecycleEvent: RelationshipLifecycleEventType.TENANT_ACTIVATED,
        startedAt: now,
        moveInDate,
        leaseStartDate: leasePacket?.leaseStartDate ?? moveInDate,
        leaseEndDate: leasePacket?.leaseEndDate ?? null,
        notes: input.notes ?? "Tenant relationship activated from application approval.",
        createdById: actorUserId
      }
    });

    await tx.applicationNote.create({
      data: {
        applicationId: application.id,
        note: `[Lifecycle] Applicant approved and tenant relationship activated for ${application.applicantUser.email}. Occupancy status: ${occupancy.status}.`
      }
    });

    return { application, occupancy };
  });

  await writeAuditLog({
    actor: actorForAudit(input.actor),
    action: AuditAction.STATUS_CHANGE,
    entityType: "Occupancy",
    entityId: result.occupancy.id,
    message: `Activated tenant relationship for application ${input.applicationId}.`,
    metadata: { applicationId: input.applicationId, unitId: result.occupancy.unitId, userId: result.occupancy.userId, status: result.occupancy.status }
  });

  return result;
}

export async function endTenantOccupancy(input: {
  occupancyId: string;
  actor: RelationshipActor;
  moveOutDate?: Date | null;
  reason?: string | null;
  notes?: string | null;
  releaseRental?: boolean;
}) {
  const actorUserId = actorId(input.actor);
  const moveOutDate = input.moveOutDate ?? new Date();
  const endedAt = new Date();
  const releaseRental = input.releaseRental ?? true;
  const reason = input.reason?.trim() || "Tenancy ended";
  const notes = input.notes?.trim() || "Tenant relationship ended by landlord/admin.";

  const result = await prisma.$transaction(async (tx) => {
    const occupancy = await tx.occupancy.findUnique({
      where: { id: input.occupancyId },
      include: { unit: { include: { property: true } }, tenant: true, application: true }
    });
    if (!occupancy) throw new Error("Occupancy was not found.");

    const updatedOccupancy = await tx.occupancy.update({
      where: { id: occupancy.id },
      data: {
        status: OccupancyStatus.FORMER,
        lifecycleEvent: RelationshipLifecycleEventType.MOVE_OUT_COMPLETED,
        moveOutDate,
        endedAt,
        notes: `[Move-out] ${reason}. ${notes}`,
        createdById: actorUserId
      }
    });

    const remainingActiveOccupanciesForUnit = await tx.occupancy.count({
      where: { unitId: occupancy.unitId, id: { not: occupancy.id }, status: { in: activeOccupancyStatuses() } }
    });

    if (releaseRental && remainingActiveOccupanciesForUnit === 0) {
      await tx.unit.update({
        where: { id: occupancy.unitId },
        data: {
          tenantUserId: occupancy.unit.tenantUserId === occupancy.userId ? null : occupancy.unit.tenantUserId,
          status: UnitStatus.AVAILABLE,
          lifecycleStatus: RentalLifecycleStatus.TURNOVER
        }
      });
    } else if (occupancy.unit.tenantUserId === occupancy.userId) {
      const replacement = await tx.occupancy.findFirst({
        where: { unitId: occupancy.unitId, id: { not: occupancy.id }, status: { in: activeOccupancyStatuses() } },
        orderBy: { updatedAt: "desc" },
        select: { userId: true }
      });
      await tx.unit.update({ where: { id: occupancy.unitId }, data: { tenantUserId: replacement?.userId ?? null } });
    }

    await tx.profileConnection.updateMany({
      where: {
        targetUserId: occupancy.userId,
        unitId: occupancy.unitId,
        assignedRole: ConnectionRole.CONNECTED_RENTER,
        status: ConnectionStatus.ACTIVE
      },
      data: { status: ConnectionStatus.REVOKED, notes: `[Lifecycle] Tenant access ended on ${moveOutDate.toISOString().slice(0, 10)}. ${reason}` }
    });

    if (occupancy.applicationId) {
      await tx.applicationNote.create({
        data: {
          applicationId: occupancy.applicationId,
          note: `[Lifecycle] Tenant relationship ended for ${occupancy.tenant.email}. Move-out: ${moveOutDate.toISOString().slice(0, 10)}. Reason: ${reason}. ${notes}`
        }
      });
    }

    const remainingActiveOccupanciesForUser = await tx.occupancy.count({
      where: { userId: occupancy.userId, id: { not: occupancy.id }, status: { in: activeOccupancyStatuses() } }
    });
    const remainingLegacyUnitsForUser = await tx.unit.count({ where: { tenantUserId: occupancy.userId } });
    const openApplicationsForUser = await tx.application.count({
      where: { OR: [{ applicantUserId: occupancy.userId }, { applicantEmail: occupancy.tenant.email }], status: { in: [ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] } }
    });

    if (remainingActiveOccupanciesForUser === 0 && remainingLegacyUnitsForUser === 0 && occupancy.tenant.role === UserRole.TENANT && openApplicationsForUser > 0) {
      await tx.user.update({ where: { id: occupancy.userId }, data: { role: UserRole.APPLICANT } });
    }

    return { occupancy: updatedOccupancy, tenant: occupancy.tenant, unit: occupancy.unit };
  });

  await writeAuditLog({
    actor: actorForAudit(input.actor),
    action: AuditAction.STATUS_CHANGE,
    entityType: "Occupancy",
    entityId: result.occupancy.id,
    message: "Ended tenant occupancy and moved relationship to former tenant history.",
    metadata: {
      occupancyId: result.occupancy.id,
      unitId: result.occupancy.unitId,
      userId: result.occupancy.userId,
      moveOutDate: moveOutDate.toISOString(),
      reason,
      releaseRental
    }
  });

  return result.occupancy;
}

export async function archiveOccupancy(input: { occupancyId: string; actor: RelationshipActor; moveOutDate?: Date | null; notes?: string | null }) {
  return endTenantOccupancy({
    occupancyId: input.occupancyId,
    actor: input.actor,
    moveOutDate: input.moveOutDate,
    reason: "Archived occupancy",
    notes: input.notes ?? "Occupancy archived.",
    releaseRental: true
  });
}
