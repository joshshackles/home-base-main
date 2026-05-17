import Link from "next/link";

type LandlordPageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function LandlordPageHeader({ title, description, actionHref, actionLabel }: LandlordPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Landlord Portal</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl leading-7 text-slate-600">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-900 shadow-sm hover:bg-slate-50">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
