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
    <div className="mb-5 flex flex-col justify-between gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:mb-8 sm:rounded-[2rem] sm:p-6 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700 sm:text-sm sm:tracking-[0.25em]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
