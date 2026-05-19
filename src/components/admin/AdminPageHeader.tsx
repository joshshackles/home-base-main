import Link from "next/link";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AdminPageHeader({ eyebrow = "Admin", title, description, actionHref, actionLabel }: AdminPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end">
      <div>
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="rounded-2xl bg-brand-600 px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
