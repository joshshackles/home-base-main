import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { LandlordUnitForm } from "@/components/landlord/LandlordUnitForm";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditLandlordUnitPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const [unit, properties, tenants, applications] = await Promise.all([
    prisma.unit.findFirst({
      where: { id: params.id, property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } },
      include: { property: true }
    }),
    prisma.property.findMany({
      where: { ownerId: user.userId, isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, state: true }
    }),
    prisma.user.findMany({
      where: {
        role: { in: [UserRole.APPLICANT, UserRole.TENANT] },
        isActive: true,
        OR: [
          { applications: { some: { unit: { property: { ownerId: user.userId } } } } },
          { tenantLedgerEntries: { some: { unit: { property: { ownerId: user.userId } } } } },
          { currentTenantUnits: { some: { property: { ownerId: user.userId } } } }
        ]
      },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true }
    }),
    prisma.application.findMany({
      where: { unitId: params.id, unit: { property: { ownerId: user.userId, isArchived: false } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, applicantName: true, applicantEmail: true, status: true }
    })
  ]);

  if (!unit) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={`Edit ${unit.property.name} #${unit.unitNumber}`} description="Update listing details, availability, and tenant workflow links." actionHref={`/landlord/units/${unit.id}`} actionLabel="Back to unit" />
      <LandlordUnitForm unit={unit} properties={properties} tenants={tenants} applications={applications} />
    </main>
  );
}
