import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/UnitForm";
import { prisma } from "@/lib/prisma";

export default async function NewUnitPage() {
  const properties = await prisma.property.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, addressLine: true, city: true, state: true }
  });

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Add Unit"
        description="Create a unit under an existing property. This is the inventory record that appears in the marketplace when available."
      />
      {properties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black text-slate-950">Create a property first</h2>
          <p className="mt-2 text-slate-600">Units must be attached to a property so large portfolios stay organized.</p>
          <Link href="/admin/properties/new" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Add Property</Link>
        </div>
      ) : (
        <UnitForm properties={properties} />
      )}
    </main>
  );
}
