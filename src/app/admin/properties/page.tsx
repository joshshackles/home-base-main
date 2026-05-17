import Link from "next/link";
import { archiveProperty, restoreProperty } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";

export default async function PropertiesAdminPage() {
  const properties = await prisma.property.findMany({
    include: { units: true, owner: true },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Properties"
        description="Create and manage buildings, complexes, and landlord-owned locations. Each property can contain many units."
        actionHref="/admin/properties/new"
        actionLabel="Add Property"
      />

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Property</th>
              <th className="px-5 py-4">Address</th>
              <th className="px-5 py-4">Owner</th>
              <th className="px-5 py-4">Units</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-600">No properties have been added yet.</td>
              </tr>
            ) : properties.map((property) => (
              <tr key={property.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{property.name}</p>
                  {property.description ? <p className="mt-1 line-clamp-1 max-w-xs text-xs text-slate-500">{property.description}</p> : null}
                </td>
                <td className="px-5 py-4 text-slate-600">{property.addressLine}, {property.city}, {property.state} {property.zip}</td>
                <td className="px-5 py-4 text-slate-600">{property.owner?.name ?? "Unassigned"}</td>
                <td className="px-5 py-4 font-bold text-slate-950">{property.units.length}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${property.isArchived ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {property.isArchived ? "Archived" : "Active"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/properties/${property.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Edit</Link>
                    <form action={property.isArchived ? restoreProperty : archiveProperty}>
                      <input type="hidden" name="id" value={property.id} />
                      <button className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white" type="submit">
                        {property.isArchived ? "Restore" : "Archive"}
                      </button>
                    </form>

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
