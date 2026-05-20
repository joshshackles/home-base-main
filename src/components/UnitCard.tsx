import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bath,
  BedDouble,
  Camera,
  CheckCircle2,
  Heart,
  Home,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  removeFavoriteRental,
  saveFavoriteRental,
} from "@/app/applicant/actions";
import { formatCurrency } from "@/lib/format";

type UnitCardProps = {
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    rentAmount: number;
    deposit: number | null;
    squareFeet: number | null;
    voucherFriendly: boolean;
    utilitiesNote: string | null;
    petPolicy: string | null;
    accessibility: string | null;
    schoolDistrict?: string | null;
    neighborhood?: string | null;
    averageUtilityBill?: number | null;
    availableOn?: Date | null;
    parkingInfo?: string | null;
    laundryInfo?: string | null;
    status: string;
    rentalType?: string;
    marketingHeadline?: string | null;
    marketingHighlights?: string | null;
    virtualTourUrl?: string | null;
    videoTourUrl?: string | null;
    walkScore?: number | null;
    transitScore?: number | null;
    description: string | null;
    photos?: Array<{ id: string; isFeatured: boolean }>;
    _count?: { photos?: number; leads?: number; applications?: number };
    property: {
      name: string;
      addressLine: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  isFavorite?: boolean;
  matchScore?: number | null;
  compact?: boolean;
  canFavorite?: boolean;
  listingQualityScore?: number;
};

function rentalTypeLabel(value?: string) {
  return value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Rental";
}

function featureText(unit: UnitCardProps["unit"]) {
  const features = [];
  if (unit.voucherFriendly) features.push("Voucher-friendly");
  if (unit.petPolicy) features.push("Pets");
  if (unit.parkingInfo) features.push(unit.parkingInfo);
  if (unit.laundryInfo) features.push(unit.laundryInfo);
  if (unit.utilitiesNote) features.push("Utilities");
  if (unit.neighborhood) features.push(unit.neighborhood);
  if (unit.schoolDistrict) features.push(unit.schoolDistrict);
  if (unit.accessibility) features.push("Accessible");
  return features.slice(0, 5);
}

function availabilityLabel(value: Date | null | undefined) {
  if (!value) return "Available now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const available = new Date(value);
  available.setHours(0, 0, 0, 0);
  if (available <= today) return "Available now";
  return `Available ${available.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function UnitCard({
  unit,
  isFavorite = false,
  matchScore = null,
  compact = false,
  canFavorite = false,
  listingQualityScore,
}: UnitCardProps) {
  const features = featureText(unit);
  const galleryPhotos = unit.photos?.slice(0, compact ? 3 : 4) ?? [];
  const totalPhotoCount = unit._count?.photos ?? galleryPhotos.length;
  const primaryPhoto = galleryPhotos[0];
  const headline =
    unit.marketingHeadline ||
    `${unit.property.name}${unit.unitNumber ? ` #${unit.unitNumber}` : ""}`;
  const summary =
    unit.marketingHighlights ||
    unit.description ||
    "Available rental with application, inquiry, and saved-favorite workflow.";

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <Link
        href={`/marketplace/${unit.id}`}
        className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top_left,#38bdf8_0,#0f172a_42%,#172554_100%)] text-white">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/unit-photos/${primaryPhoto.id}`}
              alt={`${headline} primary photo`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/75">
              <Home size={42} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-slate-950/20" />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-sm">
              {rentalTypeLabel(unit.rentalType)}
            </span>
            {matchScore !== null ? (
              <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                {matchScore}% fit
              </span>
            ) : null}
          </div>

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {galleryPhotos.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                <Camera size={12} /> {totalPhotoCount}
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
              {unit.property.city}, {unit.property.state}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-black leading-5 tracking-tight text-white">
              {headline}
            </h3>
          </div>
        </div>
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black leading-none text-slate-950">
              {formatCurrency(unit.rentAmount)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              /mo
              {unit.deposit ? ` • ${formatCurrency(unit.deposit)} deposit` : ""}
            </p>
          </div>
          {canFavorite ? (
            <form
              action={isFavorite ? removeFavoriteRental : saveFavoriteRental}
            >
              <input type="hidden" name="unitId" value={unit.id} />
              <button
                type="submit"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Save rental"
                }
                className={`rounded-full p-2 shadow-sm ring-1 transition ${isFavorite ? "bg-rose-500 text-white ring-rose-500" : "bg-white text-slate-600 ring-slate-200 hover:text-rose-600"}`}
              >
                <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </form>
          ) : (
            <Link
              href="/login?next=/marketplace"
              className="rounded-full bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-rose-600"
              aria-label="Sign in to save rental"
            >
              <Heart size={16} />
            </Link>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs text-slate-700">
          <Spec icon={<BedDouble size={14} />} label={`${unit.bedrooms} bd`} />
          <Spec icon={<Bath size={14} />} label={`${unit.bathrooms} ba`} />
          <Spec
            icon={<Ruler size={14} />}
            label={
              unit.squareFeet ? `${unit.squareFeet.toLocaleString()} sf` : "Ask"
            }
          />
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <MapPin size={13} />
          <span className="truncate">
            {unit.property.addressLine}, {unit.property.zip}
          </span>
        </div>

        <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
          {availabilityLabel(unit.availableOn)}
        </div>

        {typeof listingQualityScore === "number" ? (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
            <span>Listing quality</span>
            <span
              className={
                listingQualityScore >= 80
                  ? "text-emerald-700"
                  : listingQualityScore >= 55
                    ? "text-amber-700"
                    : "text-red-700"
              }
            >
              {listingQualityScore}% complete
            </span>
          </div>
        ) : null}

        {!compact ? (
          <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">
            {summary}
          </p>
        ) : null}

        <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
          {features.length === 0 ? (
            <Feature icon={<Sparkles size={12} />} label="Fresh listing" />
          ) : null}
          {unit.voucherFriendly ? (
            <Feature
              icon={<ShieldCheck size={12} />}
              label="Voucher"
              tone="brand"
            />
          ) : null}
          {unit.averageUtilityBill ? (
            <Feature
              icon={<WalletCards size={12} />}
              label={`${formatCurrency(unit.averageUtilityBill)} utils`}
            />
          ) : null}
          {features
            .filter((feature) => feature !== "Voucher-friendly")
            .slice(0, 3)
            .map((feature) => (
              <Feature
                key={feature}
                icon={<CheckCircle2 size={12} />}
                label={feature}
              />
            ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Link
            href={`/marketplace/${unit.id}`}
            className="rounded-xl bg-slate-950 px-3 py-2 text-center text-sm font-black text-white shadow-sm hover:bg-slate-800"
          >
            Details
          </Link>
          <Link
            href={`/marketplace/${unit.id}#interest`}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
          >
            Ask
          </Link>
        </div>
      </div>
    </article>
  );
}

function Spec({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5 font-bold">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Feature({
  icon,
  label,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  tone?: "slate" | "brand";
}) {
  const classes =
    tone === "brand"
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-1 text-[10px] font-black ${classes}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}
