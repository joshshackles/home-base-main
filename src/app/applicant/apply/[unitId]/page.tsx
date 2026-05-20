export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Home, ShieldCheck } from "lucide-react";
import { startMarketplaceApplication } from "@/app/applicant/actions";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildReusablePacketReadiness } from "@/lib/applicant/packet-readiness";

function StatusPill({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
      {children}
    </span>
  );
}

export default async function GuidedApplyPage({ params }: { params: { unitId: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], `/applicant/apply/${params.unitId}`);
  const unit = await prisma.unit.findFirst({
    where: { id: params.unitId, status: "AVAILABLE", marketingStatus: "ACTIVE", property: { isArchived: false } },
    include: { property: true }
  });
  if (!unit) notFound();

  const [profile, reusableDocuments, existingApplication] = await Promise.all([
    prisma.applicantProfile.findUnique({ where: { userId: user.userId }, include: { householdMembers: true, incomeSources: true } }),
    prisma.document.count({ where: { uploadedById: user.userId, status: { in: ["UPLOADED", "REVIEWED", "ACCEPTED"] } } }),
    prisma.application.findFirst({
      where: { unitId: unit.id, OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email.toLowerCase() }], status: { not: "WITHDRAWN" } },
      select: { id: true, status: true, updatedAt: true }
    })
  ]);
  const readiness = buildReusablePacketReadiness(profile, reusableDocuments);
  const headline = unit.marketingHeadline || `${unit.property.name} #${unit.unitNumber}`;

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 lg:px-8">
          <Link href={`/marketplace/${unit.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            <ArrowLeft size={16} /> Back to listing
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[1fr_380px] lg:px-8">
        <section className="space-y-4 sm:space-y-6">
          <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-sm sm:rounded-[2rem] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200 sm:text-sm sm:tracking-[0.3em]">Guided apply</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">Apply with your reusable renter packet.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Review what will be shared, authorize HomeBase to send your saved applicant information to this rental team, and submit in a few clicks.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Step 1</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Reusable packet readiness</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">These are the profile sections landlords receive when you authorize sharing for a specific home.</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-black text-slate-950">{readiness.score}%</p>
                <p className="text-xs font-bold uppercase text-slate-500">packet ready</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${readiness.score}%` }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {readiness.items.map((item) => (
                <Link key={item.id} href={item.href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${item.complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black text-slate-950">{item.label}</h3>
                    <StatusPill complete={item.complete}>{item.complete ? "Ready" : item.required ? "Needed" : "Optional"}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Step 2</p>
            <h2 className="mt-1 text-2xl font-black text-blue-950">Authorize and submit</h2>
            {existingApplication ? (
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="font-black text-slate-950">You already started an application for this home.</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Open the application to review status, documents, and messages.</p>
                <Link href={`/applicant/applications/${existingApplication.id}`} className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Continue application</Link>
              </div>
            ) : (
              <form action={startMarketplaceApplication} className="mt-4 grid gap-4">
                <input type="hidden" name="unitId" value={unit.id} />
                <label className="flex gap-3 rounded-2xl border border-blue-200 bg-white p-4 text-sm font-bold leading-6 text-blue-950">
                  <input type="checkbox" name="shareAuthorization" value="true" required className="mt-1 h-4 w-4 rounded border-blue-300" />
                  <span>I authorize HomeBase to share my saved renter packet, household, income, reusable documents, contact details, and signed acknowledgements with this rental team for this application.</span>
                </label>
                <textarea name="message" rows={4} className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Optional note for the rental team..." />
                        <button type="submit" className="min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">Authorize and Submit Application</button>
              </form>
            )}
          </div>
        </section>

        <aside className="h-fit space-y-4 lg:sticky lg:top-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <Home size={22} />
              <h2 className="mt-3 text-2xl font-black">{headline}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-300">{unit.property.addressLine}, {unit.property.city}, {unit.property.state} {unit.property.zip}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-700">
              <span className="rounded-xl bg-slate-100 px-2 py-2">{unit.bedrooms} bd</span>
              <span className="rounded-xl bg-slate-100 px-2 py-2">{unit.bathrooms} ba</span>
              <span className="rounded-xl bg-slate-100 px-2 py-2">{unit.squareFeet ? `${unit.squareFeet} sf` : "Ask sf"}</span>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950">{formatCurrency(unit.rentAmount)}</p>
            <p className="text-sm font-semibold text-slate-500">per month{unit.deposit ? ` / ${formatCurrency(unit.deposit)} deposit` : ""}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck size={18} /> What gets shared</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 text-emerald-600" size={16} /> Profile, contact, household, and rental goals</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 text-emerald-600" size={16} /> Income, voucher, case worker, vehicle, and housing details</p>
              <p className="flex gap-2"><FileText className="mt-0.5 text-emerald-600" size={16} /> Documents connected to your applicant packet</p>
            </div>
            {readiness.requiredMissing.length > 0 ? (
              <Link href={readiness.requiredMissing[0].href} className="mt-4 inline-flex w-full justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50">
                Improve packet: {readiness.requiredMissing[0].label}
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
