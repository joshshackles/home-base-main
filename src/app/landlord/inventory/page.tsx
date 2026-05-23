export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import { MaintenanceRequestStatus, RentalMarketingStatus, UnitStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, DollarSign, Home, PackageSearch, Search, ShieldCheck, Wrench } from "lucide-react";
import { MaintenanceInventoryModule } from "@/components/operations/MaintenanceInventoryModule";
import { createLandlordAssetServiceRecordAction, createLandlordAssetWarrantyAction, createLandlordKeyLockRecordAction, createLandlordMaintenanceAssetAction } from "@/app/landlord/actions";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getMaintenanceInventoryModule } from "@/lib/operations/modules";
import { prisma } from "@/lib/prisma";

const activeApplicationStatuses = ["STARTED", "SUBMITTED", "UNDER_REVIEW"] as const;
const openMaintenanceStatuses = ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] as const;
const activeInspectionStatuses = ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] as const;
const inventoryUnitInclude = {
  property: true,
  tenantUser: true,
  currentApplication: true,
  ledgerEntries: { select: { amount: true, type: true, status: true } },
  _count: {
    select: {
      leads: { where: { status: { in: ["NEW", "CONTACTED"] } } },
      applications: { where: { status: { in: [...activeApplicationStatuses] } } },
      maintenanceRequests: { where: { status: { in: [...openMaintenanceStatuses] } } },
      inspections: { where: { status: { in: [...activeInspectionStatuses] } } }
    }
  }
} satisfies Prisma.UnitInclude;

type InventoryUnit = Prisma.UnitGetPayload<{ include: typeof inventoryUnitInclude }>;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(value: string) {
  if (["AVAILABLE", "ACTIVE"].includes(value)) return "bg-emerald-100 text-emerald-800";
  if (["OCCUPIED"].includes(value)) return "bg-blue-100 text-blue-800";
  if (["PENDING", "DRAFT", "PAUSED"].includes(value)) return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function balanceFor(unit: { ledgerEntries: Array<{ amount: number; type: string; status: string }> }) {
  return unit.ledgerEntries.reduce((total, entry) => {
    if (entry.status !== "POSTED") return total;
    if (entry.type === "CHARGE" || entry.type === "ADJUSTMENT") return total + entry.amount;
    if (entry.type === "PAYMENT" || entry.type === "CREDIT") return total - entry.amount;
    return total;
  }, 0);
}

function viewWhere(view: string): Prisma.UnitWhereInput {
  switch (view) {
    case "vacant":
      return { status: UnitStatus.AVAILABLE };
    case "occupied":
      return { status: UnitStatus.OCCUPIED };
    case "listed":
      return { marketingStatus: RentalMarketingStatus.ACTIVE };
    case "unlisted":
      return { marketingStatus: { in: [RentalMarketingStatus.DRAFT, RentalMarketingStatus.PAUSED] } };
    case "maintenance":
      return { maintenanceRequests: { some: { status: { in: [...openMaintenanceStatuses] } } } };
    case "applications":
      return { applications: { some: { status: { in: [...activeApplicationStatuses] } } } };
    case "inspections":
      return { inspections: { some: { status: { in: [...activeInspectionStatuses] } } } };
    default:
      return {};
  }
}

export default async function LandlordInventoryPage({ searchParams }: { searchParams?: { q?: string; view?: string; status?: string; marketing?: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord/inventory");
  const query = searchParams?.q?.trim() ?? "";
  const view = searchParams?.view?.trim() ?? "";
  const statusValue = searchParams?.status?.trim() ?? "";
  const marketingValue = searchParams?.marketing?.trim() ?? "";
  const status = Object.values(UnitStatus).includes(statusValue as UnitStatus) && statusValue !== UnitStatus.ARCHIVED ? statusValue as UnitStatus : "";
  const marketing = Object.values(RentalMarketingStatus).includes(marketingValue as RentalMarketingStatus) && marketingValue !== RentalMarketingStatus.ARCHIVED ? marketingValue as RentalMarketingStatus : "";

  const baseUnitScope: Prisma.UnitWhereInput = {
    OR: [
      { property: { ownerId: user.userId, isArchived: false } },
      { propertyManagerUserId: user.userId, property: { isArchived: false } }
    ],
    NOT: { status: UnitStatus.ARCHIVED }
  };

  const unitWhere: Prisma.UnitWhereInput = {
    AND: [
      baseUnitScope,
      viewWhere(view),
      status ? { status } : {},
      marketing ? { marketingStatus: marketing } : {},
      query
        ? {
            OR: [
              { unitNumber: { contains: query, mode: "insensitive" } },
              { marketingHeadline: { contains: query, mode: "insensitive" } },
              { neighborhood: { contains: query, mode: "insensitive" } },
              { property: { name: { contains: query, mode: "insensitive" } } },
              { property: { addressLine: { contains: query, mode: "insensitive" } } },
              { property: { city: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {}
    ]
  };

  const [units, counts, assetData] = await Promise.all([
    prisma.unit.findMany({
      where: unitWhere,
      include: inventoryUnitInclude,
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }]
    }),
    Promise.all([
      prisma.unit.count({ where: baseUnitScope }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { status: UnitStatus.AVAILABLE }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { status: UnitStatus.OCCUPIED }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { marketingStatus: RentalMarketingStatus.ACTIVE }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { marketingStatus: { in: [RentalMarketingStatus.DRAFT, RentalMarketingStatus.PAUSED] } }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { maintenanceRequests: { some: { status: { in: [...openMaintenanceStatuses] } } } }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { applications: { some: { status: { in: [...activeApplicationStatuses] } } } }] } }),
      prisma.unit.count({ where: { AND: [baseUnitScope, { inspections: { some: { status: { in: [...activeInspectionStatuses] } } } }] } })
    ]),
    getMaintenanceInventoryModule(user.userId)
  ]);

  const [totalUnits, vacantUnits, occupiedUnits, listedUnits, unlistedUnits, maintenanceUnits, applicationUnits, inspectionUnits] = counts;
  const grouped = units.reduce<Array<{ property: string; city: string; state: string; units: typeof units }>>((groups, unit) => {
    const key = unit.property.id;
    const existing = groups.find((group) => group.property === key);
    if (existing) {
      existing.units.push(unit);
      return groups;
    }
    groups.push({ property: key, city: unit.property.city, state: unit.property.state, units: [unit] });
    return groups;
  }, []);

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Inventory</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Property & Unit Manager</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              The canonical portfolio view for properties, units, marketing state, occupancy, leasing activity, open work, inspections, and unit workspaces.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InventoryButton href="/landlord/properties/new" primary>Add Property</InventoryButton>
            <InventoryButton href="/landlord/rentals/new">Add Unit</InventoryButton>
            <InventoryButton href="/landlord/property-management">Command Center</InventoryButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard href="/landlord/inventory" label="Total units" value={totalUnits} detail={`${occupiedUnits} occupied`} icon={<Building2 size={18} />} />
          <MetricCard href="/landlord/inventory?view=vacant" label="Vacant" value={vacantUnits} detail="Needs leasing or turnover attention" icon={<Home size={18} />} warn={vacantUnits > 0} />
          <MetricCard href="/landlord/inventory?view=unlisted" label="Unlisted" value={unlistedUnits} detail={`${listedUnits} actively marketed`} icon={<PackageSearch size={18} />} warn={unlistedUnits > 0} />
          <MetricCard href="/landlord/inventory?view=maintenance" label="Operational holds" value={maintenanceUnits + inspectionUnits} detail={`${maintenanceUnits} repairs / ${inspectionUnits} inspections`} icon={<Wrench size={18} />} warn={maintenanceUnits + inspectionUnits > 0} />
        </div>
      </section>

      <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px_auto]" action="/landlord/inventory">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Search inventory
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                <input name="q" defaultValue={query} className="w-full rounded-2xl border border-slate-300 py-3 pl-10 pr-4 text-sm font-semibold normal-case text-slate-900" placeholder="Property, address, city, unit, neighborhood..." />
              </span>
            </label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Unit status
              <select name="status" defaultValue={status} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold normal-case text-slate-900">
                <option value="">All statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="PENDING">Pending</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Listing
              <select name="marketing" defaultValue={marketing} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold normal-case text-slate-900">
                <option value="">All listings</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
              </select>
            </label>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 md:self-end">Filter</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <QuickView href="/landlord/inventory?view=vacant" active={view === "vacant"} label="Vacant" count={vacantUnits} />
            <QuickView href="/landlord/inventory?view=listed" active={view === "listed"} label="Listed" count={listedUnits} />
            <QuickView href="/landlord/inventory?view=unlisted" active={view === "unlisted"} label="Unlisted" count={unlistedUnits} />
            <QuickView href="/landlord/inventory?view=applications" active={view === "applications"} label="Applications" count={applicationUnits} />
            <QuickView href="/landlord/inventory?view=maintenance" active={view === "maintenance"} label="Maintenance" count={maintenanceUnits} />
            <QuickView href="/landlord/inventory?view=inspections" active={view === "inspections"} label="Inspections" count={inspectionUnits} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4">
        {grouped.length > 0 ? grouped.map((group) => {
          const firstUnit = group.units[0];
          return (
            <article key={group.property} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">{firstUnit.property.name}</h2>
                  <p className="text-sm font-semibold text-slate-600">{firstUnit.property.addressLine}, {group.city}, {group.state}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm">{group.units.length} unit{group.units.length === 1 ? "" : "s"}</span>
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Marketing</th>
                      <th className="px-4 py-3">Rent / Deposit</th>
                      <th className="px-4 py-3">Tenant / Applicant</th>
                      <th className="px-4 py-3">Open Work</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.units.map((unit) => <InventoryTableRow key={unit.id} unit={unit} />)}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {group.units.map((unit) => <InventoryMobileCard key={unit.id} unit={unit} />)}
              </div>
            </article>
          );
        }) : (
          <section className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">No units match this view</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Adjust the filters, clear the quick view, or add a property and unit to begin managing your portfolio inventory.</p>
            <div className="mt-4 flex justify-center gap-2">
              <InventoryButton href="/landlord/inventory" primary>Clear filters</InventoryButton>
              <InventoryButton href="/landlord/properties/new">Add property</InventoryButton>
            </div>
          </section>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Assets and preventive maintenance</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Property Asset Register</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Track appliances, HVAC, keys, locks, warranties, service history, and preventive maintenance without confusing this with the property/unit inventory above.</p>
        </div>
        <MaintenanceInventoryModule
          scope="landlord"
          data={assetData}
          actions={{
            createAsset: createLandlordMaintenanceAssetAction,
            createServiceRecord: createLandlordAssetServiceRecordAction,
            createWarranty: createLandlordAssetWarrantyAction,
            createKeyLock: createLandlordKeyLockRecordAction
          }}
        />
      </section>
    </main>
  );
}

function InventoryTableRow({ unit }: { unit: InventoryUnit }) {
  const balance = balanceFor(unit);
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-4">
        <p className="font-black text-slate-950">#{unit.unitNumber}</p>
        <p className="text-xs font-semibold text-slate-500">{unit.bedrooms} bd / {unit.bathrooms} ba {unit.squareFeet ? `• ${unit.squareFeet.toLocaleString()} sq ft` : ""}</p>
      </td>
      <td className="px-4 py-4"><Badge value={unit.status} /></td>
      <td className="px-4 py-4"><Badge value={unit.marketingStatus} /></td>
      <td className="px-4 py-4 font-bold text-slate-950">{formatCurrency(unit.rentAmount)}<br /><span className="text-xs text-slate-500">{unit.deposit ? `${formatCurrency(unit.deposit)} deposit` : "Deposit not set"}</span></td>
      <td className="px-4 py-4 text-slate-600">{unit.tenantUser ? unit.tenantUser.name || unit.tenantUser.email : unit.currentApplication?.applicantName ?? "No resident assigned"}</td>
      <td className="px-4 py-4 text-slate-600">{unit._count.leads} leads / {unit._count.applications} apps<br />{unit._count.maintenanceRequests} repairs / {unit._count.inspections} inspections</td>
      <td className={`px-4 py-4 font-black ${balance > 0 ? "text-amber-700" : "text-slate-700"}`}>{formatCurrency(balance)}</td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Link href={`/landlord/units/${unit.id}/workspace`} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Workspace</Link>
          <Link href={`/landlord/rentals/${unit.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white">Edit</Link>
        </div>
      </td>
    </tr>
  );
}

function InventoryMobileCard({ unit }: { unit: InventoryUnit }) {
  const balance = balanceFor(unit);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{unit.property.name} #{unit.unitNumber}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{formatCurrency(unit.rentAmount)} rent • {unit.bedrooms} bd / {unit.bathrooms} ba</p>
        </div>
        <Badge value={unit.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
        <span className="rounded-xl bg-slate-50 px-3 py-2">Listing: {label(unit.marketingStatus)}</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">Balance: {formatCurrency(balance)}</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">{unit._count.leads} leads / {unit._count.applications} apps</span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">{unit._count.maintenanceRequests} repairs</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`/landlord/units/${unit.id}/workspace`} className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-center text-sm font-black text-white hover:bg-blue-700">Open workspace</Link>
        <Link href={`/landlord/rentals/${unit.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-700">Edit</Link>
      </div>
    </article>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusTone(value)}`}>{label(value)}</span>;
}

function MetricCard({ href, label, value, detail, icon, warn = false }: { href: string; label: string; value: string | number; detail: string; icon: React.ReactNode; warn?: boolean }) {
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white ${warn ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</span>
        <ArrowRight size={16} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </Link>
  );
}

function QuickView({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return <Link href={href} className={`rounded-full px-3 py-2 text-xs font-black ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label} <span className="opacity-75">{count}</span></Link>;
}

function InventoryButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
