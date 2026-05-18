import {
  ConnectionRole,
  ConnectionStatus,
  MaintenanceRequestStatus,
} from "@prisma/client";
import type {
  ConnectionRole as ConnectionRoleType,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LandlordContactSource =
  | "explicit"
  | "maintenance"
  | "tenant"
  | "applicant";
export type ContactReviewStatus =
  | "current"
  | "needs_review"
  | "missing_profile"
  | "multi_scope";
export type ContactSortMode =
  | "name"
  | "updated"
  | "role"
  | "scope"
  | "review"
  | "risk"
  | "footprint";
export type ContactRiskLevel = "low" | "medium" | "high";
export type ContactScopeType = "portfolio" | "unit";

const STALE_EXPLICIT_DAYS = 180;
const PORTFOLIO_SCOPE_KEY = "PORTFOLIO";
const OPERATIONAL_CONNECTION_ROLES = new Set<string>([
  ConnectionRole.PROPERTY_MANAGER,
  ConnectionRole.MAINTENANCE_STAFF,
  ConnectionRole.PREFERRED_VENDOR,
]);

export const landlordContactSourceLabels: Record<
  LandlordContactSource,
  string
> = {
  explicit: "Profile connection",
  maintenance: "Live maintenance",
  tenant: "Current tenant",
  applicant: "Application workflow",
};

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
  sourceCount: number;
  reviewStatus: ContactReviewStatus;
  confidenceScore: number;
  riskLevel: ContactRiskLevel;
  attentionReason: string;
  recommendedAction: string;
  scopeType: ContactScopeType;
  permissionFootprint: string;
  governanceFlags: string[];
  isRevocable: boolean;
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
  needsReviewCount: number;
  multiSourceCount: number;
  lowConfidenceCount: number;
  highRiskCount: number;
  portfolioExplicitCount: number;
  privilegedAccessCount: number;
  workflowOnlyCount: number;
  revocableCount: number;
};

export function profileConnectionScopeKey(unitId?: string | null) {
  return unitId ?? PORTFOLIO_SCOPE_KEY;
}

function staleExplicitCutoff() {
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_EXPLICIT_DAYS);
  return staleCutoff;
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

function displayName(user: { name: string | null; email: string }) {
  return user.name || user.email || "Unnamed User";
}

function unitLabel(
  unit: { unitNumber: string; property: { name: string } } | null | undefined,
) {
  return unit
    ? `${unit.property.name} - #${unit.unitNumber}`
    : "All Portfolio Properties";
}

function contactReviewStatus(
  contact: Pick<
    LandlordContactListItem,
    "name" | "email" | "source" | "sources" | "updatedAt"
  >,
  duplicatePeopleCount: number,
): ContactReviewStatus {
  if (contact.name === contact.email || contact.name === "Unnamed User")
    return "missing_profile";
  if (duplicatePeopleCount > 1) return "multi_scope";
  if (
    contact.source === "explicit" &&
    contact.updatedAt &&
    contact.updatedAt < staleExplicitCutoff()
  )
    return "needs_review";
  return "current";
}

function contactConfidenceScore(
  contact: Pick<
    LandlordContactListItem,
    "name" | "email" | "sources" | "unitId" | "updatedAt" | "reviewStatus"
  >,
) {
  let score = 70;
  if (
    contact.name &&
    contact.name !== contact.email &&
    contact.name !== "Unnamed User"
  )
    score += 10;
  if (contact.email.includes("@")) score += 5;
  if (contact.unitId) score += 5;
  if (contact.sources.length > 1) score += 10;
  if (contact.reviewStatus !== "current") score -= 20;
  if (!contact.updatedAt) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function contactRiskLevel(
  contact: Pick<
    LandlordContactListItem,
    "confidenceScore" | "reviewStatus" | "source" | "unitId"
  >,
): ContactRiskLevel {
  if (
    contact.confidenceScore < 55 ||
    contact.reviewStatus === "missing_profile"
  )
    return "high";
  if (contact.confidenceScore < 75 || contact.reviewStatus !== "current")
    return "medium";
  return "low";
}

function contactAttentionReason(
  contact: Pick<
    LandlordContactListItem,
    | "reviewStatus"
    | "source"
    | "sources"
    | "updatedAt"
    | "name"
    | "email"
    | "unitId"
  >,
) {
  if (contact.reviewStatus === "missing_profile")
    return "Profile needs a display name so staff can verify the person quickly.";
  if (contact.reviewStatus === "multi_scope")
    return "This person appears in multiple contact scopes; verify access is still intentional.";
  if (contact.reviewStatus === "needs_review")
    return "Explicit access has not been reviewed recently.";
  if (!contact.unitId && contact.source === "explicit")
    return "Portfolio-wide access is active.";
  if (contact.sources.length > 1)
    return "Contact is reinforced by multiple live workflow sources.";
  return "No immediate contact governance concern.";
}

function contactScopeType(
  contact: Pick<LandlordContactListItem, "unitId">,
): ContactScopeType {
  return contact.unitId ? "unit" : "portfolio";
}

function contactPermissionFootprint(
  contact: Pick<
    LandlordContactListItem,
    "source" | "sources" | "assignedRole" | "unitId"
  >,
) {
  const scope = contact.unitId ? "Unit-scoped" : "Portfolio-wide";
  const source =
    contact.sources.length > 1
      ? `${contact.sources.length} sources`
      : landlordContactSourceLabels[contact.source];
  return `${scope} · ${String(contact.assignedRole).replaceAll("_", " ").toLowerCase()} · ${source}`;
}

function contactGovernanceFlags(
  contact: Pick<
    LandlordContactListItem,
    | "source"
    | "sources"
    | "unitId"
    | "reviewStatus"
    | "confidenceScore"
    | "assignedRole"
  >,
) {
  const flags: string[] = [];
  if (contact.source === "explicit" && !contact.unitId)
    flags.push("Portfolio-wide explicit access");
  if (OPERATIONAL_CONNECTION_ROLES.has(String(contact.assignedRole)))
    flags.push("Operational access");
  if (contact.sources.length > 1) flags.push("Multi-source relationship");
  if (contact.reviewStatus !== "current") flags.push("Review required");
  if (contact.confidenceScore < 75) flags.push("Low confidence");
  return flags;
}

function contactRecommendedAction(
  contact: Pick<
    LandlordContactListItem,
    "reviewStatus" | "source" | "connectionId" | "unitId"
  >,
) {
  if (contact.reviewStatus === "missing_profile")
    return "Update the user profile name or invite the contact to complete their profile.";
  if (contact.reviewStatus === "multi_scope")
    return "Review scopes and revoke any duplicate or outdated explicit access.";
  if (contact.reviewStatus === "needs_review")
    return "Confirm the relationship is still needed; revoke it if not.";
  if (contact.connectionId && !contact.unitId)
    return "Keep portfolio-wide access only for trusted operators.";
  if (!contact.connectionId && contact.source !== "explicit")
    return "Manage this relationship from its source workflow.";
  return "No action needed.";
}

function enrichContactReviewState(contacts: LandlordContactListItem[]) {
  const peopleCounts = new Map<string, number>();
  for (const contact of contacts)
    peopleCounts.set(
      contact.userId,
      (peopleCounts.get(contact.userId) ?? 0) + 1,
    );

  return contacts
    .map((contact) => {
      const reviewStatus = contactReviewStatus(
        contact,
        peopleCounts.get(contact.userId) ?? 0,
      );
      const sourceCount = contact.sources.length;
      const confidenceScore = contactConfidenceScore({
        ...contact,
        reviewStatus,
      });
      return {
        ...contact,
        sourceCount,
        reviewStatus,
        confidenceScore,
      };
    })
    .map((contact) => {
      const riskLevel = contactRiskLevel(contact);
      const scopeType = contactScopeType(contact);
      const governanceFlags = contactGovernanceFlags(contact);
      return {
        ...contact,
        riskLevel,
        scopeType,
        governanceFlags,
        isRevocable: Boolean(contact.connectionId),
        permissionFootprint: contactPermissionFootprint(contact),
        attentionReason: contactAttentionReason(contact),
        recommendedAction: contactRecommendedAction(contact),
      };
    });
}

export function getContactGovernanceSummary(
  contacts: LandlordContactListItem[],
): ContactGovernanceSummary {
  const explicitCount = contacts.filter(
    (contact) => contact.source === "explicit",
  ).length;
  const unitScopedCount = contacts.filter((contact) => contact.unitId).length;
  const peopleCounts = new Map<string, number>();
  for (const contact of contacts)
    peopleCounts.set(
      contact.userId,
      (peopleCounts.get(contact.userId) ?? 0) + 1,
    );
  const staleCutoff = staleExplicitCutoff();

  return {
    total: contacts.length,
    explicitCount,
    workflowCount: contacts.length - explicitCount,
    unitScopedCount,
    portfolioCount: contacts.length - unitScopedCount,
    duplicatePeopleCount: Array.from(peopleCounts.values()).filter(
      (count) => count > 1,
    ).length,
    staleExplicitCount: contacts.filter(
      (contact) =>
        contact.source === "explicit" &&
        contact.updatedAt &&
        contact.updatedAt < staleCutoff,
    ).length,
    missingNameCount: contacts.filter(
      (contact) =>
        contact.name === contact.email || contact.name === "Unnamed User",
    ).length,
    needsReviewCount: contacts.filter(
      (contact) => contact.reviewStatus !== "current",
    ).length,
    multiSourceCount: contacts.filter((contact) => contact.sources.length > 1)
      .length,
    lowConfidenceCount: contacts.filter(
      (contact) => contact.confidenceScore < 75,
    ).length,
    highRiskCount: contacts.filter((contact) => contact.riskLevel === "high")
      .length,
    portfolioExplicitCount: contacts.filter(
      (contact) => contact.source === "explicit" && !contact.unitId,
    ).length,
    privilegedAccessCount: contacts.filter(
      (contact) =>
        contact.governanceFlags.includes("Operational access") ||
        (contact.source === "explicit" && !contact.unitId),
    ).length,
    workflowOnlyCount: contacts.filter((contact) => !contact.connectionId)
      .length,
    revocableCount: contacts.filter((contact) => contact.isRevocable).length,
  };
}

export function filterLandlordContacts(
  contacts: LandlordContactListItem[],
  input: { query?: string; source?: string; role?: string; review?: string },
) {
  const activeQuery = (input.query ?? "").trim().toLowerCase();
  const activeSource = input.source ?? "all";
  const activeRole = input.role ?? "all";
  const activeReview = input.review ?? "all";

  return contacts.filter((contact) => {
    const sourceMatch =
      activeSource === "all" ||
      contact.source === activeSource ||
      contact.sources.includes(activeSource as LandlordContactSource);
    const roleMatch =
      activeRole === "all" || String(contact.assignedRole) === activeRole;
    const reviewMatch =
      activeReview === "all" ||
      contact.reviewStatus === activeReview ||
      (activeReview === "attention" && contact.reviewStatus !== "current") ||
      (activeReview === "low_confidence" && contact.confidenceScore < 75) ||
      (activeReview === "high_risk" && contact.riskLevel === "high") ||
      (activeReview === "portfolio_explicit" &&
        contact.source === "explicit" &&
        !contact.unitId) ||
      (activeReview === "revocable" && contact.isRevocable) ||
      (activeReview === "workflow_only" && !contact.isRevocable) ||
      (activeReview === "operational_access" &&
        contact.governanceFlags.includes("Operational access"));
    const queryMatch =
      !activeQuery ||
      [
        contact.name,
        contact.email,
        contact.scopedUnit,
        contact.notes,
        contact.attentionReason,
        contact.recommendedAction,
        contact.riskLevel,
        contact.scopeType,
        contact.permissionFootprint,
        String(contact.assignedRole),
        contact.systemRole,
        contact.reviewStatus,
        ...contact.sources,
        ...contact.governanceFlags,
      ].some((value) => (value ?? "").toLowerCase().includes(activeQuery));

    return sourceMatch && roleMatch && reviewMatch && queryMatch;
  });
}

export function sortLandlordContacts(
  contacts: LandlordContactListItem[],
  sort: ContactSortMode = "name",
) {
  const reviewRank: Record<ContactReviewStatus, number> = {
    needs_review: 0,
    missing_profile: 1,
    multi_scope: 2,
    current: 3,
  };
  return [...contacts].sort((a, b) => {
    if (sort === "updated")
      return (
        (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0) ||
        a.name.localeCompare(b.name)
      );
    if (sort === "role")
      return (
        String(a.assignedRole).localeCompare(String(b.assignedRole)) ||
        a.name.localeCompare(b.name)
      );
    if (sort === "scope")
      return (
        a.scopedUnit.localeCompare(b.scopedUnit) || a.name.localeCompare(b.name)
      );
    if (sort === "review")
      return (
        reviewRank[a.reviewStatus] - reviewRank[b.reviewStatus] ||
        a.name.localeCompare(b.name)
      );
    if (sort === "risk")
      return (
        a.confidenceScore - b.confidenceScore ||
        reviewRank[a.reviewStatus] - reviewRank[b.reviewStatus] ||
        a.name.localeCompare(b.name)
      );
    if (sort === "footprint")
      return (
        b.governanceFlags.length - a.governanceFlags.length ||
        a.permissionFootprint.localeCompare(b.permissionFootprint) ||
        a.name.localeCompare(b.name)
      );
    return a.name.localeCompare(b.name);
  });
}

export function contactCsvRows(contacts: LandlordContactListItem[]) {
  return contacts.map((contact) => [
    contact.name,
    contact.email,
    contact.systemRole,
    String(contact.assignedRole),
    contact.scopedUnit,
    contact.unitId,
    contact.sources.join("; "),
    contact.scopeType,
    contact.permissionFootprint,
    contact.governanceFlags.join("; "),
    contact.isRevocable ? "Yes" : "No",
    contact.reviewStatus,
    contact.confidenceScore,
    contact.riskLevel,
    contact.attentionReason,
    contact.recommendedAction,
    contact.notes,
    contact.createdAt,
    contact.updatedAt,
  ]);
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
    {
      role: ConnectionRole.PROPERTY_MANAGER,
      targetUserId: input.propertyManagerUserId ?? null,
      label: "Unit property manager",
    },
    {
      role: ConnectionRole.MAINTENANCE_STAFF,
      targetUserId: input.maintenanceUserId ?? null,
      label: "Unit maintenance contact",
    },
    {
      role: ConnectionRole.CASEWORKER,
      targetUserId: input.caseworkerUserId ?? null,
      label: "Unit caseworker",
    },
  ];
  await prisma.$transaction(async (tx) => {
    for (const assignment of assignments) {
      await tx.profileConnection.updateMany({
        where: {
          landlordUserId: input.landlordUserId,
          unitId: input.unitId,
          assignedRole: assignment.role,
          status: ConnectionStatus.ACTIVE,
          ...(assignment.targetUserId
            ? { targetUserId: { not: assignment.targetUserId } }
            : {}),
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

export async function getLandlordContactsList(
  landlordUserId: string,
): Promise<LandlordContactListItem[]> {
  const [connections, maintenanceRequests, tenantUnits, applications] =
    await Promise.all([
      prisma.profileConnection.findMany({
        where: { landlordUserId, status: ConnectionStatus.ACTIVE },
        include: {
          target: { select: { id: true, name: true, email: true, role: true } },
          unit: {
            select: { unitNumber: true, property: { select: { name: true } } },
          },
        },
        orderBy: [{ assignedRole: "asc" }, { createdAt: "desc" }],
      }),
      prisma.maintenanceRequest.findMany({
        where: {
          status: {
            notIn: [
              MaintenanceRequestStatus.COMPLETED,
              MaintenanceRequestStatus.CANCELLED,
            ],
          },
          unit: { property: { ownerId: landlordUserId, isArchived: false } },
          assignedToId: { not: null },
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          unit: {
            select: { unitNumber: true, property: { select: { name: true } } },
          },
        },
      }),
      prisma.unit.findMany({
        where: {
          tenantUserId: { not: null },
          property: { ownerId: landlordUserId, isArchived: false },
        },
        include: {
          tenantUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          property: { select: { name: true } },
        },
      }),
      prisma.application.findMany({
        where: {
          unit: { property: { ownerId: landlordUserId, isArchived: false } },
        },
        include: {
          applicantUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          unit: {
            select: { unitNumber: true, property: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);

  const contacts = new Map<string, LandlordContactListItem>();
  const add = (
    item: Omit<
      LandlordContactListItem,
      | "sources"
      | "sourceCount"
      | "reviewStatus"
      | "confidenceScore"
      | "riskLevel"
      | "attentionReason"
      | "recommendedAction"
      | "scopeType"
      | "permissionFootprint"
      | "governanceFlags"
      | "isRevocable"
    > & { sources?: LandlordContactSource[] },
  ) => {
    const scopeKey = item.unitId ?? PORTFOLIO_SCOPE_KEY;
    const key = `${item.userId}:${item.assignedRole}:${scopeKey}`;
    const sources = item.sources ?? [item.source];
    const existing = contacts.get(key);
    if (!existing) {
      contacts.set(key, {
        ...item,
        sources,
        sourceCount: sources.length,
        reviewStatus: "current",
        confidenceScore: 0,
        riskLevel: "low",
        attentionReason: "Pending review",
        recommendedAction: "Review contact",
        scopeType: item.unitId ? "unit" : "portfolio",
        permissionFootprint: "Pending review",
        governanceFlags: [],
        isRevocable: Boolean(item.connectionId),
      });
      return;
    }

    const mergedNotes = Array.from(
      new Set([existing.notes, item.notes].filter(Boolean)),
    );
    contacts.set(key, {
      ...existing,
      sources: Array.from(new Set([...existing.sources, ...sources])),
      connectionId: existing.connectionId ?? item.connectionId,
      notes: mergedNotes.join(" · ") || null,
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

  return sortLandlordContacts(
    enrichContactReviewState(Array.from(contacts.values())),
    "name",
  );
}
