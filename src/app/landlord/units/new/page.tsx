export const dynamic = "force-dynamic";

import { UserRole } from "@prisma/client";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { LandlordUnitForm } from "@/components/landlord/LandlordUnitForm";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewLandlordUnitPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const tenants = await prisma.user.findMany({
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
  });

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Add Rental" description="Create one rental record with address, rental type, pricing, listing details, and optional tenant links. No separate property setup is required." actionHref="/landlord/rentals" actionLabel="Back to rentals" />
      <LandlordUnitForm tenants={tenants} />
    </main>
  );
}
