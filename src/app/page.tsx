import Link from "next/link";
import type { ReactNode } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowRight, Bath, BedDouble, Building2, Headphones, Heart, Home, LockKeyhole, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { RentalPropertyType, UnitStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { HomepageHeroSlider, type HomepageHeroSlideView } from "@/components/home/HomepageHeroSlider";

export const dynamic = "force-dynamic";

type FeaturedUnit = Awaited<ReturnType<typeof getFeaturedUnits>>[number];

async function getFeaturedUnits() {
  return prisma.unit.findMany({
    where: { status: UnitStatus.AVAILABLE, marketingStatus: "ACTIVE", property: { isArchived: false } },
    include: {
      property: true,
      photos: {
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 4
  });
}

async function getHomepageData() {
  noStore();
  try {
    const [featuredUnits, slides] = await Promise.all([
      getFeaturedUnits(),
      prisma.homepageHeroSlide.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 8
      })
    ]);

    return {
      featuredUnits,
      slides: slides.map((slide) => ({
        id: slide.id,
        title: slide.title,
        subtitle: slide.subtitle,
        ctaLabel: slide.ctaLabel,
        ctaHref: slide.ctaHref,
        secondaryLabel: slide.secondaryLabel,
        secondaryHref: slide.secondaryHref,
        imageAlt: slide.imageAlt,
        imageUrl: `/api/homepage-slides/${slide.id}`
      })) satisfies HomepageHeroSlideView[],
      dataAvailable: true
    };
  } catch {
    return { featuredUnits: [], slides: [], dataAvailable: false };
  }
}

const starterSlides: HomepageHeroSlideView[] = [
  {
    id: "starter-reference",
    title: "Find Your Next Home. Simplified.",
    subtitle: "The most trusted rental marketplace connecting quality properties with qualified renters.",
    ctaLabel: "Search Rentals",
    ctaHref: "/marketplace",
    secondaryLabel: "List Your Property",
    secondaryHref: "/signup?intent=landlord",
    imageAlt: "Modern apartment building at dusk",
    imageUrl: "/homebase-hero-building-slide.png",
    imagePosition: "center"
  }
];

export default async function HomePage() {
  const data = await getHomepageData();
  const slides = data.slides.length > 0 ? data.slides : starterSlides;

  return (
    <main id="main-content" className="overflow-hidden bg-white text-slate-950">
      <HomepageHeroSlider slides={slides} />
      <SearchPanel />
      <TrustStrip />
      <FeaturedListings units={data.featuredUnits} dataAvailable={data.dataAvailable} />
      <HowItWorks />
      <RolePathways />
      <FinalCTA />
    </main>
  );
}

function SearchPanel() {
  return (
    <section className="relative z-10 -mt-12 px-5 sm:px-8 lg:px-12" aria-label="Rental search">
      <form action="/marketplace" className="mx-auto grid max-w-[1380px] gap-5 rounded-md border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/10 lg:grid-cols-[1.35fr_1fr_1fr_0.75fr_0.75fr_auto] lg:items-end">
        <SearchField label="Location" icon={<MapPin size={22} />} name="q" placeholder="City, Neighborhood, or ZIP" />
        <SelectField label="Property Type" icon={<Building2 size={21} />} name="propertyType" options={[["", "Any Type"], ...Object.values(RentalPropertyType).map((type) => [type, titleCase(type)])]} />
        <SelectField label="Price Range" icon={<Home size={21} />} name="maxRent" options={[["", "Any Price"], ["1000", "Up to $1,000"], ["1500", "Up to $1,500"], ["2000", "Up to $2,000"], ["2500", "Up to $2,500"], ["3000", "Up to $3,000"]]} />
        <SelectField label="Beds" icon={<BedDouble size={21} />} name="bedrooms" options={[["", "Any"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]} />
        <SelectField label="Baths" icon={<Bath size={21} />} name="bathrooms" options={[["", "Any"], ["1", "1+"], ["1.5", "1.5+"], ["2", "2+"], ["3", "3+"]]} />
        <button type="submit" className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-[#061c3f] px-9 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-900">
          <Search size={18} /> Search
        </button>
      </form>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: "Verified Listings", text: "Every listing is reviewed for accuracy and quality." },
    { icon: Users, title: "Trusted by Professionals", text: "Built for landlords, property managers, and renters." },
    { icon: LockKeyhole, title: "Secure & Private", text: "Your data is protected with account-based access." },
    { icon: Headphones, title: "Support That Cares", text: "Real people. Real help. When you need it." }
  ];

  return (
    <section className="bg-white px-5 pt-9 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[1380px] gap-7 border-b border-slate-200 pb-8 md:grid-cols-2 xl:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[#061c3f] shadow-inner">
              <Icon size={29} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-black text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedListings({ units, dataAvailable }: { units: FeaturedUnit[]; dataAvailable: boolean }) {
  return (
    <section className="bg-white px-5 py-7 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1380px]">
        <div className="flex items-end justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Featured Rentals</h2>
            <p className="mt-1 text-slate-600">Handpicked quality homes available now.</p>
          </div>
          <Link href="/marketplace" className="hidden items-center gap-2 text-sm font-black text-slate-950 hover:text-blue-700 sm:inline-flex">
            View All Properties <ArrowRight size={17} />
          </Link>
        </div>

        {units.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {units.map((unit, index) => <ListingCard key={unit.id} unit={unit} featured={index % 2 === 1} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Home className="mx-auto text-slate-400" size={36} />
            <h3 className="mt-4 text-xl font-black text-slate-950">{dataAvailable ? "Featured rentals are being refreshed" : "Marketplace listings are temporarily unavailable"}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {dataAvailable ? "Search the marketplace to view every active rental, or check back soon for curated featured homes." : "We are having trouble loading live rental data right now. Please try the marketplace again in a few minutes."}
            </p>
            <Link href="/marketplace" className="mt-5 inline-flex items-center justify-center rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Open marketplace</Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ListingCard({ unit, featured }: { unit: FeaturedUnit; featured: boolean }) {
  const photo = unit.photos[0];
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={`/marketplace/${unit.id}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/unit-photos/${photo.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)] text-slate-400"><Home size={42} /></div>
          )}
          <span className="absolute left-4 top-3 rounded bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">{featured ? "Featured" : "New"}</span>
          <span className="absolute right-4 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm"><Heart size={19} /></span>
        </div>
        <div className="p-4">
          <p className="text-2xl font-black text-slate-950">{formatCurrency(unit.rentAmount)} <span className="text-base font-semibold text-slate-500">/mo</span></p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{unit.bedrooms} Bed / {unit.bathrooms} Bath{unit.squareFeet ? ` / ${unit.squareFeet.toLocaleString()} Sq Ft` : ""}</p>
          <p className="mt-3 line-clamp-1 text-sm font-semibold text-slate-600">{unit.property.addressLine}, {unit.property.city}, {unit.property.state} {unit.property.zip}</p>
        </div>
      </Link>
    </article>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black tracking-tight text-slate-950">Search, apply, and manage the rental journey from one place.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">HomeBase MLS keeps the public marketplace connected to the operating tools behind it: reusable applicant profiles, landlord review, messages, documents, inspections, and maintenance.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <StepCard number="01" title="Find a property" text="Use search filters, availability, saved homes, and listing details to narrow down real available rentals." />
          <StepCard number="02" title="Apply with your profile" text="Signed-in applicants can reuse their renter profile and authorize the details needed for review." />
          <StepCard number="03" title="Keep work moving" text="Landlords, tenants, inspectors, vendors, and admins see the next action in their own role-based workspace." />
        </div>
      </div>
    </section>
  );
}

function RolePathways() {
  return (
    <section id="resources" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div id="about">
          <h2 className="text-4xl font-black tracking-tight text-slate-950">A professional marketplace for the full housing team.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">Renters get a simple path to housing. Landlords get a true operating console. Housing partners, inspectors, vendors, admins, and platform operators get permission-aware tools without cluttering everyone else's screen.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Pathway title="Renters / Applicants" text="Search listings, save homes, build a reusable profile, apply, upload documents, and message landlords." href="/marketplace" />
          <Pathway title="Landlords / Managers" text="Manage properties, units, listings, applications, tenants, leases, messages, and maintenance." href="/signup?intent=landlord" />
          <Pathway title="Inspectors / Vendors" text="Track assignments, field updates, photos, estimates, invoices, reports, and completion work." href="/login" />
          <Pathway title="Admins / Operators" text="Monitor access requests, data quality, workflows, integrations, security, health, and slider content." href="/admin" />
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-6 rounded-lg border border-white/10 bg-white/[0.04] p-8 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Ready to move the housing process forward?</h2>
          <p className="mt-2 max-w-2xl text-slate-300">Search rentals, list a property, or sign in to the role-based workspace built for your next action.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/marketplace" className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Search Rentals</Link>
          <Link href="/login" className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm font-black text-white hover:bg-white/10">Sign In</Link>
        </div>
      </div>
    </section>
  );
}

function SearchField({ label, icon, name, placeholder }: { label: string; icon: ReactNode; name: string; placeholder: string }) {
  return (
    <label className="grid gap-2">
      <span className="pl-10 text-sm font-bold text-slate-950">{label}</span>
      <span className="relative flex items-center">
        <span className="absolute left-0 flex w-8 justify-center text-slate-950">{icon}</span>
        <input name={name} placeholder={placeholder} className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 pl-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
      </span>
    </label>
  );
}

function SelectField({ label, icon, name, options }: { label: string; icon: ReactNode; name: string; options: string[][] }) {
  return (
    <label className="grid gap-2">
      <span className="pl-10 text-sm font-bold text-slate-950">{label}</span>
      <span className="relative flex items-center">
        <span className="absolute left-0 flex w-8 justify-center text-slate-950">{icon}</span>
        <select name={name} className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 pl-10 text-sm font-semibold text-slate-600 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
          {options.map(([value, labelText]) => <option key={`${name}-${value}`} value={value}>{labelText}</option>)}
        </select>
      </span>
    </label>
  );
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-black text-blue-700">{number}</p>
      <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}

function Pathway({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 group-hover:text-blue-900">Continue <ArrowRight size={15} /></span>
    </Link>
  );
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
