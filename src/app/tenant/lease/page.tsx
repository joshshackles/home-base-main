export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeOccupancyStatuses } from "@/lib/relationship-lifecycle";

function dateValue(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not set";
}

export default async function TenantLeasePage() {
  const user = await requireRole(["TENANT"], "/tenant/lease");
  const occupancies = await prisma.occupancy.findMany({
    where: { userId: user.userId, status: { in: activeOccupancyStatuses() } },
    include: { unit: { include: { property: true } }, leasePacket: true, application: true },
    orderBy: { startedAt: "desc" }
  });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-200">Resident home</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Current lease and unit</h1>
        <p className="mt-3 max-w-3xl text-slate-300">See your active residence, lease dates, linked packet, and next resident actions.</p>
      </section>

      <section className="mt-8 grid gap-5">
        {occupancies.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">No active tenancy is connected yet</h2>
            <p className="mt-2 text-slate-600">Once your landlord activates your tenancy, your unit, lease dates, documents, rent, and maintenance shortcuts will appear here.</p>
          </div>
        ) : occupancies.map((occupancy) => (
          <article key={occupancy.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Active residence</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{occupancy.unit.property.name} #{occupancy.unit.unitNumber}</h2>
                <p className="mt-1 text-slate-600">{occupancy.unit.property.addressLine}, {occupancy.unit.property.city}, {occupancy.unit.property.state} {occupancy.unit.property.zip}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-800 ring-1 ring-emerald-200">{occupancy.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Info label="Move-in" value={dateValue(occupancy.moveInDate)} />
              <Info label="Lease start" value={dateValue(occupancy.leaseStartDate)} />
              <Info label="Lease end" value={dateValue(occupancy.leaseEndDate)} />
              <Info label="Started" value={dateValue(occupancy.startedAt)} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/tenant/leases" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open lease packets</Link>
              <Link href="/tenant/payments" className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Rent center</Link>
              <Link href="/tenant/maintenance" className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Request maintenance</Link>
              <Link href="/tenant/documents" className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Documents</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>;
}
