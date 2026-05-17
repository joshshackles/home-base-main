import { ConnectionRole, ConnectionStatus, MaintenanceRequestStatus } from "@prisma/client";
import type { ConnectionRole as ConnectionRoleType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LandlordContactSource = "explicit" | "maintenance" | "tenant" | "applicant";

export type LandlordContactListItem = {
  connectionId: string | null;
  source: LandlordContactSource;
  sources: LandlordContactSource[];
  userId: string;
  name: string;
  email: string;
  systemRole: UserRole;
  assignedRole: ConnectionRoleType | "TENANT" | "APPLICANT";
  scopedUnit: string;
  notes: string | null;
  unitId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ContactGovernanceSummary = {
  total: number;
  explicitCount: number;
  workflowCount: number;
  unitScopedCount: number;
  portfolioCount: number;
  duplicatePeopleCount: number;
  staleExplicitCount: number;
  missingNameCount: number;
};

export function profileConnectionScopeKey(unitId?: string | null) {
  return unitId ?? "PORTFOLIO";
}

function laterDate(a: Date | null, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function earlierDate(a: Date | null, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

export function getContactGovernanceSummary(contacts: LandlordContactListItem[]): ContactGovernanceSummary {
  const explicitCount = contacts.filter((contact) => contact.source === "explicit").length;
  const unitScopedCount = contacts.filter((contact) => contact.unitId).length;
  const peopleCounts = new Map<string, number>();
  for (const contact of contacts) peopleCounts.set(contact.userId, (peopleCounts.get(contact.userId) ?? 0) + 1);

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - 180);

  return {
    total: contacts.length,
    explicitCount,
    workflowCount: contacts.length - explicitCount,
    unitScopedCount,
    portfolioCount: contacts.length - unitScopedCount,
    duplicatePeopleCount: Array.from(peopleCounts.values()).filter((count) => count > 1).length,
    staleExplicitCount: contacts.filter((contact) => contact.source === "explicit" && contact.updatedAt && contact.updatedAt < staleCutoff).length,
    missingNameCount: contacts.filter((contact) => contact.name === contact.email).length,
  };
}

export function filterLandlordContacts(contacts: LandlordContactListItem[], input: { query?: string; source?: string; role?: string }) {
  const activeQuery = (input.query ?? "").trim().toLowerCase();
  const activeSource = input.source ?? "all";
  const activeRole = input.role ?? "all";

  return contacts.filter((contact) => {
    const sourceMatch = activeSource === "all" || contact.source === activeSource || contact.sources.includes(activeSource as LandlordContactSource);
    const roleMatch = activeRole === "all" || String(contact.assignedRole) === activeRole;
    const queryMatch = !activeQuery ||
      [contact.name, contact.email, contact.scopedUnit, contact.notes, String(contact.assignedRole), contact.systemRole, ...contact.sources].some((value) =>
        (value ?? "").toLowerCase().includes(activeQuery)
      );

    return sourceMatch && roleMatch && queryMatch;
  });
}

function displayName(user: { name: string | null; email: string }) {
  return user.name || user.email || "Unnamed User";
}

function unitLabel(unit: { unitNumber: string; property: { name: string } } | null | undefined) {
  return unit ? `${unit.property.name} - #${unit.unitNumber}` : "All Portfolio Properties";
}

export async function upsertProfileConnection(input: {
  landlordUserId: string;
  targetUserId: string;
  assignedRole: ConnectionRoleType;
  unitId?: string | null;
  notes?: string | null;
}) {
  const scopeKey = profileConnectionScopeKey(input.unitId);

  return prisma.profileConnection.upsert({
    where: {
      landlordUserId_targetUserId_scopeKey_assignedRole: {
        landlordUserId: input.landlordUserId,
        targetUserId: input.targetUserId,
        scopeKey,
        assignedRole: input.assignedRole,
      },
    },
    create: {
      landlordUserId: input.landlordUserId,
      targetUserId: input.targetUserId,
      unitId: input.unitId ?? null,
      scopeKey,
      assignedRole: input.assignedRole,
      status: ConnectionStatus.ACTIVE,
      notes: input.notes ?? null,
    },
    update: {
      unitId: input.unitId ?? null,
      scopeKey,
      status: ConnectionStatus.ACTIVE,
      notes: input.notes ?? undefined,
    },
  });
}

export async function revokeProfileConnection(input: {
  landlordUserId: string;
  targetUserId: string;
  assignedRole: ConnectionRoleType;
  unitId?: string | null;
}) {
  const scopeKey = profileConnectionScopeKey(input.unitId);

  await prisma.profileConnection.updateMany({
    where: {
      landlordUserId: input.landlordUserId,
      targetUserId: input.targetUserId,
      assignedRole: input.assignedRole,
      scopeKey,
      status: ConnectionStatus.ACTIVE,
    },
    data: { status: ConnectionStatus.REVOKED },
  });
}

export async function syncUnitStaffConnections(input: {
  landlordUserId: string;
  unitId: string;
  propertyManagerUserId?: string | null;
  maintenanceUserId?: string | null;
  caseworkerUserId?: string | null;
}) {
  const assignments = [
    { role: ConnectionRole.PROPERTY_MANAGER, targetUserId: input.propertyManagerUserId ?? null, label: "Unit property manager" },
    { role: ConnectionRole.MAINTENANCE_STAFF, targetUserId: input.maintenanceUserId ?? null, label: "Unit maintenance contact" },
    { role: ConnectionRole.CASEWORKER, targetUserId: input.caseworkerUserId ?? null, label: "Unit caseworker" },
  ];
  await prisma.$transaction(async (tx) => {
    for (const assignment of assignments) {
      await tx.profileConnection.updateMany({
        where: {
          landlordUserId: input.landlordUserId,
          unitId: input.unitId,
          assignedRole: assignment.role,
          status: ConnectionStatus.ACTIVE,
          ...(assignment.targetUserId ? { targetUserId: { not: assignment.targetUserId } } : {}),
        },
        data: { status: ConnectionStatus.REVOKED },
      });

      if (!assignment.targetUserId) continue;
      const scopeKey = profileConnectionScopeKey(input.unitId);
      await tx.profileConnection.upsert({
        where: {
          landlordUserId_targetUserId_scopeKey_assignedRole: {
            landlordUserId: input.landlordUserId,
            targetUserId: assignment.targetUserId,
            scopeKey,
            assignedRole: assignment.role,
          },
        },
        create: {
          landlordUserId: input.landlordUserId,
          targetUserId: assignment.targetUserId,
          unitId: input.unitId,
          scopeKey,
          assignedRole: assignment.role,
          status: ConnectionStatus.ACTIVE,
          notes: assignment.label,
        },
        update: {
          unitId: input.unitId,
          scopeKey,
          status: ConnectionStatus.ACTIVE,
          notes: assignment.label,
        },
      });
    }
  });
}

export async function getLandlordContactsList(landlordUserId: string): Promise<LandlordContactListItem[]> {
  const [connections, maintenanceRequests, tenantUnits, applications] = await Promise.all([
    prisma.profileConnection.findMany({
      where: { landlordUserId, status: ConnectionStatus.ACTIVE },
      include: {
        target: { select: { id: true, name: true, email: true, role: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
      orderBy: [{ assignedRole: "asc" }, { createdAt: "desc" }],
    }),
    prisma.maintenanceRequest.findMany({
      where: {
        status: { notIn: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED] },
        unit: { property: { ownerId: landlordUserId, isArchived: false } },
        assignedToId: { not: null },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
    }),
    prisma.unit.findMany({
      where: { tenantUserId: { not: null }, property: { ownerId: landlordUserId, isArchived: false } },
      include: {
        tenantUser: { select: { id: true, name: true, email: true, role: true } },
        property: { select: { name: true } },
      },
    }),
    prisma.application.findMany({
      where: { unit: { property: { ownerId: landlordUserId, isArchived: false } } },
      include: {
        applicantUser: { select: { id: true, name: true, email: true, role: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const contacts = new Map<string, LandlordContactListItem>();
  const add = (item: Omit<LandlordContactListItem, "sources"> & { sources?: LandlordContactSource[] }) => {
    const key = `${item.userId}:${item.assignedRole}:${item.scopedUnit}`;
    const sources = item.sources ?? [item.source];
    const existing = contacts.get(key);
    if (!existing) {
      contacts.set(key, { ...item, sources });
      return;
    }

    contacts.set(key, {
      ...existing,
      sources: Array.from(new Set([...existing.sources, ...sources])),
      connectionId: existing.connectionId ?? item.connectionId,
      notes: [existing.notes, item.notes].filter(Boolean).join(" · ") || null,
      createdAt: earlierDate(existing.createdAt, item.createdAt),
      updatedAt: laterDate(existing.updatedAt, item.updatedAt),
    });
  };

  for (const connection of connections) {
    add({
      connectionId: connection.id,
      source: "explicit",
      userId: connection.target.id,
      name: displayName(connection.target),
      email: connection.target.email,
      systemRole: connection.target.role,
      assignedRole: connection.assignedRole,
      scopedUnit: unitLabel(connection.unit),
      notes: connection.notes,
      unitId: connection.unitId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  }

  for (const request of maintenanceRequests) {
    if (!request.assignedTo) continue;
    add({
      connectionId: null,
      source: "maintenance",
      userId: request.assignedTo.id,
      name: displayName(request.assignedTo),
      email: request.assignedTo.email,
      systemRole: request.assignedTo.role,
      assignedRole: ConnectionRole.MAINTENANCE_STAFF,
      scopedUnit: unitLabel(request.unit),
      notes: "Active maintenance assignment",
      unitId: request.unitId ?? null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  }

  for (const unit of tenantUnits) {
    if (!unit.tenantUser) continue;
    add({
      connectionId: null,
      source: "tenant",
      userId: unit.tenantUser.id,
      name: displayName(unit.tenantUser),
      email: unit.tenantUser.email,
      systemRole: unit.tenantUser.role,
      assignedRole: "TENANT",
      scopedUnit: `${unit.property.name} - #${unit.unitNumber}`,
      notes: "Current tenant",
      unitId: unit.id,
      createdAt: unit.updatedAt,
      updatedAt: unit.updatedAt,
    });
  }

  for (const application of applications) {
    if (!application.applicantUser) continue;
    add({
      connectionId: null,
      source: "applicant",
      userId: application.applicantUser.id,
      name: displayName(application.applicantUser),
      email: application.applicantUser.email,
      systemRole: application.applicantUser.role,
      assignedRole: "APPLICANT",
      scopedUnit: unitLabel(application.unit),
      notes: "Application workflow contact",
      unitId: application.unitId,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    });
  }

  return Array.from(contacts.values()).sort((a, b) => a.name.localeCompare(b.name));
}
