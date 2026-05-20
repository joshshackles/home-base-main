import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Camera,
  CheckCircle2,
  ExternalLink,
  Heart,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  messagePotentialLandlord,
  saveFavoriteRental,
  startMarketplaceApplication,
} from "@/app/applicant/actions";
import { createLead } from "@/app/marketplace/actions";
import { formatCurrency } from "@/lib/format";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getListingQualityGaps,
  getListingQualityScore,
  getMapSearchHref,
  getMonthlyCostEstimate,
  getPublicLocationLabel,
  isApplicantMarketplaceViewer,
} from "@/lib/marketplace/listings";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const textareaClass = `${inputClass} min-h-28 resize-y`;

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: { unitId: string };
  searchParams?: { lead?: string; error?: string; question?: string };
}) {
  const currentUser = await getVerifiedCurrentUser();
  const unit = await prisma.unit.findFirst({
    where: {
      id: params.unitId,
      status: "AVAILABLE",
      marketingStatus: "ACTIVE",
      property: { isArchived: false },
    },
    include: {
      property: true,
      _count: { select: { photos: true, leads: true, applications: true } },
      photos: {
        orderBy: [
          { isFeatured: "desc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!unit) notFound();

  const isApplicant = isApplicantMarketplaceViewer(currentUser);
  const [favorite, applicantProfile, existingApplication, reusableDocuments] =
    isApplicant
      ? await Promise.all([
          prisma.favoriteRental.findUnique({
            where: {
              userId_unitId: { userId: currentUser!.userId, unitId: unit.id },
            },
            select: { id: true },
          }),
          prisma.applicantProfile.findUnique({
            where: { userId: currentUser!.userId },
            include: { householdMembers: true, incomeSources: true },
          }),
          prisma.application.findFirst({
            where: {
              unitId: unit.id,
              OR: [
                { applicantUserId: currentUser!.userId },
                { applicantEmail: currentUser!.email.toLowerCase() },
              ],
              status: { not: "WITHDRAWN" },
            },
            select: { id: true, status: true, updatedAt: true },
          }),
          prisma.document.count({
            where: {
              uploadedById: currentUser!.userId,
              status: { in: ["UPLOADED", "REVIEWED", "ACCEPTED"] },
            },
          }),
        ])
      : [null, null, null, 0];
  const leadSubmitted = searchParams?.lead === "success";
  const questionSent = searchParams?.question === "sent";
  const errorMessage = searchParams?.error;
  const headline = unit.marketingHeadline || unit.property.name;
  const qualityScore = getListingQualityScore(unit);
  const qualityGaps = getListingQualityGaps(unit);
  const monthlyCost = getMonthlyCostEstimate(unit);
  const mapHref = getMapSearchHref(unit);
  const publicLocation = getPublicLocationLabel(unit);
  const primaryPhoto = unit.photos[0];
  const galleryPhotos = unit.photos.slice(1, 6);
  const availabilityText = unit.availableOn && unit.availableOn > new Date() ? unit.availableOn.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Available now";

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[96rem] px-3 py-3 sm:px-5 lg:px-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Back to rentals
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-[96rem] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[1fr_360px] lg:px-6">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-1 bg-slate-950 p-1 md:grid-cols-[1.4fr_0.6fr]">
              <div className="relative min-h-[18rem] overflow-hidden rounded-xl bg-slate-900 text-white sm:min-h-[22rem]">
                {primaryPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/unit-photos/${primaryPhoto.id}`}
                    alt={`${headline} primary photo`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/70">
                    <Home size={64} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge>{unit.rentalType.replaceAll("_", " ")}</Badge>
                  <Badge tone="blue">{qualityScore}% complete</Badge>
                  <Badge tone="dark">
                    <Camera size={13} /> {unit._count.photos} photos
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
                    {headline}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-200">
                    <MapPin size={16} /> {publicLocation}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-100">Exact address shared after landlord contact or application authorization</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
                {galleryPhotos.slice(0, 4).map((photo) => (
                  <div
                    key={photo.id}
                    className="relative min-h-32 overflow-hidden rounded-xl bg-slate-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/unit-photos/${photo.id}`}
                      alt={`${headline} gallery photo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {galleryPhotos.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center rounded-xl bg-slate-900 text-white/70">
                    <Camera size={28} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              icon={<WalletCards size={18} />}
              label="Rent"
              value={formatCurrency(unit.rentAmount)}
              sub="per month"
            />
            <Metric
              icon={<BedDouble size={18} />}
              label="Beds"
              value={`${unit.bedrooms}`}
              sub="bedrooms"
            />
            <Metric
              icon={<Bath size={18} />}
              label="Baths"
              value={`${unit.bathrooms}`}
              sub="bathrooms"
            />
            <Metric
              icon={<Ruler size={18} />}
              label="Size"
              value={unit.squareFeet ? unit.squareFeet.toLocaleString() : "Ask"}
              sub="square feet"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Rental overview
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Everything renters need up front
                </h2>
              </div>
              <Link
                href={mapHref}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Area map <ExternalLink size={14} />
              </Link>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              {unit.marketingHighlights ||
                unit.description ||
                "This available rental is ready for inquiries. Details below are organized for fast scanning and application decisions."}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <InfoPill
                label="Monthly estimate"
                value={formatCurrency(monthlyCost.monthly)}
              />
              <InfoPill
                label="Move-in estimate"
                value={formatCurrency(monthlyCost.moveIn)}
              />
              <InfoPill label="Availability" value={availabilityText} />
              <InfoPill label="Public location" value={publicLocation} />
              <InfoPill
                label="Deposit"
                value={unit.deposit ? formatCurrency(unit.deposit) : "Ask"}
              />
              <InfoPill label="Utilities" value={unit.utilitiesNote || "Ask"} />
              <InfoPill label="Parking" value={unit.parkingInfo || "Ask"} />
              <InfoPill label="Laundry" value={unit.laundryInfo || "Ask"} />
              <InfoPill label="Pets" value={unit.petPolicy || "Ask"} />
              <InfoPill label="School district" value={unit.schoolDistrict || "Ask"} />
              <InfoPill
                label="Walk / transit"
                value={
                  unit.walkScore || unit.transitScore
                    ? `Walk ${unit.walkScore ?? "N/A"} / Transit ${unit.transitScore ?? "N/A"}`
                    : "Ask"
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Listing readiness</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Quality and privacy checks</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">HomeBase publishes only active, available rentals with usable marketplace detail. Public pages show area-level location first, while exact address handling stays inside landlord/applicant workflows.</p>
              </div>
              <Badge tone={qualityScore >= 75 ? "blue" : "dark"}>{qualityScore}% complete</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {qualityGaps.length === 0 ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">No major gaps</span>
              ) : (
                qualityGaps.slice(0, 6).map((gap) => (
                  <span key={gap} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-800">Missing {gap}</span>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {unit.voucherFriendly ? (
              <FeatureBlock
                icon={<ShieldCheck size={18} />}
                title="Voucher-friendly"
                value="This rental has been marked as voucher-friendly by the administrator."
              />
            ) : null}
            <FeatureBlock
              icon={<CheckCircle2 size={18} />}
              title="Nearby features"
              value={
                unit.neighborhood ||
                unit.nearbyFeatures ||
                "Neighborhood details have not been added yet."
              }
            />
            <FeatureBlock
              icon={<CalendarDays size={18} />}
              title="Move-in fees"
              value={
                unit.leaseTermsNote ||
                unit.moveInFeesNote ||
                "Lease and move-in fee details have not been added yet."
              }
            />
            <FeatureBlock
              icon={<Home size={18} />}
              title="Home details"
              value={
                [
                  unit.yearBuilt ? `Built in ${unit.yearBuilt}` : null,
                  unit.roofAgeYears !== null
                    ? `Roof about ${unit.roofAgeYears} years old`
                    : null,
                  unit.appliancesIncluded,
                  unit.yardInfo,
                ]
                  .filter(Boolean)
                  .join(" / ") ||
                "Additional home details have not been added yet."
              }
            />
          </section>
        </div>

        <aside
          id="interest"
          className="scroll-mt-20 h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4"
        >
          {leadSubmitted ? (
            <Notice
              tone="success"
              title="Inquiry received"
              body="Your interest has been saved. The rental team can now follow up with next steps."
            />
          ) : null}
          {questionSent ? (
            <Notice
              tone="success"
              title="Question sent"
              body="Your message was sent to the rental team and this home was saved to your applicant dashboard."
            />
          ) : null}
          {errorMessage ? (
            <Notice
              tone="error"
              title="Inquiry could not be saved"
              body={errorMessage}
            />
          ) : null}

          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-3xl font-black">
              {formatCurrency(unit.rentAmount)}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              per month
              {unit.deposit ? ` / ${formatCurrency(unit.deposit)} deposit` : ""}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-200">
              <span className="rounded-xl bg-white/10 px-2 py-2">
                {unit.bedrooms} bd
              </span>
              <span className="rounded-xl bg-white/10 px-2 py-2">
                {unit.bathrooms} ba
              </span>
              <span className="rounded-xl bg-white/10 px-2 py-2">
                {unit.squareFeet ? `${unit.squareFeet} sf` : "Ask sf"}
              </span>
            </div>
          </div>

          {isApplicant ? (
            <div className="mt-4 space-y-3">
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Fast apply
                </p>
                <h2 className="mt-1 text-xl font-black text-blue-950">
                  Apply with your saved renter packet
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] font-black text-blue-950 sm:grid-cols-4">
                  <span className="rounded-xl bg-white px-2 py-2">
                    {applicantProfile ? "Profile" : "Start profile"}
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2">
                    {applicantProfile
                      ? `${applicantProfile.householdMembers.length + applicantProfile.incomeSources.length} details`
                      : "0 details"}
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2">
                    {reusableDocuments} docs
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2">
                    {applicantProfile?.applicantPacketSignedAt ? "Signed" : "Needs signature"}
                  </span>
                </div>
                {existingApplication ? (
                  <Link
                    href={`/applicant/applications/${existingApplication.id}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
                  >
                    Continue application
                  </Link>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <Link href={`/applicant/apply/${unit.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">
                      Review packet and apply
                    </Link>
                    <details className="rounded-xl border border-blue-200 bg-white p-3">
                      <summary className="cursor-pointer text-sm font-black text-blue-950">One-click authorization form</summary>
                      <form action={startMarketplaceApplication} className="mt-3 grid gap-3">
                        <input type="hidden" name="unitId" value={unit.id} />
                        <label className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold leading-5 text-blue-950">
                          <input
                            type="checkbox"
                            name="shareAuthorization"
                            value="true"
                            required
                            className="mt-1 h-4 w-4 rounded border-blue-300"
                          />
                          I authorize HomeBase to share my saved renter packet with this rental team.
                        </label>
                        <textarea
                          name="message"
                          rows={3}
                          className="rounded-xl border border-blue-200 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          placeholder="Optional note for the rental team..."
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                        >
                          Apply with saved info
                        </button>
                      </form>
                    </details>
                  </div>
                )}
              </section>

              <details className="rounded-2xl border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-black text-slate-900">
                  Ask a question instead
                </summary>
                <form action={messagePotentialLandlord} className="mt-3 grid gap-2">
                  <input type="hidden" name="unitId" value={unit.id} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`/marketplace/${unit.id}`}
                  />
                  <textarea
                    name="message"
                    required
                    rows={3}
                    className={textareaClass}
                    placeholder="Ask about tours, availability, pets, utilities, or move-in timing."
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"
                  >
                    Send question
                  </button>
                </form>
              </details>

              <form action={saveFavoriteRental} className="rounded-2xl bg-slate-50 p-3">
                <input type="hidden" name="unitId" value={unit.id} />
                <label className="block text-sm font-black text-slate-900">
                  Private comparison note
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Why this home is worth keeping..."
                />
                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
                >
                  <Heart size={15} />{" "}
                  {favorite ? "Update favorite" : "Save rental"}
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href={`/login?next=/marketplace/${unit.id}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"
              >
                <Heart size={15} /> Sign in to apply faster
              </Link>

              <form action={createLead} className="mt-4 grid gap-3">
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
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-black text-slate-700">
                    I want to
                    <select
                      name="intent"
                      className={inputClass}
                      defaultValue="tour"
                    >
                      <option value="tour">Request tour</option>
                      <option value="availability">Check availability</option>
                      <option value="apply">Start application</option>
                      <option value="question">Ask question</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black text-slate-700">
                    Move-in
                    <input name="moveInDate" type="date" className={inputClass} />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-black text-slate-700">
                  Name
                  <input
                    name="name"
                    required
                    className={inputClass}
                    placeholder="Jane Doe"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-700">
                  Email
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      name="email"
                      type="email"
                      required
                      className={`${inputClass} w-full pl-9`}
                      placeholder="jane@example.com"
                    />
                  </div>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-700">
                  Phone
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      name="phone"
                      className={`${inputClass} w-full pl-9`}
                      placeholder="417-555-0000"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-black text-slate-700">
                    Household
                    <input
                      name="householdSize"
                      type="number"
                      min="1"
                      className={inputClass}
                      placeholder="2"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-slate-700">
                    Pets
                    <input name="pets" className={inputClass} placeholder="None" />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-black text-slate-700">
                  Message
                  <textarea
                    name="message"
                    className={textareaClass}
                    placeholder="I am interested in this rental and would like more information."
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                >
                  Send inquiry
                </button>
              </form>
            </>
          )}
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <p className="text-xl font-black text-slate-950">
              {formatCurrency(unit.rentAmount)}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {unit.bedrooms} bd / {unit.bathrooms} ba / {unit.property.city}
            </p>
          </div>
          <a
            href="#interest"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
          >
            Contact
          </a>
        </div>
      </div>
    </main>
  );
}

function Badge({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "blue" | "dark";
}) {
  const classes =
    tone === "blue"
      ? "bg-blue-600 text-white"
      : tone === "dark"
        ? "bg-slate-950/75 text-white"
        : "bg-white/95 text-slate-950";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm backdrop-blur ${classes}`}
    >
      {children}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{sub}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FeatureBlock({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 font-black text-slate-950">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
}: {
  tone: "success" | "error";
  title: string;
  body: string;
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={`mb-3 rounded-2xl border p-4 ${classes}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </div>
  );
}
