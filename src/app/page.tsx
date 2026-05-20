import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Home,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UnitStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { HomeBaseMark } from "@/components/brand/HomeBaseLogo";

export const dynamic = "force-dynamic";

type FeaturedUnit = Awaited<ReturnType<typeof getFeaturedUnits>>[number];

async function getHomepageData() {
  noStore();
  try {
    const [listingCount, voucherFriendlyCount, marketplaceAreas, featuredUnits] = await Promise.all([
      prisma.unit.count({ where: { status: UnitStatus.AVAILABLE, marketingStatus: "ACTIVE", property: { isArchived: false } } }),
      prisma.unit.count({ where: { status: UnitStatus.AVAILABLE, marketingStatus: "ACTIVE", voucherFriendly: true, property: { isArchived: false } } }),
      prisma.property.findMany({ where: { isArchived: false, units: { some: { status: UnitStatus.AVAILABLE, marketingStatus: "ACTIVE" } } }, select: { city: true, state: true }, take: 500 }),
      getFeaturedUnits()
    ]);
    const cityCount = new Set(marketplaceAreas.map((area) => `${area.city}, ${area.state}`)).size;
    return { listingCount, voucherFriendlyCount, cityCount, featuredUnits, dataAvailable: true };
  } catch {
    return { listingCount: 0, voucherFriendlyCount: 0, cityCount: 0, featuredUnits: [], dataAvailable: false };
  }
}

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
    take: 6
  });
}

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main id="main-content" className="overflow-hidden bg-white text-slate-950">
      <HeroSection data={data} />
      <AudiencePathways />
      <MarketplaceCredibility />
      <ProductPreview />
      <FeaturedListings units={data.featuredUnits} dataAvailable={data.dataAvailable} />
      <TrustSection />
      <FinalCTA />
    </main>
  );
}

function HeroSection({ data }: { data: Awaited<ReturnType<typeof getHomepageData>> }) {
  return (
    <section className="relative border-b border-slate-200 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white to-transparent" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-sm font-black text-blue-100">
            <Sparkles size={16} /> Housing marketplace + rental operations
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Find housing faster. Manage rentals smarter.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            HomeBase MLS connects renters, landlords, property managers, housing partners, inspectors, vendors, and administrators in one modern housing platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500">
              Search rentals <Search size={18} />
            </Link>
            <Link href="/signup?intent=landlord" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-400">
              List and manage rentals <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-black text-white hover:bg-white/15">
              Sign in
            </Link>
          </div>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <HeroSignal value={data.listingCount} label="available listings" />
            <HeroSignal value={data.voucherFriendlyCount} label="voucher-friendly listings" />
            <HeroSignal value={data.cityCount} label="marketplace areas" />
          </div>
          {!data.dataAvailable ? <p className="mt-3 text-sm font-semibold text-amber-100">Live marketplace counts are temporarily unavailable. The page is not showing demo inventory.</p> : null}
        </div>

        <div className="space-y-4">
          <HomeSearchPanel />
          <PlatformSnapshot />
        </div>
      </div>
    </section>
  );
}

function HomeSearchPanel() {
  return (
    <section className="rounded-[2rem] border border-white/15 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Rental search</p>
          <h2 className="mt-1 text-2xl font-black">Start with a real listing search.</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">Public marketplace</span>
      </div>
      <form action="/marketplace" className="mt-4 grid gap-3">
        <label className="relative">
          <span className="sr-only">City ZIP or address</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input name="q" placeholder="City, ZIP, address, school, pets, accessibility..." className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="city" placeholder="City" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          <select name="bedrooms" defaultValue="" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="">Any bedrooms</option>
            <option value="1">1+ bedroom</option>
            <option value="2">2+ bedrooms</option>
            <option value="3">3+ bedrooms</option>
            <option value="4">4+ bedrooms</option>
          </select>
          <input name="minRent" inputMode="numeric" placeholder="Min rent" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          <input name="maxRent" inputMode="numeric" placeholder="Max rent" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          <input name="voucherFriendly" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Voucher-friendly rentals
        </label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white hover:bg-slate-800">
          Search available homes <ArrowRight size={18} />
        </button>
      </form>
    </section>
  );
}

function PlatformSnapshot() {
  return (
    <section className="rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-slate-950/20 backdrop-blur">
      <div className="rounded-[1.5rem] bg-slate-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-200">Operations preview</p>
            <h2 className="mt-1 text-3xl font-black text-white">One workflow for everyone involved.</h2>
          </div>
          <HomeBaseMark tone="light" className="h-10 w-10" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PreviewMetric label="Applications" value="Pipeline" />
          <PreviewMetric label="Listings" value="Live status" />
          <PreviewMetric label="Messages" value="Context" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <p className="font-black text-white">Application packet</p>
            {["Reusable profile", "Document requests", "Landlord review"].map((item, index) => (
              <div key={item} className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.06] px-3 py-3">
                <span className="font-bold text-slate-200">{item}</span>
                <span className={index === 0 ? "text-emerald-300" : "text-blue-200"}>{index === 0 ? "Ready" : "Open"}</span>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <p className="font-black text-white">Unit health</p>
            <div className="mt-4 space-y-3">
              <Progress label="Listing quality" value="88%" />
              <Progress label="Lease packet" value="62%" />
              <Progress label="Maintenance SLA" value="94%" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudiencePathways() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Built for every housing role" title="Clear pathways for renters, operators, partners, and field teams." description="Each account gets the tools that match its real job, with permission-aware dashboards and workflow shortcuts." />
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <AudienceCard icon={UserRound} title="Renters and applicants" detail="Search homes, build a reusable profile, apply faster, and keep landlord messages in one place." href="/marketplace" cta="Search homes" items={["Search listings", "Reusable profile", "Fast applications", "Landlord messages"]} />
          <AudienceCard icon={Building2} title="Landlords and managers" detail="Manage properties, publish listings, review applications, coordinate leases, and open tenant records." href="/signup?intent=landlord" cta="List rentals" items={["Property/unit tools", "Listing health", "Applications", "Tenant directory"]} />
          <AudienceCard icon={Users} title="Housing teams" detail="Coordinate applications, documents, clients, inspections, messages, and access across the housing lifecycle." href="/signup" cta="Create account" items={["Workflow visibility", "Document tracking", "Role access", "Reporting"]} />
          <AudienceCard icon={Wrench} title="Inspectors and vendors" detail="See assigned work, submit field updates, coordinate repairs, and stay connected to rental records." href="/login?next=%2Fvendor" cta="Open field portal" items={["Assigned tasks", "Inspections", "Work orders", "Invoices"]} />
        </div>
      </div>
    </section>
  );
}

function MarketplaceCredibility() {
  const capabilities = [
    ["Reusable renter profiles", "Applicants can share structured information without retyping everything."],
    ["Application tracking", "Landlords and renters see status, documents, messages, and next actions."],
    ["Property and unit management", "Owners manage complexes, homes, units, listing status, and vacancy work."],
    ["Secure messaging", "Questions and replies stay connected to listings, applications, tenants, and repairs."],
    ["Documents and signatures", "Lease packets, document requests, and signature workflows stay organized."],
    ["Role-based dashboards", "Admins, owners, tenants, vendors, and inspectors see work scoped to their access."]
  ];
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-700">More than listings</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">A complete housing marketplace ecosystem.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              HomeBase MLS is designed for the operational reality behind every rental: applications, documents, communication, inspections, maintenance, approvals, rent records, and access control.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map(([title, detail]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="text-emerald-600" size={22} />
                <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <section className="bg-slate-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader dark eyebrow="Product preview" title="A role-based command center, not a generic admin page." description="The platform preview shows how listings, applications, tenants, maintenance, inspections, and messages come together for daily housing work." />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <PreviewTile icon={Home} label="Listings" value="Publish" />
              <PreviewTile icon={ClipboardCheck} label="Applications" value="Review" />
              <PreviewTile icon={MessageSquare} label="Messages" value="Reply" />
              <PreviewTile icon={Wrench} label="Maintenance" value="Assign" />
            </div>
            <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Landlord operating console</p>
                  <h3 className="mt-2 text-2xl font-black">Needs attention</h3>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-800">Priority queue</span>
              </div>
              {["New applicant question", "Application waiting for review", "Listing missing photos", "Maintenance estimate pending"].map((item) => (
                <div key={item} className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="font-bold">{item}</span>
                  <ArrowRight className="text-slate-400" size={16} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <PreviewPanel title="Applicant profile" detail="Reusable packet readiness, household, income, documents, messages, and authorization status." icon={UserRound} />
            <PreviewPanel title="Inspection workflow" detail="Assigned inspections, failed items, reports due, and reinspection queues." icon={CalendarCheck} />
            <PreviewPanel title="Vendor operations" detail="Assigned work, acceptance, photo updates, invoices, and payout eligibility." icon={Wrench} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedListings({ units, dataAvailable }: { units: FeaturedUnit[]; dataAvailable: boolean }) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <SectionHeader eyebrow="Marketplace preview" title="Featured available rentals" description="Live listings appear here when landlords publish available units to the marketplace." />
          <Link href="/marketplace" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700">
            Browse marketplace <ArrowRight size={18} />
          </Link>
        </div>

        {units.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => <ListingCard key={unit.id} unit={unit} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Home className="mx-auto text-slate-400" size={36} />
            <h3 className="mt-4 text-2xl font-black text-slate-950">{dataAvailable ? "No public listings are available yet" : "Marketplace data is not available right now"}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {dataAvailable
                ? "When landlords publish active available rentals, the newest listings will appear here. Renters can still open the marketplace search page."
                : "The homepage is not showing demo rentals. Once the database is reachable, live marketplace listings will appear here."}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700">Open marketplace</Link>
              <Link href="/signup?intent=landlord" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-50">Add a listing</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Trust and security" title="Built around permission-aware housing workflows." description="Housing data is sensitive. HomeBase MLS keeps role-based access, tenant-controlled sharing, document workflows, and communication context at the center of the product." />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <TrustCard icon={LockKeyhole} title="Secure account access" text="Dashboard data is tied to signed-in users, roles, and approved account access." />
          <TrustCard icon={ShieldCheck} title="Profile sharing control" text="Applicant packet details are only visible when an application or authorization exists." />
          <TrustCard icon={FileSignature} title="Document workflow" text="Applications, leases, uploads, requests, and signatures stay connected to records." />
          <TrustCard icon={MessageSquare} title="Clear communication" text="Messages stay linked to the listing, application, tenant, unit, or maintenance request." />
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-slate-950 py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">Move the housing process forward</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">One front door for searching, applying, listing, and managing rentals.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">Start as a renter, landlord, housing partner, inspector, vendor, or admin. HomeBase MLS routes you to the work your account can actually do.</p>
        </div>
        <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:grid-cols-3">
          <FinalLink href="/marketplace" title="Renters" detail="Search available homes" />
          <FinalLink href="/signup?intent=landlord" title="Landlords" detail="List and manage rentals" />
          <FinalLink href="/login" title="Existing users" detail="Sign in to your dashboard" />
        </div>
      </div>
    </section>
  );
}

function ListingCard({ unit }: { unit: FeaturedUnit }) {
  const photo = unit.photos[0];
  return (
    <Link href={`/marketplace/${unit.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#dbeafe,#ecfdf5)]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/unit-photos/${photo.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-blue-700"><Home size={42} /></div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-sm">Available</div>
      </div>
      <div className="p-5">
        <p className="text-2xl font-black text-slate-950">{formatCurrency(unit.rentAmount)} <span className="text-sm font-bold text-slate-500">/ month</span></p>
        <h3 className="mt-2 line-clamp-1 text-lg font-black text-slate-950">{unit.marketingHeadline || `${unit.property.name} #${unit.unitNumber}`}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={15} /> {unit.property.city}, {unit.property.state}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1"><BedDouble size={15} /> {unit.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1"><Bath size={15} /> {unit.bathrooms} ba</span>
          {unit.voucherFriendly ? <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-emerald-700">Voucher-friendly</span> : null}
        </div>
      </div>
    </Link>
  );
}

function HeroSignal({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function PreviewMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-xs font-bold text-slate-400">{label}</p>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-blue-400" style={{ width: value }} />
      </div>
    </div>
  );
}

function AudienceCard({ icon: Icon, title, detail, items, href, cta }: { icon: LucideIcon; title: string; detail: string; items: string[]; href: string; cta: string }) {
  return (
    <article className="flex min-h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={23} /></span>
      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-600" /> {item}
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-blue-700 hover:text-blue-900">
        {cta} <ArrowRight size={15} />
      </Link>
    </article>
  );
}

function PreviewTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <Icon className="text-blue-200" size={22} />
      <p className="mt-4 text-lg font-black text-white">{value}</p>
      <p className="text-sm font-bold text-slate-400">{label}</p>
    </div>
  );
}

function PreviewPanel({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <Icon className="text-emerald-300" size={24} />
      <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-blue-700" size={24} />
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function FinalLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 hover:bg-white/[0.12]">
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-200">Continue <ArrowRight size={15} /></span>
    </Link>
  );
}

function SectionHeader({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <p className={`text-sm font-black uppercase tracking-[0.24em] ${dark ? "text-blue-200" : "text-blue-700"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-4xl font-black tracking-tight sm:text-5xl ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      <p className={`mt-4 text-lg leading-8 ${dark ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
    </div>
  );
}
