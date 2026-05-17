export const dynamic = "force-dynamic";

import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordUnitsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const units = await prisma.unit.findMany({
    where: { property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } },
    include: { property: true, tenantUser: true, currentApplication: true, leads: true, applications: true },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="My Units" description="Create unit listings, publish available units to the marketplace, and manage tenant workflow links." actionHref="/landlord/homes/new" actionLabel="Add Home" />
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Link href="/landlord/homes/new" className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 transition hover:border-emerald-200 hover:bg-emerald-100">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Fast path</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Add a single-family home</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">One address, one rentable home. Creates the property and listing in one step.</p>
        </Link>
        <Link href="/landlord/units/new" className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:bg-brand-50">
          <p className="text-xs font-black uppercase tracking-wide text-brand-700">Portfolio path</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Add a unit to a property</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Best for apartment buildings, complexes, duplexes, or properties with multiple rentable units.</p>
        </Link>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Unit</th>
              <th className="px-5 py-4">Property</th>
              <th className="px-5 py-4">Rent</th>
              <th className="px-5 py-4">Size</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Activity</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {units.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No listings yet. Add a home for a single-family rental, or add a unit for a multi-unit property.</td></tr>
            ) : units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50">
                <td className="px-5 py-4"><p className="font-bold text-slate-950">#{unit.unitNumber}</p>{unit.voucherFriendly ? <p className="mt-1 text-xs font-bold text-brand-700">Voucher-friendly</p> : null}</td>
                <td className="px-5 py-4 text-slate-600">{unit.property.name}<br />{unit.property.city}, {unit.property.state}</td>
                <td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(unit.rentAmount)}</td>
                <td className="px-5 py-4 text-slate-600">{unit.bedrooms} bd / {unit.bathrooms} ba<br />{unit.squareFeet ? `${unit.squareFeet.toLocaleString()} sq ft` : "Sq ft not set"}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(unit.status)}</span></td>
                <td className="px-5 py-4 text-slate-600">
                  {unit.tenantUser ? `${unit.tenantUser.name || unit.tenantUser.email}` : unit.currentApplication?.applicantName ?? "No tenant assigned"}
                  <br />{unit.leads.length} leads / {unit.applications.length} applications
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/landlord/units/${unit.id}`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Open</Link>
                    {unit.status === "AVAILABLE" ? <Link href={`/marketplace/${unit.id}`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Public</Link> : null}
                    <Link href={`/landlord/units/${unit.id}/edit`} className="rounded-xl bg-brand-600 px-3 py-2 font-bold text-white hover:bg-brand-700">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
