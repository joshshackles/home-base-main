export const dynamic = "force-dynamic";

import Link from "next/link";
import { MaintenanceRequestStatus, Prisma, RentalMarketingStatus, UnitStatus } from "@prisma/client";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lifecycleLabel, recommendRentalLifecycle } from "@/lib/rental-lifecycle-engine";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordUnitsPage({ searchParams }: { searchParams?: { q?: string; status?: string; marketing?: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const query = searchParams?.q?.trim() ?? "";
  const statusValue = searchParams?.status?.trim() ?? "";
  const marketingValue = searchParams?.marketing?.trim() ?? "";
  const status = Object.values(UnitStatus).includes(statusValue as UnitStatus) && statusValue !== UnitStatus.ARCHIVED ? statusValue as UnitStatus : "";
  const marketing = Object.values(RentalMarketingStatus).includes(marketingValue as RentalMarketingStatus) && marketingValue !== RentalMarketingStatus.ARCHIVED ? marketingValue as RentalMarketingStatus : "";
  const unitWhere: Prisma.UnitWhereInput = {
    property: { ownerId: user.userId, isArchived: false },
    NOT: { status: UnitStatus.ARCHIVED },
    ...(status ? { status } : {}),
    ...(marketing ? { marketingStatus: marketing } : {}),
    ...(query
      ? {
          OR: [
            { unitNumber: { contains: query, mode: "insensitive" as const } },
            { marketingHeadline: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { property: { name: { contains: query, mode: "insensitive" as const } } },
            { property: { addressLine: { contains: query, mode: "insensitive" as const } } },
            { property: { city: { contains: query, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };
  const units = await prisma.unit.findMany({
    where: unitWhere,
    include: {
      property: true,
      tenantUser: true,
      currentApplication: true,
      leads: true,
      applications: { include: { leasePackets: { select: { status: true } } } },
      occupancies: { select: { status: true } },
      notices: { select: { status: true }, take: 5 },
      maintenanceRequests: { where: { status: { notIn: [MaintenanceRequestStatus.COMPLETED, MaintenanceRequestStatus.CANCELLED] } }, select: { id: true } },
      photos: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }], take: 1 }
    },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="My Rentals" description="Create rental listings as one record with address, rental type, pricing, photos, tenant links, and marketplace status." actionHref="/landlord/rentals/new" actionLabel="Add Rental" />
      <form className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]" action="/landlord/rentals">
        <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
          Search rentals
          <input name="q" defaultValue={query} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold normal-case text-slate-900" placeholder="Property, address, city, unit, listing text..." />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
          Unit status
          <select name="status" defaultValue={status} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold normal-case text-slate-900">
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="PENDING">Pending</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
          Listing
          <select name="marketing" defaultValue={marketing} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold normal-case text-slate-900">
            <option value="">All listings</option>
            <option value="ACTIVE">Public</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
          </select>
        </label>
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 md:self-end">Filter</button>
      </form>
      {units.length > 0 ? (
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => {
            const featuredPhoto = unit.photos[0];
            const lifecycle = recommendRentalLifecycle({
              unitStatus: unit.status,
              storedLifecycleStatus: unit.lifecycleStatus,
              tenantUserId: unit.tenantUserId,
              currentApplicationId: unit.currentApplicationId,
              leadCount: unit.leads.length,
              applicationStatuses: unit.applications.map((application) => application.status),
              leasePacketStatuses: unit.applications.flatMap((application) => application.leasePackets.map((packet) => packet.status)),
              occupancyStatuses: unit.occupancies.map((occupancy) => occupancy.status),
              noticeStatuses: unit.notices.map((notice) => notice.status),
              openMaintenanceCount: unit.maintenanceRequests.length,
              photoCount: unit.photos.length,
              hasDescription: Boolean(unit.description || unit.marketingHeadline),
              hasTerms: Boolean(unit.leaseTermsNote && unit.rentAmount > 0)
            });
            return (
              <Link key={unit.id} href={`/landlord/rentals/${unit.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl">
                <div className="relative h-44 bg-slate-950">
                  {featuredPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/unit-photos/${featuredPhoto.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-brand-700 text-sm font-black uppercase tracking-[0.25em] text-white/80">No photo yet</div>
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase text-slate-800">{label(unit.status)}</span>
                  <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/90 px-3 py-1 text-xs font-black uppercase text-white">{lifecycleLabel(lifecycle.status)}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{unit.property.name}{unit.unitNumber !== "Main" ? ` #${unit.unitNumber}` : ""}</h2>
                      <p className="mt-1 text-sm text-slate-600">{unit.property.addressLine}, {unit.property.city}</p>
                    </div>
                    <p className="text-right text-lg font-black text-slate-950">{formatCurrency(unit.rentAmount)}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
                    <span className="rounded-2xl bg-slate-50 px-2 py-2">{unit.bedrooms} bed</span>
                    <span className="rounded-2xl bg-slate-50 px-2 py-2">{unit.bathrooms} bath</span>
                    <span className="rounded-2xl bg-slate-50 px-2 py-2">{unit.leads.length} leads</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{unit.tenantUser ? `Tenant: ${unit.tenantUser.name || unit.tenantUser.email}` : unit.currentApplication?.applicantName ? `Linked to ${unit.currentApplication.applicantName}` : "No tenant assigned"}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-slate-500">Lifecycle confidence {lifecycle.confidence}% - {lifecycle.reason}</p>
                  <p className="mt-3 text-sm font-black text-brand-700">Open rental workspace</p>
                </div>
              </Link>
            );
          })}
        </section>
      ) : null}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Rental</th>
              <th className="px-5 py-4">Type / Address</th>
              <th className="px-5 py-4">Rent</th>
              <th className="px-5 py-4">Size</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Activity</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {units.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No rentals yet. Add a rental and choose the type: single-family home, apartment, mobile home, townhouse, duplex, condo, room, commercial, or other.</td></tr>
            ) : units.map((unit) => {
              const lifecycle = recommendRentalLifecycle({
                unitStatus: unit.status,
                storedLifecycleStatus: unit.lifecycleStatus,
                tenantUserId: unit.tenantUserId,
                currentApplicationId: unit.currentApplicationId,
                leadCount: unit.leads.length,
                applicationStatuses: unit.applications.map((application) => application.status),
                leasePacketStatuses: unit.applications.flatMap((application) => application.leasePackets.map((packet) => packet.status)),
                occupancyStatuses: unit.occupancies.map((occupancy) => occupancy.status),
                noticeStatuses: unit.notices.map((notice) => notice.status),
                openMaintenanceCount: unit.maintenanceRequests.length,
                photoCount: unit.photos.length,
                hasDescription: Boolean(unit.description || unit.marketingHeadline),
                hasTerms: Boolean(unit.leaseTermsNote && unit.rentAmount > 0)
              });
              return (
              <tr key={unit.id} className="hover:bg-slate-50">
                <td className="px-5 py-4"><p className="font-bold text-slate-950">{unit.property.name}{unit.unitNumber !== "Main" ? ` #${unit.unitNumber}` : ""}</p>{unit.voucherFriendly ? <p className="mt-1 text-xs font-bold text-brand-700">Voucher-friendly</p> : null}</td>
                <td className="px-5 py-4 text-slate-600">{unit.rentalType.replaceAll("_", " ")}<br />{unit.property.addressLine}, {unit.property.city}</td>
                <td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(unit.rentAmount)}</td>
                <td className="px-5 py-4 text-slate-600">{unit.bedrooms} bd / {unit.bathrooms} ba<br />{unit.squareFeet ? `${unit.squareFeet.toLocaleString()} sq ft` : "Sq ft not set"}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(unit.status)}</span><br /><span className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700">{lifecycleLabel(lifecycle.status)}</span></td>
                <td className="px-5 py-4 text-slate-600">
                  {unit.tenantUser ? `${unit.tenantUser.name || unit.tenantUser.email}` : unit.currentApplication?.applicantName ?? "No tenant assigned"}
                  <br />{unit.leads.length} leads / {unit.applications.length} applications
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/landlord/rentals/${unit.id}`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Open</Link>
                    {unit.status === UnitStatus.AVAILABLE ? <Link href={`/marketplace/${unit.id}`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-white">Public</Link> : null}
                    <Link href={`/landlord/rentals/${unit.id}/edit`} className="rounded-xl bg-brand-600 px-3 py-2 font-bold text-white hover:bg-brand-700">Edit</Link>
                  </div>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
