export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/UnitForm";
import { prisma } from "@/lib/prisma";

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const [unit, landlords] = await Promise.all([
    prisma.unit.findUnique({ where: { id: params.id }, include: { property: true } }),
    prisma.user.findMany({ where: { role: UserRole.LANDLORD, isActive: true }, orderBy: { email: "asc" }, select: { id: true, name: true, email: true } })
  ]);

  if (!unit) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Edit Rental" description="Update the rental address, rental type, pricing, availability, and listing details from one screen." />
      <UnitForm landlords={landlords} unit={unit} />
    </main>
  );
}
