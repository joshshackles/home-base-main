import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, CheckCircle2, Home, Mail, MapPin, Phone, Ruler } from "lucide-react";
import { saveFavoriteRental } from "@/app/applicant/actions";
import { createLead } from "@/app/marketplace/actions";
import { formatCurrency } from "@/lib/format";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass = "rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50";
const textareaClass = `${inputClass} min-h-32 resize-y`;

export default async function UnitDetailPage({ params, searchParams }: { params: { unitId: string }; searchParams?: { lead?: string; error?: string } }) {
  const currentUser = await getVerifiedCurrentUser();
  const unit = await prisma.unit.findFirst({
    where: {
      id: params.unitId,
      status: "AVAILABLE",
      property: { isArchived: false }
    },
    include: { property: true }
  });

  if (!unit) notFound();

  const isApplicant = currentUser?.role === "APPLICANT" || currentUser?.role === "TENANT";
  const favorite = isApplicant ? await prisma.favoriteRental.findUnique({
    where: { userId_unitId: { userId: currentUser!.userId, unitId: unit.id } },
    select: { id: true }
  }) : null;
  const leadSubmitted = searchParams?.lead === "success";
  const errorMessage = searchParams?.error;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/marketplace" className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
        <ArrowLeft size={17} /> Back to marketplace
      </Link>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-72 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-brand-700 p-10 text-white">
            <div className="text-center">
              <Home className="mx-auto mb-4" size={48} />
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-100">Unit {unit.unitNumber}</p>
              <h1 className="mt-3 text-4xl font-black">{unit.property.name}</h1>
              <p className="mt-3 flex items-center justify-center gap-2 text-slate-200">
                <MapPin size={17} /> {unit.property.addressLine}, {unit.property.city}, {unit.property.state} {unit.property.zip}
              </p>
            </div>
          </div>

          <div className="space-y-8 p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-4xl font-black text-slate-950">{formatCurrency(unit.rentAmount)}</p>
                <p className="mt-1 text-slate-500">monthly rent{unit.deposit ? ` • ${formatCurrency(unit.deposit)} deposit` : ""}</p>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-black uppercase tracking-wide text-emerald-700">Available</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-5">
                <BedDouble size={22} />
                <p className="mt-3 text-2xl font-black text-slate-950">{unit.bedrooms}</p>
                <p className="text-sm font-semibold text-slate-500">Bedrooms</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <Bath size={22} />
                <p className="mt-3 text-2xl font-black text-slate-950">{unit.bathrooms}</p>
                <p className="text-sm font-semibold text-slate-500">Bathrooms</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <Ruler size={22} />
                <p className="mt-3 text-2xl font-black text-slate-950">{unit.squareFeet ? `${unit.squareFeet}` : "N/A"}</p>
                <p className="text-sm font-semibold text-slate-500">Square feet</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-950">About this unit</h2>
              <p className="mt-3 leading-7 text-slate-600">{unit.description ?? "No unit description has been added yet."}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {unit.voucherFriendly ? (
                <div className="rounded-3xl border border-brand-100 bg-brand-50 p-5 text-brand-900">
                  <p className="flex items-center gap-2 font-black"><CheckCircle2 size={18} /> Voucher-friendly listing</p>
                  <p className="mt-2 text-sm leading-6 text-brand-900/75">This listing has been marked as voucher-friendly by the administrator.</p>
                </div>
              ) : null}
              <InfoBlock title="Utilities" value={unit.utilitiesNote} fallback="No utilities note has been added." />
              <InfoBlock title="Pet policy" value={unit.petPolicy} fallback="No pet policy has been added." />
              <InfoBlock title="Accessibility" value={unit.accessibility} fallback="No accessibility notes have been added." />
            </div>
          </div>
        </div>

        <aside id="interest" className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          {leadSubmitted ? (
            <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <p className="font-black">Inquiry received</p>
              <p className="mt-2 text-sm leading-6">Your interest has been saved. An admin can now see this lead from the admin dashboard.</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900">
              <p className="font-black">Inquiry could not be saved</p>
              <p className="mt-2 text-sm leading-6">{errorMessage}</p>
            </div>
          ) : null}

          <h2 className="text-2xl font-black text-slate-950">I’m interested</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Send a basic inquiry tied to this unit. This is the first step toward a full application workflow.</p>

          {isApplicant ? (
            <form action={saveFavoriteRental} className="mt-5 rounded-2xl bg-brand-50 p-4">
              <input type="hidden" name="unitId" value={unit.id} />
              <label className="block text-sm font-bold text-brand-900">Save to favorites</label>
              <textarea name="notes" rows={3} className="mt-2 w-full rounded-2xl border border-brand-200 px-4 py-3" placeholder="Private notes for comparing this rental..." />
              <button type="submit" className="mt-3 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">
                {favorite ? "Update Favorite" : "Save Favorite"}
              </button>
            </form>
          ) : null}

          <form action={createLead} className="mt-5 grid gap-4">
            <input type="hidden" name="unitId" value={unit.id} />
            <label className="hidden" aria-hidden="true">
              Company website
              <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
            </label>
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              />
            ) : null}
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Name
              <input name="name" required className={inputClass} placeholder="Jane Doe" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Email
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="email" type="email" required className={`${inputClass} w-full pl-11`} placeholder="jane@example.com" />
              </div>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Phone
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="phone" className={`${inputClass} w-full pl-11`} placeholder="417-555-0000" />
              </div>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Message
              <textarea name="message" className={textareaClass} placeholder="I am interested in this unit and would like more information." />
            </label>
            <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700">
              Submit Interest
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function InfoBlock({ title, value, fallback }: { title: string; value: string | null; fallback: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value ?? fallback}</p>
    </div>
  );
}
