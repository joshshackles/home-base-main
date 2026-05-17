import Link from "next/link";
import { Bath, BedDouble, CheckCircle2, Home, Ruler } from "lucide-react";
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
    status: string;
    description: string | null;
    property: {
      name: string;
      addressLine: string;
      city: string;
      state: string;
      zip: string;
    };
  };
};

export function UnitCard({ unit }: UnitCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700 text-white">
        <div className="text-center">
          <Home className="mx-auto mb-3" size={38} />
          <p className="text-sm uppercase tracking-[0.25em] text-blue-100">Unit {unit.unitNumber}</p>
          <h3 className="mt-1 text-2xl font-bold">{unit.property.name}</h3>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{unit.property.addressLine}</p>
            <p className="font-semibold text-slate-900">
              {unit.property.city}, {unit.property.state} {unit.property.zip}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            {unit.status.toLowerCase()}
          </span>
        </div>

        <div>
          <p className="text-3xl font-black text-slate-950">{formatCurrency(unit.rentAmount)}</p>
          <p className="text-sm text-slate-500">monthly rent{unit.deposit ? ` • ${formatCurrency(unit.deposit)} deposit` : ""}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm text-slate-700">
          <div className="rounded-2xl bg-slate-50 p-3">
            <BedDouble size={17} />
            <p className="mt-2 font-bold">{unit.bedrooms} bed</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <Bath size={17} />
            <p className="mt-2 font-bold">{unit.bathrooms} bath</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <Ruler size={17} />
            <p className="mt-2 font-bold">{unit.squareFeet ? `${unit.squareFeet} ft²` : "N/A"}</p>
          </div>
        </div>

        <p className="min-h-12 text-sm leading-6 text-slate-600">{unit.description ?? "No unit description has been added yet."}</p>

        <div className="space-y-2 text-sm text-slate-600">
          {unit.voucherFriendly && (
            <p className="flex items-center gap-2 font-semibold text-brand-700">
              <CheckCircle2 size={16} /> Voucher-friendly listing
            </p>
          )}
          {unit.utilitiesNote && <p><strong>Utilities:</strong> {unit.utilitiesNote}</p>}
          {unit.petPolicy && <p><strong>Pets:</strong> {unit.petPolicy}</p>}
          {unit.accessibility && <p><strong>Accessibility:</strong> {unit.accessibility}</p>}
        </div>

        <Link href={`/marketplace/${unit.id}`} className="block w-full rounded-2xl bg-brand-600 px-4 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">
          View Details
        </Link>
      </div>
    </article>
  );
}
