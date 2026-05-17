export const dynamic = "force-dynamic";

import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LandlordPropertiesPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const properties = await prisma.property.findMany({
    where: { ownerId: user.userId, isArchived: false },
    include: { units: true },
    orderBy: { name: "asc" }
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="My Properties" description="These are the active properties assigned to your landlord account." actionHref="/landlord/homes/new" actionLabel="Add Home" />
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm leading-6 text-slate-700">
          If you manage single-family rentals, use <Link href="/landlord/homes/new" className="font-black text-brand-700 hover:text-brand-900">Add Home</Link> to create the property and listing together. Use <Link href="/landlord/properties/new" className="font-black text-brand-700 hover:text-brand-900">Add Property</Link> when one property contains multiple rentable units.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {properties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            <h2 className="text-2xl font-black text-slate-950">Create your first property</h2>
            <p className="mt-2 leading-7">For a single-family rental, add a home and HomeBase will create both records together. For an apartment building or duplex, create a property first and then add units.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/landlord/homes/new" className="inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Add Home</Link>
              <Link href="/landlord/properties/new" className="inline-flex rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Add Multi-unit Property</Link>
            </div>
          </div>
        ) : properties.map((property) => {
          const available = property.units.filter((unit) => unit.status === "AVAILABLE").length;
          return (
            <article key={property.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">{property.name}</h2>
              <p className="mt-2 text-slate-600">{property.addressLine}, {property.city}, {property.state} {property.zip}</p>
              {property.description ? <p className="mt-4 leading-7 text-slate-700">{property.description}</p> : null}
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-700">
                <span className="rounded-full bg-slate-100 px-3 py-1">{property.units.length} units</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{available} available</span>
              </div>
              <Link href="/landlord/units" className="mt-5 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">View Units</Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
