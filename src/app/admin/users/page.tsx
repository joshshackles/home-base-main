export const dynamic = "force-dynamic";

import Link from "next/link";
import { activateUser, deactivateUser } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  LANDLORD: "Landlord",
  APPLICANT: "Applicant",
  TENANT: "Tenant",
  INSPECTOR: "Inspector"
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { properties: { select: { id: true, name: true, isArchived: true } } }
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Users & Roles"
        description="Create staff and landlord accounts, control roles, and see property ownership assignments."
        actionHref="/admin/users/new"
        actionLabel="Add User"
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Properties</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950">{user.name || "Unnamed User"}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{roleLabels[user.role]}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {user.properties.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {user.properties.slice(0, 4).map((property) => (
                          <span key={property.id}>{property.name}{property.isArchived ? " (archived)" : ""}</span>
                        ))}
                        {user.properties.length > 4 ? <span className="text-xs text-slate-400">+{user.properties.length - 4} more</span> : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">No assigned properties</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/users/${user.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50">
                        Edit
                      </Link>
                      {user.isActive ? (
                        <form action={deactivateUser}>
                          <input type="hidden" name="id" value={user.id} />
                          <button className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-700 hover:bg-amber-100" type="submit">
                            Deactivate
                          </button>
                        </form>
                      ) : (
                        <form action={activateUser}>
                          <input type="hidden" name="id" value={user.id} />
                          <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-700 hover:bg-emerald-100" type="submit">
                            Activate
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
