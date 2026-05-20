import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpDown,
  Bath,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Grid2X2,
  Heart,
  List,
  MapPinned,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { saveMarketplaceSearch } from "@/app/marketplace/actions";
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
  availability?: string;
  availableBy?: string;
  savedSearch?: string;
  voucherFriendly?: string;
  pets?: string;
  accessibility?: string;
  utilities?: string;
  sort?: string;
  rentalType?: string;
  view?: string;
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


function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function numberParam(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateParam(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function priceLabel(minRent?: number, maxRent?: number) {
  if (minRent !== undefined && maxRent !== undefined)
    return `${formatCurrency(minRent)}-${formatCurrency(maxRent)}`;
  if (minRent !== undefined) return `${formatCurrency(minRent)}+`;
  if (maxRent !== undefined) return `Up to ${formatCurrency(maxRent)}`;
  return "Any rent";
}

function availabilityLabel(availability?: string, availableBy?: string) {
  if (availability === "now") return "Available now";
  if (availability === "onOrBefore" && availableBy) return `Available by ${availableBy}`;
  if (availability === "after" && availableBy) return `Available after ${availableBy}`;
  return "Any availability";
}

function buildMarketplaceQuery(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, value === true ? "on" : String(value));
  }
  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

function clearFilterHref(searchParams: MarketplaceSearchParams | undefined, key: string) {
  const params = new URLSearchParams();
  for (const [paramKey, value] of Object.entries(searchParams ?? {})) {
    if (paramKey === key || paramKey === "page" || paramKey === "savedSearch") continue;
    if (key === "availability" && paramKey === "availableBy") continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(paramKey, first);
  }
  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

function availabilityText(value: Date | null | undefined) {
  if (!value) return "Available now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const available = new Date(value);
  available.setHours(0, 0, 0, 0);
  if (available <= today) return "Available now";
  return `Available ${available.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function buildAreaGroups(units: RentalUnit[]) {
  const groups = new Map<string, { key: string; city: string; state: string; zip: string; neighborhood: string | null; count: number; minRent: number; sample: RentalUnit[] }>();
  for (const unit of units) {
    const key = `${unit.property.city}|${unit.property.state}|${unit.property.zip}|${unit.neighborhood ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.minRent = Math.min(existing.minRent, unit.rentAmount);
      existing.sample.push(unit);
    } else {
      groups.set(key, {
        key,
        city: unit.property.city,
        state: unit.property.state,
        zip: unit.property.zip,
        neighborhood: unit.neighborhood,
        count: 1,
        minRent: unit.rentAmount,
        sample: [unit],
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.minRent - b.minRent);
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
  const availability = clean(getParam(searchParams, "availability")) ?? "any";
  const availableByRaw = clean(getParam(searchParams, "availableBy"));
  const availableBy = dateParam(availableByRaw);
  const voucherFriendly = getParam(searchParams, "voucherFriendly") === "on";
  const pets = getParam(searchParams, "pets") === "on";
  const accessibility = getParam(searchParams, "accessibility") === "on";
  const utilities = getParam(searchParams, "utilities") === "on";
  const sort = clean(getParam(searchParams, "sort"));
  const rentalType = clean(getParam(searchParams, "rentalType"));
  const viewMode = clean(getParam(searchParams, "view")) === "list" ? "list" : "map";
  const { page, take, skip } = getPagination(searchParams);

  const where = buildMarketplaceWhere({
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    availability,
    availableBy,
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

  const savedSearchesPromise = currentUser
    ? prisma.savedMarketplaceSearch.findMany({
        where: { userId: currentUser.userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, label: true },
      })
    : Promise.resolve([] as Array<{ id: string; label: string }>);

  const fallbackWhere = buildMarketplaceWhere({ q, city });
  const [units, totalUnits, marketplaceStats, profile, favorites, savedSearches] =
    await Promise.all([
      getMarketplaceListings(where, take, skip, sort),
      prisma.unit.count({ where }),
      getMarketplaceStats(),
      profilePromise,
      favoritesPromise,
      savedSearchesPromise,
    ]);

  const fallbackUnits =
    totalUnits === 0
      ? await getMarketplaceListings(fallbackWhere, 4, 0, "newest")
      : [];

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
    availability !== "any" ? availability : undefined,
    availableByRaw,
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
  const currentSearchHref = buildMarketplaceQuery({
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    availability: availability !== "any" ? availability : undefined,
    availableBy: availableByRaw,
    rentalType,
    voucherFriendly,
    pets,
    accessibility,
    utilities,
    sort,
    view: viewMode === "list" ? "list" : undefined,
  });
  const filterChips = [
    q ? { key: "q", label: `Search: ${q}` } : null,
    city ? { key: "city", label: `City: ${city}` } : null,
    minRent !== undefined ? { key: "minRent", label: `Min ${formatCurrency(minRent)}` } : null,
    maxRent !== undefined ? { key: "maxRent", label: `Max ${formatCurrency(maxRent)}` } : null,
    bedrooms !== undefined ? { key: "bedrooms", label: `${bedrooms}+ beds` } : null,
    bathrooms !== undefined ? { key: "bathrooms", label: `${bathrooms}+ baths` } : null,
    availability !== "any" ? { key: "availability", label: availabilityLabel(availability, availableByRaw) } : null,
    voucherFriendly ? { key: "voucherFriendly", label: "Voucher-friendly" } : null,
    pets ? { key: "pets", label: "Pet notes" } : null,
    accessibility ? { key: "accessibility", label: "Accessibility" } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));
  const locationUnits = units.length > 0 ? units : fallbackUnits;
  const areaGroups = buildAreaGroups(locationUnits);
  const listViewHref = buildMarketplaceQuery({
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    availability: availability !== "any" ? availability : undefined,
    availableBy: availableByRaw,
    rentalType,
    voucherFriendly,
    pets,
    accessibility,
    utilities,
    sort,
    view: "list",
  });
  const mapViewHref = buildMarketplaceQuery({
    q,
    city,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    minSqft,
    availability: availability !== "any" ? availability : undefined,
    availableBy: availableByRaw,
    rentalType,
    voucherFriendly,
    pets,
    accessibility,
    utilities,
    sort,
  });

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
            className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm md:grid-cols-[1.4fr_0.65fr_0.45fr_0.45fr_0.7fr_auto]"
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
            <select
              name="availability"
              defaultValue={availability}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="any">Any availability</option>
              <option value="now">Available now</option>
              <option value="onOrBefore">Available by date</option>
              <option value="after">Available after date</option>
            </select>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700"
              type="submit"
            >
              <Search size={16} /> Search
            </button>
          </form>

          {searchParams?.savedSearch === "1" ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
              Search saved. You can return to this search from your applicant tools.
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {currentUser ? (
              <form action={saveMarketplaceSearch} className="inline-flex">
                <input type="hidden" name="returnTo" value={currentSearchHref} />
                <input type="hidden" name="q" value={q ?? ""} />
                <input type="hidden" name="city" value={city ?? ""} />
                <input type="hidden" name="minRent" value={minRent ?? ""} />
                <input type="hidden" name="maxRent" value={maxRent ?? ""} />
                <input type="hidden" name="bedrooms" value={bedrooms ?? ""} />
                <input type="hidden" name="bathrooms" value={bathrooms ?? ""} />
                <input type="hidden" name="minSqft" value={minSqft ?? ""} />
                <input type="hidden" name="availability" value={availability} />
                <input type="hidden" name="availableBy" value={availableByRaw ?? ""} />
                <input type="hidden" name="rentalType" value={rentalType ?? ""} />
                <input type="hidden" name="voucherFriendly" value={voucherFriendly ? "on" : ""} />
                <input type="hidden" name="pets" value={pets ? "on" : ""} />
                <input type="hidden" name="accessibility" value={accessibility ? "on" : ""} />
                <input type="hidden" name="utilities" value={utilities ? "on" : ""} />
                <input type="hidden" name="sort" value={sort ?? ""} />
                <input type="hidden" name="view" value={viewMode === "list" ? "list" : ""} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 hover:text-blue-700">
                  <Heart size={15} /> Save Search
                </button>
              </form>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(currentSearchHref)}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 hover:text-blue-700">
                <Heart size={15} /> Sign In to Save Search
              </Link>
            )}
            {savedSearches.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Saved Searches:</span>
                {savedSearches.map((search) => (
                  <span key={search.id} className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200">{search.label}</span>
                ))}
              </div>
            ) : null}
          </div>
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
            {availability !== "any" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                <CalendarDays size={13} /> {availabilityLabel(availability, availableByRaw)}
              </span>
            ) : null}
            {filterChips.slice(0, 6).map((chip) => (
              <Link key={chip.key} href={clearFilterHref(searchParams, chip.key)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-blue-800">
                {chip.label} <X size={13} />
              </Link>
            ))}
            {activeFilterCount > 0 ? (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-red-700"
              >
                <X size={13} /> Clear all filters
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-600">
            <Link
              href={mapViewHref}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-slate-200 ${viewMode === "map" ? "bg-slate-950 text-white ring-slate-950" : "bg-white hover:text-blue-700"}`}
            >
              <MapPinned size={13} /> Map preview
            </Link>
            <Link
              href={listViewHref}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-slate-200 ${viewMode === "list" ? "bg-slate-950 text-white ring-slate-950" : "bg-white hover:text-blue-700"}`}
            >
              <List size={13} /> List
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              <ArrowUpDown size={13} />{" "}
              {sort === "newest"
                ? "Newest"
                : sort === "recommended" || !sort
                  ? "Recommended"
                : sort === "rent-desc"
                  ? "Rent high to low"
                  : sort === "available-soonest"
                    ? "Available soonest"
                    : sort === "updated"
                      ? "Recently updated"
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

      <section className="mx-auto px-3 py-3 sm:px-5 lg:hidden">
        {viewMode === "map" ? (
          <details className="mb-3 rounded-2xl border border-blue-100 bg-white shadow-sm" open>
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-950">
              <span className="inline-flex items-center gap-2"><MapPinned size={17} /> Location preview</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{areaGroups.length} areas</span>
            </summary>
            <div className="border-t border-slate-100 p-3">
              <LocationPreviewPanel areaGroups={areaGroups} units={locationUnits} currentSearchHref={currentSearchHref} compact />
            </div>
          </details>
        ) : null}
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-950">
            <span className="inline-flex items-center gap-2"><SlidersHorizontal size={17} /> Filters and sort</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{activeFilterCount} active</span>
          </summary>
          <div className="border-t border-slate-100 p-3">
            <MarketplaceFilterForm q={q} city={city} minRent={minRent} maxRent={maxRent} bedrooms={bedrooms} bathrooms={bathrooms} minSqft={minSqft} availability={availability} availableBy={availableByRaw} rentalType={rentalType} sort={sort} voucherFriendly={voucherFriendly} pets={pets} accessibility={accessibility} utilities={utilities} submitLabel="Apply filters" />
          </div>
        </details>
      </section>

      <div className={`mx-auto grid max-w-[96rem] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[260px_1fr] lg:px-6 ${viewMode === "map" ? "xl:grid-cols-[260px_minmax(0,1fr)_420px]" : ""}`}>
        <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-16 lg:block">
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

          <MarketplaceFilterForm q={q} city={city} minRent={minRent} maxRent={maxRent} bedrooms={bedrooms} bathrooms={bathrooms} minSqft={minSqft} availability={availability} availableBy={availableByRaw} rentalType={rentalType} sort={sort} voucherFriendly={voucherFriendly} pets={pets} accessibility={accessibility} utilities={utilities} submitLabel="Apply filters" />

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
            <div className="space-y-4">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8">
                <div className="mx-auto max-w-3xl text-center">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">No exact matches</p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    No exact matches found.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Your search is using {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}. Try clearing filters, expanding rent, checking nearby cities, or saving this search so you can return when new listings are added.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link href="/marketplace" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">View All Rentals</Link>
                    {maxRent !== undefined ? <Link href={clearFilterHref(searchParams, "maxRent")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">Remove max rent</Link> : null}
                    {availability !== "any" ? <Link href={clearFilterHref(searchParams, "availability")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">Remove availability</Link> : null}
                    {currentUser ? (
                      <form action={saveMarketplaceSearch}>
                        <input type="hidden" name="returnTo" value={currentSearchHref} />
                        <input type="hidden" name="q" value={q ?? ""} />
                        <input type="hidden" name="city" value={city ?? ""} />
                        <input type="hidden" name="maxRent" value={maxRent ?? ""} />
                        <input type="hidden" name="availability" value={availability} />
                        <input type="hidden" name="availableBy" value={availableByRaw ?? ""} />
                        <button className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">Save Search</button>
                      </form>
                    ) : (
                      <Link href={`/login?next=${encodeURIComponent(currentSearchHref)}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">Sign In to Save Search</Link>
                    )}
                  </div>
                </div>
              </div>
              {fallbackUnits.length > 0 ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Broader real matches</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">Broader matches worth reviewing</h3>
                      <p className="mt-1 text-sm text-slate-600">These are real active listings that match fewer filters, usually your keyword or city.</p>
                    </div>
                    <Link href={buildMarketplaceQuery({ q, city })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Open Broader Search</Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {fallbackUnits.map((unit) => (
                      <UnitCard key={unit.id} unit={unit} isFavorite={favoriteIds.has(unit.id)} matchScore={matchScore(unit, profile)} listingQualityScore={getListingQualityScore(unit)} canFavorite={isApplicantMarketplaceViewer(currentUser)} compact />
                    ))}
                  </div>
                </section>
              ) : null}
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

        {viewMode === "map" ? (
          <aside className="hidden h-fit xl:sticky xl:top-16 xl:block">
            <LocationPreviewPanel areaGroups={areaGroups} units={locationUnits} currentSearchHref={currentSearchHref} />
          </aside>
        ) : null}
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

function MarketplaceFilterForm({
  q,
  city,
  minRent,
  maxRent,
  bedrooms,
  bathrooms,
  minSqft,
  availability,
  availableBy,
  rentalType,
  sort,
  voucherFriendly,
  pets,
  accessibility,
  utilities,
  submitLabel,
}: {
  q?: string;
  city?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSqft?: number;
  availability?: string;
  availableBy?: string;
  rentalType?: string;
  sort?: string;
  voucherFriendly: boolean;
  pets: boolean;
  accessibility: boolean;
  utilities: boolean;
  submitLabel: string;
}) {
  return (
    <form className="space-y-3" action="/marketplace">
      <input type="hidden" name="q" value={q ?? ""} />
      <FilterInput label="City" name="city" value={city ?? ""} placeholder="Joplin" />
      <div className="grid grid-cols-2 gap-2">
        <FilterInput label="Min rent" name="minRent" value={minRent ?? ""} type="number" />
        <FilterInput label="Max rent" name="maxRent" value={maxRent ?? ""} type="number" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FilterSelect label="Beds" name="bedrooms" value={bedrooms ?? ""} options={[["", "Any"], ["0", "Studio+"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]} />
        <FilterSelect label="Baths" name="bathrooms" value={bathrooms ?? ""} options={[["", "Any"], ["1", "1+"], ["1.5", "1.5+"], ["2", "2+"]]} />
      </div>
      <FilterInput label="Min square feet" name="minSqft" value={minSqft ?? ""} type="number" />
      <div className="grid grid-cols-2 gap-2">
        <FilterSelect label="Availability" name="availability" value={availability ?? "any"} options={[["any", "Any"], ["now", "Available now"], ["onOrBefore", "By date"], ["after", "After date"]]} />
        <FilterInput label="Date" name="availableBy" value={availableBy ?? ""} type="date" />
      </div>
      <FilterSelect label="Type" name="rentalType" value={rentalType ?? ""} options={[["", "Any type"], ["SINGLE_FAMILY", "Single-family"], ["DUPLEX", "Duplex"], ["APARTMENT", "Apartment"], ["CONDO", "Condo"], ["TOWNHOME", "Townhome"], ["ROOM", "Room"], ["COMMERCIAL", "Commercial"]]} />
      <FilterSelect label="Sort" name="sort" value={sort ?? "recommended"} options={[["recommended", "Recommended"], ["available-soonest", "Available soonest"], ["rent-asc", "Rent low to high"], ["rent-desc", "Rent high to low"], ["newest", "Newest"], ["updated", "Recently updated"], ["beds", "Most bedrooms"], ["size", "Largest"]]} />

      <div className="grid gap-1.5 pt-1">
        <Check name="voucherFriendly" checked={voucherFriendly} icon={<ShieldCheck size={14} />} label="Voucher-friendly" />
        <Check name="pets" checked={pets} icon={<CheckCircle2 size={14} />} label="Pet notes" />
        <Check name="accessibility" checked={accessibility} icon={<CheckCircle2 size={14} />} label="Accessibility" />
        <Check name="utilities" checked={utilities} icon={<WalletCards size={14} />} label="Utilities" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/marketplace" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-black text-slate-700 hover:bg-slate-50">
          Clear Filters
        </Link>
        <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function LocationPreviewPanel({
  areaGroups,
  units,
  currentSearchHref,
  compact = false,
}: {
  areaGroups: ReturnType<typeof buildAreaGroups>;
  units: RentalUnit[];
  currentSearchHref: string;
  compact?: boolean;
}) {
  const sampleUnits = units.slice(0, compact ? 2 : 3);
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-[260px] bg-slate-950 p-4 text-white">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Map preview mode</p>
              <h2 className="mt-2 text-2xl font-black">Explore listings by area</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Exact interactive markers require latitude and longitude support. For now, HomeBase groups real listings by city, ZIP, and neighborhood without inventing coordinates.</p>
            </div>
            <MapPinned className="shrink-0 text-blue-200" size={28} />
          </div>

          <div className="mt-5 grid gap-2">
            {areaGroups.slice(0, compact ? 4 : 6).map((area, index) => (
              <Link key={area.key} href={`/marketplace?city=${encodeURIComponent(area.city)}`} className="group flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur transition hover:bg-white/15">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-black text-white ring-4 ring-blue-300/20">{area.count}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{area.neighborhood || area.city}</span>
                  <span className="block truncate text-xs font-semibold text-slate-300">{area.city}, {area.state} {area.zip} / from {formatCurrency(area.minRent)}</span>
                </span>
                <span className="ml-auto text-xs font-black text-blue-100">View</span>
              </Link>
            ))}
            {areaGroups.length === 0 ? (
              <div className="rounded-2xl bg-white/10 p-4 text-sm font-semibold text-slate-200">No location groups are available for the current result set.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Visible result geography</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{units.length} listing{units.length === 1 ? "" : "s"} across {areaGroups.length} area{areaGroups.length === 1 ? "" : "s"}.</p>
          </div>
          <Link href={currentSearchHref} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50">Refresh</Link>
        </div>

        <div className="mt-4 space-y-3">
          {sampleUnits.map((unit) => (
            <Link key={unit.id} href={`/marketplace/${unit.id}`} className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-slate-100 p-2 transition hover:border-blue-200 hover:bg-blue-50">
              <div className="relative overflow-hidden rounded-xl bg-slate-900 text-white">
                {unit.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/unit-photos/${unit.photos[0].id}`} alt={`${unit.property.name} location preview`} className="h-full min-h-[72px] w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-[72px] items-center justify-center"><MapPin size={22} /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{unit.marketingHeadline || `${unit.property.name} #${unit.unitNumber}`}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{unit.property.city}, {unit.property.state} / {availabilityText(unit.availableOn)}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatCurrency(unit.rentAmount)} / {unit.bedrooms} bd / {unit.bathrooms} ba</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
          Future full map support should add geocoded latitude/longitude fields, address visibility controls, and a client-only map provider. This preview deliberately avoids fake coordinates.
        </div>
      </div>
    </section>
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
