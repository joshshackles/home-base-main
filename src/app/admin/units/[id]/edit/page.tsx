import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/UnitForm";
import { prisma } from "@/lib/prisma";

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [unit, properties] = await Promise.all([
    prisma.unit.findUnique({ where: { id } }),
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, addressLine: true, city: true, state: true }
    })
  ]);

  if (!unit) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Edit Unit"
        description="Update pricing, status, voucher-friendly settings, and public-facing unit details."
      />
      <UnitForm properties={properties} unit={unit} />
    </main>
  );
}
