import { MaintenanceRequestStatus, UnitStatus, type Prisma } from "@prisma/client";
import { recommendRentalLifecycle } from "@/lib/rental-lifecycle-engine";
import type { RentalLifecycleBoardItem } from "@/components/rentals/RentalLifecycleBoard";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export async function getRentalLifecycleBoardItems(input: { ownerId?: string; basePath: "admin" | "landlord" }): Promise<RentalLifecycleBoardItem[]> {
  const where: Prisma.UnitWhereInput = {
    NOT: { status: UnitStatus.ARCHIVED },
    property: input.ownerId ? { ownerId: input.ownerId, isArchived: false } : { isArchived: false }
  };

  const units = await prisma.unit.findMany({
    where,
    include: {
      property: { select: { name: true, addressLine: true, city: true, state: true } },
      tenantUser: { select: { name: true, email: true } },
      leads: { select: { id: true } },
      photos: { select: { id: true } },
      applications: {
        select: {
          id: true,
          applicantName: true,
          status: true,
          leasePackets: { select: { status: true } }
        },
        orderBy: { updatedAt: "desc" }
      },
      occupancies: { select: { status: true }, orderBy: { updatedAt: "desc" } },
      notices: { select: { status: true }, orderBy: { updatedAt: "desc" }, take: 5 },
      maintenanceRequests: {
        where: { status: { notIn: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED] } },
        select: { id: true }
      }
    },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
  });

  return units.map((unit) => {
    const recommendation = recommendRentalLifecycle({
      unitStatus: unit.status,
      storedLifecycleStatus: unit.lifecycleStatus,
      tenantUserId: unit.tenantUserId,
      currentApplicationId: unit.currentApplicationId,
      leadCount: unit.leads.length,
      applicationStatuses: unit.applications.map((application) => application.status),
      leasePacketStatuses: unit.applications.flatMap((application) => application.leasePackets.map((packet) => packet.status)),
      occupancyStatuses: unit.occupancies.map((occupancy) => occupancy.status),
      noticeStatuses: unit.notices.map((notice) => notice.status),
      openMaintenanceCount: unit.maintenanceRequests.length,
      photoCount: unit.photos.length,
      hasDescription: Boolean(unit.description || unit.marketingHeadline),
      hasTerms: Boolean(unit.leaseTermsNote && unit.rentAmount > 0)
    });

    const routeBase = `/${input.basePath}`;
    const title = `${unit.property.name}${unit.unitNumber !== "Main" ? ` #${unit.unitNumber}` : ""}`;
    const subtitleParts = [
      `${unit.property.addressLine}, ${unit.property.city}, ${unit.property.state}`,
      `${formatCurrency(unit.rentAmount)}/mo`,
      unit.tenantUser ? `Tenant: ${unit.tenantUser.name || unit.tenantUser.email}` : "No tenant assigned"
    ];

    return {
      id: unit.id,
      title,
      subtitle: subtitleParts.join(" - "),
      href: `${routeBase}/rentals/${unit.id}`,
      publicHref: `/marketplace/${unit.id}`,
      editHref: `${routeBase}/rentals/${unit.id}/edit`,
      leadsHref: `${routeBase}/leads`,
      applicationsHref: `${routeBase}/applications`,
      leasesHref: `${routeBase}/leases`,
      ledgerHref: `${routeBase}/ledger`,
      maintenanceHref: `${routeBase}/maintenance`,
      noticesHref: `${routeBase}/notices`,
      documentsHref: `${routeBase}/documents`,
      inspectionsHref: `${routeBase}/inspections`,
      calendarHref: `${routeBase}/calendar`,
      inboxHref: `${routeBase}/inbox`,
      recommendation
    };
  });
}
