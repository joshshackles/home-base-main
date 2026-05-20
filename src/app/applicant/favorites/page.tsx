export const dynamic = "force-dynamic";

import Link from "next/link";
import { messagePotentialLandlord, removeFavoriteRental, saveFavoriteRental } from "@/app/applicant/actions";
import { deleteMarketplaceSearch } from "@/app/marketplace/actions";
import { Field, textareaClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function savedSearchHref(filters: unknown) {
  const params = new URLSearchParams();
  if (filters && typeof filters === "object" && !Array.isArray(filters)) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, value === true ? "on" : String(value));
    }
  }
  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export default async function ApplicantFavoritesPage({ searchParams }: { searchParams?: { message?: string; search?: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/favorites");
  const [favorites, savedSearches] = await Promise.all([
    prisma.favoriteRental.findMany({
      where: { userId: user.userId },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.savedMarketplaceSearch.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Applicant Portal</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Saved rentals</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">Keep a shortlist of available units, compare notes, and message potential landlords before applying.</p>
        </div>
        <Link href="/marketplace" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Browse Marketplace</Link>
      </div>

      {searchParams?.message === "sent" ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 font-bold text-emerald-900">Message sent to the landlord lead queue.</div>
      ) : null}
      {searchParams?.search === "removed" ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 font-bold text-emerald-900">Saved search removed.</div>
      ) : null}

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-brand-700">Saved searches</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Return to searches you want to monitor</h2>
          </div>
          <Link href="/marketplace" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">New search</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {savedSearches.length > 0 ? savedSearches.map((search) => (
            <article key={search.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <Link href={savedSearchHref(search.filters)} className="block hover:text-brand-700">
                <p className="font-black text-slate-950">{search.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Saved {search.createdAt.toLocaleDateString()}</p>
              </Link>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={savedSearchHref(search.filters)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-brand-50">Run search</Link>
                <form action={deleteMarketplaceSearch}>
                  <input type="hidden" name="searchId" value={search.id} />
                  <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50">Remove</button>
                </form>
              </div>
            </article>
          )) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 sm:col-span-2 lg:col-span-4">Saved searches will appear here after you save filters from the marketplace.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {favorites.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center lg:col-span-2">
            <h2 className="text-2xl font-black text-slate-950">No saved rentals yet</h2>
            <p className="mt-2 text-slate-600">Save units from the marketplace so you can track favorites and message landlords from one place.</p>
            <Link href="/marketplace" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Find Rentals</Link>
          </div>
        ) : favorites.map((favorite) => (
          <article key={favorite.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{favorite.unit.status}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{favorite.unit.property.name} #{favorite.unit.unitNumber}</h2>
                <p className="mt-1 text-slate-600">{favorite.unit.property.city}, {favorite.unit.property.state}</p>
              </div>
              <p className="text-3xl font-black text-slate-950">{formatCurrency(favorite.unit.rentAmount)}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info label="Beds" value={`${favorite.unit.bedrooms}`} />
              <Info label="Baths" value={`${favorite.unit.bathrooms}`} />
              <Info label="Sq ft" value={favorite.unit.squareFeet ? favorite.unit.squareFeet.toLocaleString() : "N/A"} />
            </div>

            <form action={saveFavoriteRental} className="mt-5">
              <input type="hidden" name="unitId" value={favorite.unit.id} />
              <Field label="Private notes">
                <textarea name="notes" defaultValue={favorite.notes ?? ""} className={textareaClass} placeholder="Pros, cons, questions, tour notes, commute, deposit details..." />
              </Field>
              <button className="mt-3 rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50" type="submit">Save Notes</button>
            </form>

            <form action={messagePotentialLandlord} className="mt-5 rounded-2xl bg-slate-50 p-4">
              <input type="hidden" name="unitId" value={favorite.unit.id} />
              <label className="block text-sm font-bold text-slate-700">Phone, optional</label>
              <input name="phone" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
              <label className="mt-4 block text-sm font-bold text-slate-700">Message landlord</label>
              <textarea name="message" required rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="I am interested in this unit. Is it still available for a tour?" />
              <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send Message</button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/marketplace/${favorite.unit.id}`} className="rounded-2xl bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">View Listing</Link>
              <form action={removeFavoriteRental}>
                <input type="hidden" name="unitId" value={favorite.unit.id} />
                <button className="rounded-2xl border border-rose-200 px-4 py-2 font-bold text-rose-700 hover:bg-rose-50" type="submit">Remove</button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
