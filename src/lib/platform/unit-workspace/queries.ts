import { AccountAccessType, ConnectionStatus, MaintenanceRequestStatus, MessageThreadType, Prisma, RentalLifecycleStatus, UserRole } from "@prisma/client";
import { canAccessUnit } from "@/lib/authorization";
import { formatCurrency } from "@/lib/format";
import { ledgerBalance, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { recommendRentalLifecycle } from "@/lib/rental-lifecycle-engine";
import type { PlatformContext } from "@/lib/platform/types";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not scheduled";
}

function hasStaffAccess(user: { role: UserRole; accountAccessRequests: Array<{ type: AccountAccessType }> }, types: AccountAccessType[]) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.LANDLORD) return true;
  if (types.includes(AccountAccessType.MAINTENANCE) && user.role === UserRole.INSPECTOR) return true;
  return user.accountAccessRequests.some((request) => types.includes(request.type));
}

export async function getLandlordUnitWorkspaceModel(ctx: PlatformContext, input: { unitId: string }) {
  const allowed = await canAccessUnit(ctx.actor, input.unitId);
  if (!allowed) return null;

  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, NOT: { status: "ARCHIVED" }, property: { isArchived: false } },
    include: {
      property: true,
      tenantUser: true,
      propertyManager: true,
      maintenanceUser: true,
      caseworker: true,
      currentApplication: { include: { applicantUser: true } },
      leads: { orderBy: { updatedAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" }, take: 2 }, application: true } },
      applications: { orderBy: { updatedAt: "desc" }, include: { applicantUser: true, notes: { orderBy: { createdAt: "desc" }, take: 2 }, documentRequests: true } },
      occupancies: { select: { status: true }, orderBy: { updatedAt: "desc" } },
      notices: { select: { status: true }, orderBy: { updatedAt: "desc" }, take: 5 },
      photos: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      profileConnections: {
        where: { status: ConnectionStatus.ACTIVE },
        include: { target: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: [{ assignedRole: "asc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!unit) return null;

  const applicationIds = Array.from(new Set([unit.currentApplicationId, ...unit.applications.map((application) => application.id)].filter(Boolean) as string[]));
  const applicationScope = applicationIds.length > 0 ? applicationIds : ["none"];
  const primaryApplication = unit.currentApplication ?? unit.applications[0] ?? null;
  const tenantName = unit.tenantUser?.name ?? unit.currentApplication?.applicantName ?? unit.tenantUser?.email ?? unit.currentApplication?.applicantEmail ?? "No tenant assigned";

  const [leasePackets, ledgerEntries, paymentPlans, maintenanceRequests, messageThreads, inspections, documents, tenants, staffUsers] = await Promise.all([
    prisma.leasePacket.findMany({
      where: { applicationId: { in: applicationScope } },
      include: { template: true, application: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.ledgerEntry.findMany({
      where: { unitId: unit.id },
      include: { tenantUser: true, application: true },
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take: 20
    }),
    prisma.paymentPlan.findMany({
      where: { unitId: unit.id },
      include: { tenantUser: true, application: true, installments: { orderBy: { dueDate: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.maintenanceRequest.findMany({
      where: { unitId: unit.id },
      include: { requester: { select: { name: true, email: true } }, assignedTo: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.messageThread.findMany({
      where: {
        OR: [
          { applicationId: { in: applicationScope } },
          { maintenanceRequest: { unitId: unit.id } },
          { createdById: ctx.actor.userId, applicationId: { in: applicationScope } }
        ]
      },
      include: {
        messages: { include: { sender: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 3 }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.inspection.findMany({
      where: { unitId: unit.id },
      include: { assignedTo: { select: { name: true, email: true } }, application: true, checklistItems: true },
      orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.document.findMany({
      where: { OR: [{ unitId: unit.id }, { applicationId: { in: applicationScope } }, { propertyId: unit.propertyId }] },
      include: { application: true, leasePacket: { include: { template: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.user.findMany({
      where: {
        role: { in: [UserRole.APPLICANT, UserRole.TENANT] },
        isActive: true,
        OR: [
          { applications: { some: { unit: { property: { ownerId: unit.property.ownerId } } } } },
          { tenantLedgerEntries: { some: { unit: { property: { ownerId: unit.property.ownerId } } } } },
          { currentTenantUnits: { some: { property: { ownerId: unit.property.ownerId } } } }
        ]
      },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true }
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: [UserRole.ADMIN, UserRole.LANDLORD, UserRole.INSPECTOR] } },
          { accountAccessRequests: { some: { status: "APPROVED", type: { in: [AccountAccessType.PROPERTY_MANAGER, AccountAccessType.CASEWORKER, AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR] } } } }
        ]
      },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true, role: true, accountAccessRequests: { where: { status: "APPROVED" }, select: { type: true } } }
    })
  ]);

  const balance = ledgerBalance(ledgerEntries);
  const payments = ledgerEntries.filter((entry) => entry.type === "PAYMENT" || entry.type === "CREDIT");
  const charges = ledgerEntries.filter((entry) => entry.type !== "PAYMENT" && entry.type !== "CREDIT");
  const moveInTotal = unit.rentAmount + (unit.deposit ?? 0);
  const tenantHistory = unit.applications.filter((application) => application.id !== primaryApplication?.id);
  const featuredPhoto = unit.photos[0];
  const staffContacts = unit.profileConnections.map((connection) => `${label(connection.assignedRole)}: ${connection.target.name || connection.target.email} - ${connection.target.email}`);
  const propertyManagerOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.PROPERTY_MANAGER, AccountAccessType.LANDLORD]));
  const maintenanceOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR]));
  const caseworkerOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.CASEWORKER]));
  const openMaintenance = maintenanceRequests.filter((request) => request.status !== MaintenanceRequestStatus.COMPLETED && request.status !== MaintenanceRequestStatus.CANCELLED);
  const activeLease = leasePackets.find((packet) => packet.status === "COMPLETED") ?? leasePackets[0] ?? null;
  const activeInspections = inspections.filter((inspection) => inspection.status === "SCHEDULED" || inspection.status === "IN_PROGRESS" || inspection.status === "NEEDS_REINSPECTION");
  const missingDocumentRequests = unit.applications.reduce((total, application) => total + application.documentRequests.filter((request) => request.status === "REQUESTED" || request.status === "REJECTED").length, 0);

  const listingHealthItems = [
    { label: "Photos", complete: unit.photos.length >= 4, detail: `${unit.photos.length}/4 minimum` },
    { label: "Headline", complete: Boolean(unit.marketingHeadline || unit.description), detail: unit.marketingHeadline ? "Marketing headline set" : "Needs headline or description" },
    { label: "Pricing", complete: unit.rentAmount > 0 && Boolean(unit.deposit !== null), detail: `${formatCurrency(unit.rentAmount)} rent / ${unit.deposit ? formatCurrency(unit.deposit) : "no deposit"}` },
    { label: "Terms", complete: Boolean(unit.leaseTermsNote || unit.rentDueDay || unit.lateFeePolicy), detail: unit.leaseTermsNote ?? "Lease terms not summarized" },
    { label: "Location", complete: Boolean(unit.neighborhood || unit.schoolDistrict || unit.nearbyFeatures), detail: unit.neighborhood ?? unit.schoolDistrict ?? "Needs neighborhood context" },
    { label: "Contacts", complete: staffContacts.length > 0 || Boolean(unit.importantContacts), detail: staffContacts.length > 0 ? `${staffContacts.length} assigned` : "No support contact saved" }
  ];
  const listingHealthScore = Math.round((listingHealthItems.filter((item) => item.complete).length / listingHealthItems.length) * 100);

  const actionItems = [
    listingHealthScore < 100 ? { title: "Improve listing health", detail: `${listingHealthScore}% complete. Add missing photos, terms, location context, or contacts.`, href: "#listing-health", tone: "urgent" as const } : null,
    unit.leads.length > 0 ? { title: "Review lead pipeline", detail: `${unit.leads.length} lead${unit.leads.length === 1 ? "" : "s"} attached to this rental.`, href: "#pipeline", tone: "default" as const } : null,
    missingDocumentRequests > 0 ? { title: "Clear document requests", detail: `${missingDocumentRequests} application document request${missingDocumentRequests === 1 ? "" : "s"} need attention.`, href: "#documents", tone: "urgent" as const } : null,
    openMaintenance.length > 0 ? { title: "Triage maintenance", detail: `${openMaintenance.length} open repair${openMaintenance.length === 1 ? "" : "s"} on this rental.`, href: "#maintenance", tone: "urgent" as const } : null,
    activeInspections.length > 0 ? { title: "Watch inspections", detail: `${activeInspections.length} inspection${activeInspections.length === 1 ? "" : "s"} scheduled or in progress.`, href: "#inspections", tone: "default" as const } : null,
    balance > 0 ? { title: "Review balance", detail: `${formatCurrency(balance)} open ledger balance.`, href: "#ledger", tone: "urgent" as const } : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const timelineItems = [
    ...unit.leads.slice(0, 4).map((lead) => ({ sortAt: lead.updatedAt, title: `Lead: ${lead.name}`, detail: `${label(lead.status)} - ${lead.email} - ${lead.message ?? "No message"}`, href: `/landlord/leads/${lead.id}`, tone: lead.status === "NEW" ? "urgent" as const : "default" as const })),
    ...unit.applications.slice(0, 4).map((application) => ({ sortAt: application.updatedAt, title: `Application: ${application.applicantName}`, detail: `${label(application.status)} - ${application.applicantEmail}`, href: `/landlord/applications/${application.id}`, tone: application.status === "SUBMITTED" ? "urgent" as const : "default" as const })),
    ...leasePackets.slice(0, 3).map((packet) => ({ sortAt: packet.updatedAt, title: `Lease: ${packet.template.name}`, detail: `${label(packet.status)} - ${packet.application.applicantName} - ${formatCurrency(packet.monthlyRent)}/mo`, href: `/landlord/leases/${packet.id}`, tone: packet.status === "COMPLETED" ? "success" as const : "default" as const })),
    ...ledgerEntries.slice(0, 4).map((entry) => ({ sortAt: entry.updatedAt, title: `Ledger: ${ledgerTypeLabel(entry.type)}`, detail: `${entry.description} - ${formatCurrency(entry.amount)} - ${ledgerStatusLabel(entry.status)}`, href: "/landlord/ledger", tone: entry.status === "PENDING" ? "urgent" as const : "default" as const })),
    ...maintenanceRequests.slice(0, 4).map((request) => ({ sortAt: request.updatedAt, title: `Maintenance: ${request.subject}`, detail: `${label(request.status)} - ${label(request.priority)} - ${request.requester.name || request.requester.email}`, href: "#maintenance", tone: request.status === MaintenanceRequestStatus.COMPLETED ? "success" as const : "urgent" as const })),
    ...inspections.slice(0, 3).map((inspection) => ({ sortAt: inspection.updatedAt, title: `Inspection: ${label(inspection.status)}`, detail: `${shortDateTime(inspection.scheduledFor)} - ${inspection.inspectorName || inspection.assignedTo?.name || inspection.assignedTo?.email || "Unassigned"}`, href: `/landlord/inspections/${inspection.id}`, tone: inspection.status === "PASSED" ? "success" as const : "default" as const })),
    ...documents.slice(0, 3).map((document) => ({ sortAt: document.updatedAt, title: `Document: ${document.title}`, detail: `${label(document.category)} - ${label(document.status)} - ${document.application?.applicantName ?? document.leasePacket?.template.name ?? "Rental file"}`, href: `/api/documents/${document.id}`, tone: document.status === "UPLOADED" ? "success" as const : "default" as const }))
  ].sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime()).slice(0, 12);

  const lifecycleRecommendation = recommendRentalLifecycle({
    unitStatus: unit.status,
    storedLifecycleStatus: unit.lifecycleStatus ?? RentalLifecycleStatus.DRAFT,
    tenantUserId: unit.tenantUserId,
    currentApplicationId: unit.currentApplicationId,
    leadCount: unit.leads.length,
    applicationStatuses: unit.applications.map((application) => application.status),
    leasePacketStatuses: leasePackets.map((packet) => packet.status),
    occupancyStatuses: unit.occupancies.map((occupancy) => occupancy.status),
    noticeStatuses: unit.notices.map((notice) => notice.status),
    openMaintenanceCount: openMaintenance.length,
    photoCount: unit.photos.length,
    hasDescription: Boolean(unit.description || unit.marketingHeadline),
    hasTerms: Boolean(unit.leaseTermsNote && unit.rentAmount > 0)
  });

  return {
    unit,
    applicationIds,
    primaryApplication,
    tenantName,
    leasePackets,
    ledgerEntries,
    paymentPlans,
    maintenanceRequests,
    messageThreads,
    inspections,
    documents,
    tenants,
    staffUsers,
    balance,
    payments,
    charges,
    moveInTotal,
    tenantHistory,
    featuredPhoto,
    staffContacts,
    propertyManagerOptions,
    maintenanceOptions,
    caseworkerOptions,
    openMaintenance,
    activeLease,
    activeInspections,
    missingDocumentRequests,
    listingHealthItems,
    listingHealthScore,
    actionItems,
    timelineItems,
    lifecycleRecommendation
  };
}

export type LandlordUnitWorkspaceModel = Prisma.PromiseReturnType<typeof getLandlordUnitWorkspaceModel>;
