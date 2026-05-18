export const dynamic = "force-dynamic";

import { UserRole } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { prisma } from "@/lib/prisma";

export default async function NewPropertyPage() {
  const landlords = await prisma.user.findMany({
    where: { role: UserRole.LANDLORD, isActive: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true }
  });

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Add Property"
        description="Create a property record first, then add individual units underneath it."
      />
      <PropertyForm landlords={landlords} />
    </main>
  );
}
