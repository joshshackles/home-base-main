import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpDown,
  Bath,
  BedDouble,
  CheckCircle2,
  Grid2X2,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { UnitCard } from "@/components/UnitCard";
import {
  RentalListingDTO,
  buildMarketplaceWhere,
  getListingQualityScore,
  getMarketplaceListings,
  getMarketplaceStats,
  isApplicantMarketplaceViewer,
} from "@/lib/marketplace/listings";
import { Pagination } from "@/components/admin/Pagination";
import {
  DEFAULT_PAGE_SIZE,
  SearchParams,
  getPagination,
  getParam,
} from "@/lib/pagination";

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
  rentalType?: string;
};

type RentalUnit = RentalListingDTO;

function matchScore(
  unit: RentalUnit,
  profile: {
    desiredBedrooms: number | null;
    desiredBathrooms: number | null;
    maxRent: number | null;
    voucherHolder: boolean;
    pets: string | null;
    accessibilityNeeds: string | null;
  } | null,
) {
  if (!profile) return null;
  let score = 50;
  if (profile.maxRent && unit.rentAmount <= profile.maxRent) score += 18;
  if (
    profile.desiredBedrooms !== null &&
    unit.bedrooms >= profile.desiredBedrooms
  )
    score += 12;
  if (
    profile.desiredBathrooms !== null &&
    unit.bathrooms >= profile.desiredBathrooms
  )
    score += 8;
  if (profile.voucherHolder && unit.voucherFriendly) score += 8;
  if (profile.pets && unit.petPolicy) score += 7;
  if (profile.accessibilityNeeds && unit.accessibility) score += 7;
  return Math.min(score, 100);
}

function priceLabel(minRent?: number, maxRent?: number) {
  if (minRent !== undefined && maxRent !== undefined)
    return `${formatCurrency(minRent)}-${formatCurrency(maxRent)}`;
  if (minRent !== undefined) return `${formatCurrency(minRent)}+`;
  if (maxRent !== undefined) return `Up to ${formatCurrency(maxRent)}`;
  return "Any rent";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: MarketplaceSearchParams;
}) {
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
  const rentalType = clean(getParam(searchParams, "rentalType"));
  const { page, take, skip } = getPagination(searchParams);

  const where = buildMarketplaceWhere({
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    voucherFriendly,
    pets,
    accessibility,
    utilities,
    rentalType,
  });

  const profilePromise =
    currentUser &&
    (currentUser.role === "APPLICANT" || currentUser.role === "TENANT")
      ? prisma.applicantProfile.findUnique({
          where: { userId: currentUser.userId },
          select: {
            desiredBedrooms: true,
            desiredBathrooms: true,
            maxRent: true,
            voucherHolder: true,
            pets: true,
            accessibilityNeeds: true,
          },
        })
      : Promise.resolve(null);

  const favoritesPromise =
    currentUser &&
    (currentUser.role === "APPLICANT" || currentUser.role === "TENANT")
      ? prisma.favoriteRental.findMany({
          where: { userId: currentUser.userId },
          select: { unitId: true },
        })
      : Promise.resolve([]);

  const [units, totalUnits, marketplaceStats, profile, favorites] =
    await Promise.all([
      getMarketplaceListings(where, take, skip, sort),
      prisma.unit.count({ where }),
      getMarketplaceStats(),
      profilePromise,
      favoritesPromise,
    ]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.unitId));
  const lowestRent = marketplaceStats.lowestRent;
  const medianRent = marketplaceStats.medianRent;
  const averageRent = marketplaceStats.averageRent;
  const petFriendlyCount = marketplaceStats.petFriendlyCount;
  const activeFilterCount = [
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    rentalType,
    voucherFriendly,
    pets,
    accessibility,
    utilities,
  ].filter(Boolean).length;
  const featured =
    [...units].sort(
      (a, b) => (matchScore(b, profile) ?? 0) - (matchScore(a, profile) ?? 0),
    )[0] ?? units[0];
  const cities = marketplaceStats.cities;

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[96rem] px-3 py-5 sm:px-5 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <Sparkles size={14} /> Live rental marketplace
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Photo-first rental search with every key detail visible faster.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Browse houses, duplexes, apartments, condos, rooms, and
                townhomes with compact cards, richer galleries, financial
                details, and low-friction inquiry workflows.
              </p>
            </div>

            <aside className="rounded-2xl bg-slate-950 p-3 text-white shadow-xl">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                <Stat label="Available" value={`${marketplaceStats.count}`} />
                <Stat label="Lowest" value={formatCurrency(lowestRent)} />
                <Stat label="Median" value={formatCurrency(medianRent)} />
                <Stat label="Avg." value={formatCurrency(averageRent)} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-black uppercase tracking-wide text-slate-200">
                <span className="rounded-xl bg-white/10 px-3 py-2">
                  {marketplaceStats.voucherFriendlyCount} voucher
                </span>
                <span className="rounded-xl bg-white/10 px-3 py-2">
                  {petFriendlyCount} pet notes
                </span>
              </div>
            </aside>
          </div>

          <form
            action="/marketplace"
            className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_auto]"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                name="q"
                defaultValue={q ?? ""}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                placeholder="Search city, address, school, pets..."
              />
            </div>
            <input
              name="city"
              defaultValue={city ?? ""}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              placeholder="City"
            />
            <input
              name="maxRent"
              type="number"
              defaultValue={maxRent ?? ""}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              placeholder="Max rent"
            />
            <select
              name="bedrooms"
              defaultValue={bedrooms ?? ""}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Beds</option>
              <option value="0">Studio+</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700"
              type="submit"
            >
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-700">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-white">
              <Grid2X2 size={14} /> {totalUnits} rentals
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              {priceLabel(minRent, maxRent)}
            </span>
            {city ? (
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                {city}
              </span>
            ) : null}
            {rentalType ? (
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                {labelRentalType(rentalType)}
              </span>
            ) : null}
            {activeFilterCount > 0 ? (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-red-700"
              >
                <X size={13} /> Clear {activeFilterCount}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              <ArrowUpDown size={13} />{" "}
              {sort === "newest"
                ? "Newest"
                : sort === "rent-desc"
                  ? "Rent high to low"
                  : sort === "beds"
                    ? "Most bedrooms"
                    : sort === "size"
                      ? "Largest"
                      : "Rent low to high"}
            </span>
            {isApplicantMarketplaceViewer(currentUser) ? (
              <Link
                href="/applicant/favorites"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200 hover:text-blue-700"
              >
                <Heart size={13} /> Favorites
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[96rem] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-16">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <SlidersHorizontal size={17} /> Filters
            </div>
            {activeFilterCount > 0 ? (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <X size={13} /> Clear
              </Link>
            ) : null}
          </div>

          <form className="space-y-3" action="/marketplace">
            <input type="hidden" name="q" value={q ?? ""} />
            <FilterInput
              label="City"
              name="city"
              value={city ?? ""}
              placeholder="Joplin"
            />
            <div className="grid grid-cols-2 gap-2">
              <FilterInput
                label="Min rent"
                name="minRent"
                value={minRent ?? ""}
                type="number"
              />
              <FilterInput
                label="Max rent"
                name="maxRent"
                value={maxRent ?? ""}
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Beds"
                name="bedrooms"
                value={bedrooms ?? ""}
                options={[
                  ["", "Any"],
                  ["0", "Studio+"],
                  ["1", "1+"],
                  ["2", "2+"],
                  ["3", "3+"],
                  ["4", "4+"],
                ]}
              />
              <FilterSelect
                label="Baths"
                name="bathrooms"
                value={bathrooms ?? ""}
                options={[
                  ["", "Any"],
                  ["1", "1+"],
                  ["1.5", "1.5+"],
                  ["2", "2+"],
                ]}
              />
            </div>
            <FilterInput
              label="Min square feet"
              name="minSqft"
              value={minSqft ?? ""}
              type="number"
            />
            <FilterSelect
              label="Type"
              name="rentalType"
              value={rentalType ?? ""}
              options={[
                ["", "Any type"],
                ["SINGLE_FAMILY", "Single-family"],
                ["DUPLEX", "Duplex"],
                ["APARTMENT", "Apartment"],
                ["CONDO", "Condo"],
                ["TOWNHOME", "Townhome"],
                ["ROOM", "Room"],
                ["COMMERCIAL", "Commercial"],
              ]}
            />
            <FilterSelect
              label="Sort"
              name="sort"
              value={sort ?? "rent-asc"}
              options={[
                ["rent-asc", "Rent low to high"],
                ["rent-desc", "Rent high to low"],
                ["newest", "Newest"],
                ["beds", "Most bedrooms"],
                ["size", "Largest"],
              ]}
            />

            <div className="grid gap-1.5 pt-1">
              <Check
                name="voucherFriendly"
                checked={voucherFriendly}
                icon={<ShieldCheck size={14} />}
                label="Voucher-friendly"
              />
              <Check
                name="pets"
                checked={pets}
                icon={<CheckCircle2 size={14} />}
                label="Pet notes"
              />
              <Check
                name="accessibility"
                checked={accessibility}
                icon={<CheckCircle2 size={14} />}
                label="Accessibility"
              />
              <Check
                name="utilities"
                checked={utilities}
                icon={<WalletCards size={14} />}
                label="Utilities"
              />
            </div>

            <button
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
              type="submit"
            >
              Apply Filters
            </button>
          </form>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Explore cities
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cities.map((row) => (
                <Link
                  key={`${row.city}-${row.state}`}
                  href={`/marketplace?city=${encodeURIComponent(row.city)}`}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {row.city}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section>
          {featured ? (
            <section className="mb-4 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[280px_1fr_auto]">
                <Link
                  href={`/marketplace/${featured.id}`}
                  className="relative min-h-40 overflow-hidden bg-slate-900 text-white"
                >
                  {featured.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/unit-photos/${featured.photos[0].id}`}
                      alt={`${featured.property.name} featured rental`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-slate-950/10" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                      <Sparkles size={12} /> Featured
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-xl font-black">
                      {featured.marketingHeadline ||
                        `${featured.property.name} #${featured.unitNumber}`}
                    </h3>
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    {matchScore(featured, profile) ?? 88}% rental fit •{" "}
                    {featured.property.city}, {featured.property.state}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
                    <Mini
                      icon={<BedDouble size={14} />}
                      value={`${featured.bedrooms} bed`}
                    />
                    <Mini
                      icon={<Bath size={14} />}
                      value={`${featured.bathrooms} bath`}
                    />
                    <Mini
                      icon={<WalletCards size={14} />}
                      value={formatCurrency(featured.rentAmount)}
                    />
                    {featured.squareFeet ? (
                      <Mini
                        icon={<Grid2X2 size={14} />}
                        value={`${featured.squareFeet.toLocaleString()} sf`}
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                    {featured.marketingHighlights ||
                      featured.description ||
                      "A currently available rental with the key details needed to start a conversation, save to favorites, or begin your application workflow."}
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t border-slate-100 p-4 lg:border-l lg:border-t-0">
                  <Link
                    href={`/marketplace/${featured.id}`}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/marketplace/${featured.id}#interest`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                  >
                    Ask
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {units.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-2xl font-black text-slate-950">
                No rentals match your search
              </h2>
              <p className="mt-2 text-slate-600">
                Try clearing filters, widening rent, or checking another city.
              </p>
              <Link
                href="/marketplace"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
              >
                View all available rentals
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  isFavorite={favoriteIds.has(unit.id)}
                  matchScore={matchScore(unit, profile)}
                  listingQualityScore={getListingQualityScore(unit)}
                  canFavorite={isApplicantMarketplaceViewer(currentUser)}
                  compact
                />
              ))}
            </div>
          )}
          <Pagination
            pathname="/marketplace"
            searchParams={searchParams}
            page={page}
            pageSize={DEFAULT_PAGE_SIZE}
            total={totalUnits}
          />
        </section>
      </div>
    </main>
  );
}

function labelRentalType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function FilterInput({
  label,
  name,
  value,
  placeholder = "",
  type = "text",
}: {
  label: string;
  name: string;
  value: string | number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | number;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  name,
  checked,
  icon,
  label,
}: {
  name: string;
  checked: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="h-4 w-4 rounded border-slate-300"
      />{" "}
      <span className="text-blue-700">{icon}</span>
      {label}
    </label>
  );
}

function Mini({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
      {icon}
      <span>{value}</span>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
      {label}
    </span>
  );
}
