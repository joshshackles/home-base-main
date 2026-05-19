export const dynamic = "force-dynamic";

import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordTenantsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/tenants");
  const occupancies = await prisma.occupancy.findMany({
    where: { unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: {
      tenant: { include: { applicantProfile: true } },
      unit: { include: { property: true } },
      application: { include: { applicationDetail: true } }
    },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Tenants" description="One place to see active and historical renters, units, application packet details, and occupancy status." actionHref="/landlord/applications" actionLabel="Applications" />
      <div className="grid gap-4">
        {occupancies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No tenant relationships have been activated yet.</div>
        ) : occupancies.map((occupancy) => (
          <Link key={occupancy.id} href={`/landlord/tenants/${occupancy.id}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-200 hover:bg-brand-50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{occupancy.tenant.name ?? occupancy.tenant.email}</h2>
                <p className="mt-1 text-slate-600">{occupancy.unit.property.name} #{occupancy.unit.unitNumber} - {occupancy.unit.property.city}, {occupancy.unit.property.state}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{label(occupancy.status)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{formatCurrency(occupancy.unit.rentAmount)} rent</span>
                  {occupancy.application?.applicationDetail?.signedAt ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Packet signed</span> : null}
                </div>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="font-bold text-slate-900">{occupancy.tenant.email}</p>
                <p className="mt-1">Started {occupancy.startedAt.toLocaleDateString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
