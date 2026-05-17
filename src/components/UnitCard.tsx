import Link from "next/link";
import type { ReactNode } from "react";
import { Bath, BedDouble, CheckCircle2, Heart, Home, MapPin, Ruler, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { removeFavoriteRental, saveFavoriteRental } from "@/app/applicant/actions";
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
    status: string;
    description: string | null;
    photos?: Array<{ id: string; isFeatured: boolean }>;
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
};

function featureText(unit: UnitCardProps["unit"]) {
  const features = [];
  if (unit.voucherFriendly) features.push("Voucher-friendly");
  if (unit.schoolDistrict) features.push(unit.schoolDistrict);
  if (unit.neighborhood) features.push(unit.neighborhood);
  if (unit.petPolicy) features.push("Pet notes");
  if (unit.accessibility) features.push("Accessibility notes");
  if (unit.utilitiesNote) features.push("Utility details");
  return features;
}

export function UnitCard({ unit, isFavorite = false, matchScore = null, compact = false }: UnitCardProps) {
  const features = featureText(unit);
  const featuredPhoto = unit.photos?.[0];

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl">
      <div className="relative min-h-52 overflow-hidden bg-[radial-gradient(circle_at_top_left,#38bdf8_0,#0f172a_34%,#172554_72%,#14532d_100%)] p-5 text-white">
        {featuredPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/unit-photos/${featuredPhoto.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : null}
        {featuredPhoto ? <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/25" /> : null}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <Home size={26} />
          </div>
          <div className="flex items-center gap-2">
            {matchScore !== null ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{matchScore}% match</span>
            ) : null}
            <form action={isFavorite ? removeFavoriteRental : saveFavoriteRental}>
              <input type="hidden" name="unitId" value={unit.id} />
              <button
                type="submit"
                aria-label={isFavorite ? "Remove from favorites" : "Save rental"}
                className={`rounded-full p-2 shadow-sm ring-1 ring-white/20 transition ${isFavorite ? "bg-rose-500 text-white" : "bg-white/90 text-slate-950 hover:bg-white"}`}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </form>
          </div>
        </div>
        <div className="relative mt-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">Unit {unit.unitNumber}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight">{unit.property.name}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            <MapPin size={16} /> {unit.property.city}, {unit.property.state}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-black text-slate-950">{formatCurrency(unit.rentAmount)}</p>
            <p className="text-sm text-slate-500">monthly rent{unit.deposit ? ` - ${formatCurrency(unit.deposit)} deposit` : ""}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            Available
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm text-slate-700">
          <Spec icon={<BedDouble size={17} />} label={`${unit.bedrooms} bed`} />
          <Spec icon={<Bath size={17} />} label={`${unit.bathrooms} bath`} />
          <Spec icon={<Ruler size={17} />} label={unit.squareFeet ? `${unit.squareFeet.toLocaleString()} ft2` : "N/A"} />
        </div>

        {!compact ? (
          <p className="line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">{unit.description ?? "No unit description has been added yet."}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {features.length === 0 ? <Feature icon={<Sparkles size={14} />} label="Fresh listing" /> : null}
          {unit.voucherFriendly ? <Feature icon={<ShieldCheck size={14} />} label="Voucher-friendly" tone="brand" /> : null}
          {unit.utilitiesNote ? <Feature icon={<WalletCards size={14} />} label="Utility details" /> : null}
          {unit.averageUtilityBill ? <Feature icon={<WalletCards size={14} />} label={`Avg. utilities ${formatCurrency(unit.averageUtilityBill)}`} /> : null}
          {unit.schoolDistrict ? <Feature icon={<CheckCircle2 size={14} />} label={unit.schoolDistrict} /> : null}
          {unit.neighborhood ? <Feature icon={<MapPin size={14} />} label={unit.neighborhood} /> : null}
          {unit.petPolicy ? <Feature icon={<CheckCircle2 size={14} />} label="Pet notes" /> : null}
          {unit.accessibility ? <Feature icon={<CheckCircle2 size={14} />} label="Accessible notes" /> : null}
        </div>

        <div className="flex gap-3">
          <Link href={`/marketplace/${unit.id}`} className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">
            View Details
          </Link>
          <Link href={`/marketplace/${unit.id}#interest`} className="rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900 hover:bg-slate-50">
            Ask
          </Link>
        </div>
      </div>
    </article>
  );
}

function Spec({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      {icon}
      <p className="mt-2 font-bold">{label}</p>
    </div>
  );
}

function Feature({ icon, label, tone = "slate" }: { icon: ReactNode; label: string; tone?: "slate" | "brand" }) {
  const classes = tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${classes}`}>{icon}{label}</span>;
}
