export const dynamic = "force-dynamic";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";

export default async function SecurityEventsPage() {
  const events = await prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Security"
        title="Security Events"
        description="Review login attempts, account locks, password changes, and password reset activity."
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{event.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{event.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-slate-600">{event.email || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{event.message}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No security events have been recorded yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
