export const dynamic = "force-dynamic";

import { UserRole } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/UnitForm";
import { prisma } from "@/lib/prisma";

export default async function NewUnitPage() {
  const landlords = await prisma.user.findMany({
    where: { role: UserRole.LANDLORD, isActive: true },
    orderBy: { email: "asc" },
    select: { id: true, name: true, email: true }
  });

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Add Rental"
        description="Create one complete rental record. Choose whether it is a single-family home, apartment, mobile home, townhouse, duplex, condo, room, or commercial space."
      />
      <UnitForm landlords={landlords} />
    </main>
  );
}
