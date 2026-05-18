export const dynamic = "force-dynamic";

import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { prisma } from "@/lib/prisma";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [property, landlords] = await Promise.all([
    prisma.property.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { role: UserRole.LANDLORD, isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true }
    })
  ]);

  if (!property) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Edit Property"
        description="Update the property record. Units attached to this property are managed from the units section."
      />
      <PropertyForm property={property} landlords={landlords} />
    </main>
  );
}
