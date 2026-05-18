export const dynamic = "force-dynamic";

import Link from "next/link";
import { archiveUnit, restoreUnit } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function UnitsAdminPage() {
  const units = await prisma.unit.findMany({
    include: { property: true },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Rentals"
        description="Manage each rental as one record with address, type, pricing, availability, utility notes, pets, and accessibility details."
        actionHref="/admin/units/new"
        actionLabel="Add Rental"
      />

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Rental</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Beds/Baths</th>
              <th className="px-5 py-4">Rent</th>
              <th className="px-5 py-4">Voucher</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {units.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-600">No rentals have been added yet.</td>
              </tr>
            ) : units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{unit.property.name}{unit.unitNumber !== "Main" ? ` #${unit.unitNumber}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{unit.property.addressLine}, {unit.property.city}, {unit.property.state}</p>
                </td>
                <td className="px-5 py-4 font-bold text-slate-950">{unit.rentalType.replaceAll("_", " ")}</td>
                <td className="px-5 py-4 text-slate-600">{unit.bedrooms} / {unit.bathrooms}</td>
                <td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(unit.rentAmount)}</td>
                <td className="px-5 py-4 text-slate-600">{unit.voucherFriendly ? "Yes" : "No"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{unit.status}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/units/${unit.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Edit</Link>
                    {unit.status !== "ARCHIVED" ? (
                      <form action={archiveUnit}>
                        <input type="hidden" name="id" value={unit.id} />
                        <button className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white" type="submit">Archive</button>
                      </form>
                    ) : (
                      <form action={restoreUnit}>
                        <input type="hidden" name="id" value={unit.id} />
                        <button className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white" type="submit">Restore</button>
                      </form>
                    )}
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
