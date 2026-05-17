import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma, UnitStatus } from "@prisma/client";
import { ArrowUpDown, Bath, BedDouble, CheckCircle2, Heart, MapPin, Search, ShieldCheck, SlidersHorizontal, Sparkles, WalletCards, X } from "lucide-react";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { UnitCard } from "@/components/UnitCard";
import { Pagination } from "@/components/admin/Pagination";
import { DEFAULT_PAGE_SIZE, SearchParams, getPagination, getParam } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type MarketplaceSearchParams = SearchParams & {
  q?: string;
  city?: string;
  minRent?: string;
  maxRent?: string;
  bedrooms?: string;
  bathrooms?: string;
  minSqft?: string;
  voucherFriendly?: string;
  pets?: string;
  accessibility?: string;
  utilities?: string;
  sort?: string;
};

type RentalUnit = Awaited<ReturnType<typeof getUnits>>[number];

function clean(value?: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function numberParam(value?: string) {
  const cleaned = clean(value);
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getSort(sort?: string): Prisma.UnitOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "rent-desc":
      return [{ rentAmount: "desc" }, { createdAt: "desc" }];
    case "beds":
      return [{ bedrooms: "desc" }, { rentAmount: "asc" }];
    case "size":
      return [{ squareFeet: "desc" }, { rentAmount: "asc" }];
    default:
      return [{ rentAmount: "asc" }, { createdAt: "desc" }];
  }
}

async function getUnits(where: Prisma.UnitWhereInput, take: number, skip: number, sort?: string) {
  return prisma.unit.findMany({
    where,
    include: { property: true },
    orderBy: getSort(sort),
    take,
    skip
  });
}

function matchScore(unit: RentalUnit, profile: { desiredBedrooms: number | null; desiredBathrooms: number | null; maxRent: number | null; voucherHolder: boolean; pets: string | null; accessibilityNeeds: string | null } | null) {
  if (!profile) return null;
  let score = 50;
  if (profile.maxRent && unit.rentAmount <= profile.maxRent) score += 18;
  if (profile.desiredBedrooms !== null && unit.bedrooms >= profile.desiredBedrooms) score += 12;
  if (profile.desiredBathrooms !== null && unit.bathrooms >= profile.desiredBathrooms) score += 8;
  if (profile.voucherHolder && unit.voucherFriendly) score += 8;
  if (profile.pets && unit.petPolicy) score += 7;
  if (profile.accessibilityNeeds && unit.accessibility) score += 7;
  return Math.min(score, 100);
}

function priceLabel(minRent?: number, maxRent?: number) {
  if (minRent !== undefined && maxRent !== undefined) return `${formatCurrency(minRent)}-${formatCurrency(maxRent)}`;
  if (minRent !== undefined) return `${formatCurrency(minRent)}+`;
  if (maxRent !== undefined) return `Up to ${formatCurrency(maxRent)}`;
  return "Any rent";
}

export default async function MarketplacePage({ searchParams }: { searchParams?: MarketplaceSearchParams }) {
  const currentUser = await getVerifiedCurrentUser();
  const q = clean(getParam(searchParams, "q"));
  const city = clean(getParam(searchParams, "city"));
  const minRent = numberParam(getParam(searchParams, "minRent"));
  const maxRent = numberParam(getParam(searchParams, "maxRent"));
  const bedrooms = numberParam(getParam(searchParams, "bedrooms"));
  const bathrooms = numberParam(getParam(searchParams, "bathrooms"));
  const minSqft = numberParam(getParam(searchParams, "minSqft"));
  const voucherFriendly = getParam(searchParams, "voucherFriendly") === "on";
  const pets = getParam(searchParams, "pets") === "on";
  const accessibility = getParam(searchParams, "accessibility") === "on";
  const utilities = getParam(searchParams, "utilities") === "on";
  const sort = clean(getParam(searchParams, "sort"));
  const { page, take, skip } = getPagination(searchParams);

  const where: Prisma.UnitWhereInput = {
    status: UnitStatus.AVAILABLE,
    property: {
      isArchived: false,
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {})
    },
    ...(q ? {
      OR: [
        { unitNumber: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { utilitiesNote: { contains: q, mode: "insensitive" } },
        { petPolicy: { contains: q, mode: "insensitive" } },
        { accessibility: { contains: q, mode: "insensitive" } },
        { property: { name: { contains: q, mode: "insensitive" } } },
        { property: { addressLine: { contains: q, mode: "insensitive" } } },
        { property: { city: { contains: q, mode: "insensitive" } } }
      ]
    } : {}),
    ...(minRent !== undefined || maxRent !== undefined ? { rentAmount: { ...(minRent !== undefined ? { gte: minRent } : {}), ...(maxRent !== undefined ? { lte: maxRent } : {}) } } : {}),
    ...(bedrooms !== undefined ? { bedrooms: { gte: bedrooms } } : {}),
    ...(bathrooms !== undefined ? { bathrooms: { gte: bathrooms } } : {}),
    ...(minSqft !== undefined ? { squareFeet: { gte: minSqft } } : {}),
    ...(voucherFriendly ? { voucherFriendly: true } : {}),
    ...(pets ? { petPolicy: { not: null } } : {}),
    ...(accessibility ? { accessibility: { not: null } } : {}),
    ...(utilities ? { utilitiesNote: { not: null } } : {})
  };

  const profilePromise = currentUser && (currentUser.role === "APPLICANT" || currentUser.role === "TENANT")
    ? prisma.applicantProfile.findUnique({
      where: { userId: currentUser.userId },
      select: { desiredBedrooms: true, desiredBathrooms: true, maxRent: true, voucherHolder: true, pets: true, accessibilityNeeds: true }
    })
    : Promise.resolve(null);

  const favoritesPromise = currentUser && (currentUser.role === "APPLICANT" || currentUser.role === "TENANT")
    ? prisma.favoriteRental.findMany({ where: { userId: currentUser.userId }, select: { unitId: true } })
    : Promise.resolve([]);

  const [units, totalUnits, allStats, cityRows, profile, favorites] = await Promise.all([
    getUnits(where, take, skip, sort),
    prisma.unit.count({ where }),
    prisma.unit.findMany({
      where: { status: UnitStatus.AVAILABLE, property: { isArchived: false } },
      select: { rentAmount: true, voucherFriendly: true, petPolicy: true, accessibility: true, utilitiesNote: true }
    }),
    prisma.unit.findMany({
      where: { status: UnitStatus.AVAILABLE, property: { isArchived: false } },
      select: { property: { select: { city: true, state: true } } },
      orderBy: { property: { city: "asc" } }
    }),
    profilePromise,
    favoritesPromise
  ]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.unitId));
  const rents = allStats.map((unit) => unit.rentAmount);
  const lowestRent = rents.length ? Math.min(...rents) : 0;
  const medianRent = rents.length ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;
  const activeFilterCount = [q, city, minRent, maxRent, bedrooms, bathrooms, minSqft, voucherFriendly, pets, accessibility, utilities].filter(Boolean).length;
  const featured = [...units].sort((a, b) => (matchScore(b, profile) ?? 0) - (matchScore(a, profile) ?? 0))[0] ?? units[0];
  const cities = Array.from(new Map(cityRows.map((row) => [`${row.property.city}, ${row.property.state}`, row.property])).values()).slice(0, 8);

  return (
    <main id="main-content" className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950">Find a rental that fits your real life.</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Search available homes by affordability, voucher support, pets, accessibility, utilities, and move-in priorities. Save favorites and message landlords when a unit feels right.
            </p>
            <form action="/marketplace" className="mt-7 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm md:grid-cols-[1.3fr_0.8fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input name="q" defaultValue={q ?? ""} className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Search city, property, address, pets..." />
              </div>
              <input name="city" defaultValue={city ?? ""} className="h-14 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="City" />
              <button className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 font-black text-white hover:bg-brand-700" type="submit">
                <Search size={18} /> Search
              </button>
            </form>
          </div>

          <aside className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-200">Live inventory</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Available" value={`${allStats.length}`} />
              <Stat label="Lowest rent" value={formatCurrency(lowestRent)} />
              <Stat label="Median rent" value={formatCurrency(medianRent)} />
              <Stat label="Voucher" value={`${allStats.filter((unit) => unit.voucherFriendly).length}`} />
            </div>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-200">
              {profile ? "Signed-in applicants see match scores based on profile goals." : "Sign in as an applicant to save rentals and see renter-profile match hints."}
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-black text-slate-950">
                <SlidersHorizontal size={20} /> Refine
              </div>
              {activeFilterCount > 0 ? (
                <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <X size={15} /> Clear
                </Link>
              ) : null}
            </div>

            <form className="space-y-4" action="/marketplace">
              <input type="hidden" name="q" value={q ?? ""} />
              <FilterInput label="City" name="city" value={city ?? ""} placeholder="Joplin" />
              <div className="grid grid-cols-2 gap-3">
                <FilterInput label="Min rent" name="minRent" value={minRent ?? ""} type="number" />
                <FilterInput label="Max rent" name="maxRent" value={maxRent ?? ""} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FilterSelect label="Bedrooms" name="bedrooms" value={bedrooms ?? ""} options={[["", "Any"], ["0", "Studio+"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]} />
                <FilterSelect label="Bathrooms" name="bathrooms" value={bathrooms ?? ""} options={[["", "Any"], ["1", "1+"], ["1.5", "1.5+"], ["2", "2+"]]} />
              </div>
              <FilterInput label="Minimum square feet" name="minSqft" value={minSqft ?? ""} type="number" />
              <FilterSelect label="Sort" name="sort" value={sort ?? "rent-asc"} options={[["rent-asc", "Rent low to high"], ["rent-desc", "Rent high to low"], ["newest", "Newest"], ["beds", "Most bedrooms"], ["size", "Largest"]]} />

              <div className="space-y-2 pt-2">
                <Check name="voucherFriendly" checked={voucherFriendly} icon={<ShieldCheck size={16} />} label="Voucher-friendly" />
                <Check name="pets" checked={pets} icon={<CheckCircle2 size={16} />} label="Pet notes" />
                <Check name="accessibility" checked={accessibility} icon={<CheckCircle2 size={16} />} label="Accessibility notes" />
                <Check name="utilities" checked={utilities} icon={<WalletCards size={16} />} label="Utility details" />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800" type="submit">Apply Filters</button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm font-black text-slate-950">Explore cities</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cities.map((row) => (
                  <Link key={`${row.city}-${row.state}`} href={`/marketplace?city=${encodeURIComponent(row.city)}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                    {row.city}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{totalUnits} available {totalUnits === 1 ? "rental" : "rentals"}</p>
                <h2 className="mt-1 text-3xl font-black text-slate-950">{priceLabel(minRent, maxRent)}{city ? ` in ${city}` : ""}</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><ArrowUpDown size={15} /> {sort === "newest" ? "Newest" : sort === "rent-desc" ? "Rent high to low" : sort === "beds" ? "Most bedrooms" : sort === "size" ? "Largest" : "Rent low to high"}</span>
                {currentUser ? <Link href="/applicant/favorites" className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm hover:text-brand-700"><Heart size={15} /> Favorites</Link> : null}
              </div>
            </div>

            {featured ? (
              <section className="mb-6 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="bg-[radial-gradient(circle_at_top_left,#0ea5e9,#0f172a_48%,#14532d)] p-8 text-white">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/15">
                      <Sparkles size={15} /> Featured match
                    </div>
                    <h3 className="mt-8 text-4xl font-black">{featured.property.name} #{featured.unitNumber}</h3>
                    <p className="mt-3 flex items-center gap-2 text-slate-200"><MapPin size={17} /> {featured.property.addressLine}, {featured.property.city}, {featured.property.state}</p>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <Mini icon={<BedDouble size={17} />} value={`${featured.bedrooms} bed`} />
                      <Mini icon={<Bath size={17} />} value={`${featured.bathrooms} bath`} />
                      <Mini icon={<WalletCards size={17} />} value={formatCurrency(featured.rentAmount)} />
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-bold uppercase tracking-wide text-brand-700">{matchScore(featured, profile) ?? 88}% rental fit</p>
                    <p className="mt-3 text-lg leading-8 text-slate-700">{featured.description ?? "A currently available rental with enough detail to start a conversation, save to favorites, or begin your application workflow."}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {featured.voucherFriendly ? <Feature label="Voucher-friendly" /> : null}
                      {featured.petPolicy ? <Feature label="Pet notes" /> : null}
                      {featured.accessibility ? <Feature label="Accessibility notes" /> : null}
                      {featured.utilitiesNote ? <Feature label="Utility details" /> : null}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href={`/marketplace/${featured.id}`} className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Featured Rental</Link>
                      <Link href={`/marketplace/${featured.id}#interest`} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Message / Inquire</Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {units.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h2 className="text-2xl font-black text-slate-950">No rentals match your search</h2>
                <p className="mt-2 text-slate-600">Try clearing filters, widening rent, or checking another city.</p>
                <Link href="/marketplace" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">View all available rentals</Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} isFavorite={favoriteIds.has(unit.id)} matchScore={matchScore(unit, profile)} />
                ))}
              </div>
            )}
            <Pagination pathname="/marketplace" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalUnits} />
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold uppercase text-slate-300">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function FilterInput({ label, name, value, placeholder = "", type = "text" }: { label: string; name: string; value: string | number; placeholder?: string; type?: string }) {
  return <label className="block text-sm font-bold text-slate-700"><span>{label}</span><input name={name} type={type} defaultValue={value} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" /></label>;
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value: string | number; options: Array<[string, string]> }) {
  return <label className="block text-sm font-bold text-slate-700"><span>{label}</span><select name={name} defaultValue={value} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>;
}

function Check({ name, checked, icon, label }: { name: string; checked: boolean; icon: ReactNode; label: string }) {
  return <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"><input name={name} type="checkbox" defaultChecked={checked} className="h-4 w-4 rounded border-slate-300" /> <span className="text-brand-700">{icon}</span>{label}</label>;
}

function Mini({ icon, value }: { icon: ReactNode; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3 text-sm font-bold ring-1 ring-white/10">{icon}<p className="mt-2">{value}</p></div>;
}

function Feature({ label }: { label: string }) {
  return <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{label}</span>;
}
