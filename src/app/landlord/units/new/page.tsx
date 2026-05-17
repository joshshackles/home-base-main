export const dynamic = "force-dynamic";

import Link from "next/link";
import { UserRole } from "@prisma/client";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { LandlordUnitForm } from "@/components/landlord/LandlordUnitForm";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewLandlordUnitPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const [properties, tenants] = await Promise.all([
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
    })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Add Unit" description="Create a unit under one of your properties. Set the status to AVAILABLE when it should publish to the public marketplace." actionHref="/landlord/units" actionLabel="Back to units" />
      {properties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black text-slate-950">Choose the right starting point</h2>
          <p className="mt-2 text-slate-600">If this is a single-family rental, create a home listing in one step. If this is a building with multiple units, create the property first.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/landlord/homes/new" className="inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Add Home</Link>
            <Link href="/landlord/properties/new" className="inline-flex rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Add Multi-unit Property</Link>
          </div>
        </div>
      ) : (
        <LandlordUnitForm properties={properties} tenants={tenants} />
      )}
    </main>
  );
}
