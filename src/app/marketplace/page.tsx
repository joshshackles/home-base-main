import Link from "next/link";
import { Prisma, UnitStatus } from "@prisma/client";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UnitCard } from "@/components/UnitCard";

type MarketplaceSearchParams = {
  city?: string;
  maxRent?: string;
  bedrooms?: string;
  bathrooms?: string;
  voucherFriendly?: string;
  pets?: string;
  accessibility?: string;
};

function clean(value?: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function numberParam(value?: string) {
  const cleaned = clean(value);
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function MarketplacePage({ searchParams }: { searchParams?: MarketplaceSearchParams }) {
  const city = clean(searchParams?.city);
  const maxRent = numberParam(searchParams?.maxRent);
  const bedrooms = numberParam(searchParams?.bedrooms);
  const bathrooms = numberParam(searchParams?.bathrooms);
  const voucherFriendly = searchParams?.voucherFriendly === "on";
  const pets = searchParams?.pets === "on";
  const accessibility = searchParams?.accessibility === "on";

  const where: Prisma.UnitWhereInput = {
    status: UnitStatus.AVAILABLE,
    property: {
      isArchived: false,
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {})
    },
    ...(maxRent !== undefined ? { rentAmount: { lte: maxRent } } : {}),
    ...(bedrooms !== undefined ? { bedrooms: { gte: bedrooms } } : {}),
    ...(bathrooms !== undefined ? { bathrooms: { gte: bathrooms } } : {}),
    ...(voucherFriendly ? { voucherFriendly: true } : {}),
    ...(pets ? { petPolicy: { not: null } } : {}),
    ...(accessibility ? { accessibility: { not: null } } : {})
  };

  const units = await prisma.unit.findMany({
    where,
    include: { property: true },
    orderBy: [{ rentAmount: "asc" }, { createdAt: "desc" }]
  });

  const activeFilterCount = [city, maxRent, bedrooms, bathrooms, voucherFriendly, pets, accessibility].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-[2rem] bg-slate-950 p-8 text-white shadow-lg">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-200">Marketplace</p>
        <h1 className="mt-3 text-4xl font-black">Available Rental Units</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Search available units by city, rent, bedrooms, voucher-friendly status, pet policy, and accessibility notes.
        </p>
      </section>

      <form className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" action="/marketplace">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-black text-slate-950">
            <SlidersHorizontal size={20} /> Filter listings
          </div>
          {activeFilterCount > 0 ? (
            <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <X size={15} /> Clear filters
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            City
            <input name="city" defaultValue={city ?? ""} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50" placeholder="Joplin" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Max rent
            <input name="maxRent" type="number" min="0" step="1" defaultValue={maxRent ?? ""} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50" placeholder="800" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Bedrooms
            <select name="bedrooms" defaultValue={bedrooms ?? ""} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50">
              <option value="">Any</option>
              <option value="0">Studio+</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Bathrooms
            <select name="bathrooms" defaultValue={bathrooms ?? ""} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50">
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <input name="voucherFriendly" type="checkbox" defaultChecked={voucherFriendly} className="h-4 w-4 rounded border-slate-300" /> Voucher-friendly
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <input name="pets" type="checkbox" defaultChecked={pets} className="h-4 w-4 rounded border-slate-300" /> Pet notes
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <input name="accessibility" type="checkbox" defaultChecked={accessibility} className="h-4 w-4 rounded border-slate-300" /> Accessibility notes
          </label>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700" type="submit">
            <Search size={18} /> Search
          </button>
        </div>
      </form>

      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-bold text-slate-700">{units.length} available {units.length === 1 ? "unit" : "units"} found</p>
      </div>

      {units.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black text-slate-950">No units match your search</h2>
          <p className="mt-2 text-slate-600">Try clearing filters, raising the max rent, or checking back after more units are added.</p>
          <Link href="/marketplace" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">View all available units</Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => <UnitCard key={unit.id} unit={unit} />)}
        </div>
      )}
    </main>
  );
}
