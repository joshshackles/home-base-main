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
      <LandlordPageHeader title="My Units" description="Create unit listings, publish available units to the marketplace, and manage tenant workflow links." actionHref="/landlord/units/new" actionLabel="Add Unit" />
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
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No units are currently assigned to your account.</td></tr>
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
