import Link from "next/link";
import { SearchParams, buildPageHref, getPageCount } from "@/lib/pagination";

export function Pagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total
}: {
  pathname: string;
  searchParams?: SearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pageCount = getPageCount(total, pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
      <p className="font-semibold text-slate-600">Showing {start}-{end} of {total}</p>
      <div className="flex items-center gap-2">
        {page > 1 ? <Link className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50" href={buildPageHref(pathname, searchParams, page - 1)}>Previous</Link> : <span className="rounded-xl border border-slate-100 px-4 py-2 font-bold text-slate-300">Previous</span>}
        <span className="rounded-xl bg-slate-100 px-4 py-2 font-black text-slate-700">Page {page} of {pageCount}</span>
        {page < pageCount ? <Link className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50" href={buildPageHref(pathname, searchParams, page + 1)}>Next</Link> : <span className="rounded-xl border border-slate-100 px-4 py-2 font-bold text-slate-300">Next</span>}
      </div>
    </div>
  );
}
