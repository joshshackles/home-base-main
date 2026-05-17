import Link from "next/link";
import { messagePotentialLandlord, removeFavoriteRental, saveFavoriteRental } from "@/app/applicant/actions";
import { Field, textareaClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ApplicantFavoritesPage({ searchParams }: { searchParams?: { message?: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/favorites");
  const favorites = await prisma.favoriteRental.findMany({
    where: { userId: user.userId },
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" }
  });

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
