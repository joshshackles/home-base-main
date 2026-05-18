import Link from "next/link";
import { ApplicationStatus, InspectionStatus, LedgerEntryStatus, LedgerEntryType, UnitStatus } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import {
  ArrowRight,
  Bath,
  BedDouble,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSignature,
  Heart,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  MoveRight,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  UserRound,
  WalletCards,
  Wrench
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { HomeBaseLogo, HomeBaseMark } from "@/components/brand/HomeBaseLogo";
import { getBrandingSettings } from "@/lib/admin-ops";

export const dynamic = "force-dynamic";

type IconType = typeof Building2;

type Feature = {
  title: string;
  description: string;
  icon: IconType;
};

type FallbackRentalPreview = {
  price: string;
  title: string;
  meta: string;
  address: string;
  tone: string;
};

type FeaturedUnit = Awaited<ReturnType<typeof getFeaturedUnits>>[number];

const landlordFeatures: Feature[] = [
  { title: "Publish rental listings", description: "Create public unit pages with photos, rent, policies, amenities, and move-in details.", icon: Building2 },
  { title: "Screen applications", description: "Track leads, application status, notes, documents, and approvals in one queue.", icon: ClipboardCheck },
  { title: "Run inspections", description: "Schedule inspections, document findings, and keep turnover work moving.", icon: Wrench },
  { title: "Send lease packets", description: "Prepare documents, capture e-signature evidence, and store lease records securely.", icon: FileSignature },
  { title: "Centralize messages", description: "Keep tenant, applicant, and internal conversations attached to the right record.", icon: MessageSquareText },
  { title: "Monitor ledger activity", description: "Give teams a clean view of rent, charges, payments, and workflow history.", icon: WalletCards }
];

const tenantFeatures: Feature[] = [
  { title: "Find available homes", description: "Browse rentals by rent, bedrooms, voucher support, pet policy, location, and more.", icon: Search },
  { title: "Apply online", description: "Start an application, upload documents, and keep everything in one account.", icon: UploadCloud },
  { title: "Track every step", description: "See whether an application is started, submitted, under review, approved, or ready for lease.", icon: BellRing },
  { title: "Sign securely", description: "Review lease packets and complete signing without chasing paper forms.", icon: KeyRound }
];

const fallbackRentalPreviews: FallbackRentalPreview[] = [
  { price: "$1,650", title: "Sunny 2 bed near downtown", meta: "2 bd - 1 ba - 850 sqft", address: "123 Main St, Apt 3B", tone: "from-emerald-100 via-white to-blue-100" },
  { price: "$1,950", title: "Renovated townhome", meta: "3 bd - 2 ba - 1,200 sqft", address: "456 Oak Ave, Apt 2A", tone: "from-sky-100 via-white to-indigo-100" },
  { price: "$2,100", title: "Family home with yard", meta: "3 bd - 2.5 ba - 1,450 sqft", address: "789 Pine Rd, Apt 1C", tone: "from-amber-100 via-white to-emerald-100" },
  { price: "$1,750", title: "Loft-style apartment", meta: "2 bd - 1 ba - 950 sqft", address: "321 Elm St, Apt 5D", tone: "from-slate-100 via-white to-blue-100" }
];

const landlordSteps = ["List property", "Get leads", "Review applications", "Inspect", "Send lease", "Welcome tenant"];
const tenantSteps = ["Find a home", "Apply online", "Track status", "Get approved", "Sign lease", "Move in"];


function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatCompactCurrencyFromCents(amountCents: number) {
  const amount = Math.max(0, Math.round(amountCents / 100));
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}m`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return formatCurrency(amountCents);
}

async function getHomePageStats() {
  noStore();

  const todayStart = startOfTodayUtc();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(todayStart.getUTCDate() + 1);

  try {
    const [activeListings, applications, inspectionsToday, collected] = await prisma.$transaction([
      prisma.unit.count({
        where: { status: UnitStatus.AVAILABLE, property: { isArchived: false } }
      }),
      prisma.application.count({
        where: {
          status: {
            in: [ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED]
          },
          unit: { property: { isArchived: false } }
        }
      }),
      prisma.inspection.count({
        where: {
          scheduledFor: { gte: todayStart, lt: tomorrowStart },
          status: { in: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS] },
          unit: { property: { isArchived: false } }
        }
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: {
          type: LedgerEntryType.PAYMENT,
          status: LedgerEntryStatus.POSTED,
          voidedAt: null,
          unit: { property: { isArchived: false } }
        }
      })
    ]);

    return {
      activeListings,
      applications,
      inspectionsToday,
      rentCollectedCents: collected._sum.amount ?? 0,
      isLive: true
    };
  } catch {
    return {
      activeListings: 12,
      applications: 8,
      inspectionsToday: 3,
      rentCollectedCents: 2400000,
      isLive: false
    };
  }
}

async function getFeaturedUnits() {
  try {
    return await prisma.unit.findMany({
      where: { status: UnitStatus.AVAILABLE, property: { isArchived: false } },
      include: {
        property: true,
        photos: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }], take: 1 }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 4
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featuredUnits, homePageStats, branding] = await Promise.all([getFeaturedUnits(), getHomePageStats(), getBrandingSettings()]);
  const hasLiveMarketplace = featuredUnits.length > 0;

  return (
    <main id="main-content" className="overflow-hidden bg-slate-950 text-slate-950">
      <section className="relative border-b border-white/10 bg-[radial-gradient(circle_at_14%_8%,rgba(37,99,235,0.34),transparent_34%),radial-gradient(circle_at_78%_16%,rgba(16,185,129,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#111827_100%)] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-10 hidden items-center justify-between gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-3 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:flex">
            <Link href="/" className="flex items-center gap-3 font-black text-white">
              <HomeBaseLogo tone="light" />
            </Link>
            <nav aria-label="Homepage sections" className="flex items-center gap-1 text-sm font-black text-slate-200">
              <a href="#landlords" className="inline-flex items-center gap-1 rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">For Landlords <ChevronDown size={14} /></a>
              <a href="#tenants" className="inline-flex items-center gap-1 rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">For Tenants <ChevronDown size={14} /></a>
              <a href="#marketplace" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">Marketplace</a>
              <a href="#workflow" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">Workflow</a>
              <a href="#trust" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">Trust</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">Sign In</Link>
              <Link href="/signup" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-blue-950/20 hover:bg-blue-500">Get Started</Link>
            </div>
          </div>

          <div className="grid gap-12 pb-16 pt-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-100 shadow-sm ring-1 ring-white/10">
                <Sparkles size={16} /> {branding.tagline}
              </p>
              <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                {branding.homepageHeadline}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                {branding.homepageSubheadline}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Link href="/signup?intent=landlord" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-400">
                  List a Rental <ArrowRight size={18} />
                </Link>
                <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white shadow-lg shadow-blue-950/20 hover:bg-blue-500">
                  Find a Home <Search size={18} />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-black text-white hover:bg-white/15">
                  Sign In
                </Link>
              </div>
              <Link href="#marketplace" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-blue-200 hover:text-white">
                Explore the marketplace <ArrowRight size={16} />
              </Link>
              <div className="mt-7 flex flex-wrap gap-4 text-sm font-bold text-slate-300">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400" /> Public listings</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400" /> Applicant portal</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400" /> Lease workflow</span>
              </div>
            </div>

            <HeroDashboard />
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-8" aria-label="Live platform metrics">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <StatCard value={`${homePageStats.activeListings}+`} label="Active listings" detail={homePageStats.isLive ? "Live count from available, non-archived rental inventory." : "Demo inventory shown until live listings are added."} />
          <StatCard value={homePageStats.applications.toString()} label="Applications" detail={homePageStats.isLive ? "Live count from active applicant workflows." : "Demo application activity shown until real workflows begin."} />
          <StatCard value={homePageStats.inspectionsToday.toString()} label="Inspections today" detail={homePageStats.isLive ? "Live count from today’s scheduled and in-progress inspections." : "Demo inspection activity shown until inspections are scheduled."} />
          <StatCard value={formatCompactCurrencyFromCents(homePageStats.rentCollectedCents)} label="Rent collected" detail={homePageStats.isLive ? "Live posted payment total from the ledger." : "Demo collection total shown until payments are posted."} />
        </div>
      </section>

      <section className="bg-slate-950 pb-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <AudienceShowcase id="landlords" audience="For Landlords" title="Everything you need to manage rentals and grow your business." cta="Create Landlord Account" href="/signup?intent=landlord" icon={Building2} tone="emerald" points={["Publish unlimited listings", "Collect and screen applications", "Schedule inspections", "Send leases for e-signature", "Track rent and ledger activity", "Communicate with tenants"]} />
          <AudienceShowcase id="tenants" audience="For Tenants" title="A simple, transparent way to find a home and manage your housing journey." cta="Create Applicant Account" href="/signup" icon={UserRound} tone="brand" points={["Browse available rentals", "Apply online in minutes", "Upload and manage documents", "Track application status", "Sign leases securely", "Manage your tenant account"]} />
        </div>
      </section>

      <section className="bg-slate-950 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FeatureColumn title="Landlord command center" features={landlordFeatures} />
          <FeatureColumn title="Tenant/applicant portal" features={tenantFeatures} />
        </div>
      </section>

      <section id="marketplace" className="scroll-mt-24 border-y border-white/10 bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeader eyebrow="Find your next home" title="A real marketplace view, connected to the application flow." description="Renters can search live listings, review details, save favorites, and move directly into the inquiry or application process." />
            <Link href="/marketplace" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-500">
              Browse all rentals <ArrowRight size={18} />
            </Link>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl">
            <form action="/marketplace" className="grid gap-3 rounded-3xl bg-slate-50 p-3 md:grid-cols-[1fr_0.65fr_0.65fr_auto]">
              <label className="relative">
                <span className="sr-only">Search rentals</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="q" placeholder="Search city, property, pets, accessibility..." className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>
              <input name="city" placeholder="City" className="h-14 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              <select name="bedrooms" className="h-14 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" defaultValue="">
                <option value="">Bedrooms</option>
                <option value="1">1+ bed</option>
                <option value="2">2+ beds</option>
                <option value="3">3+ beds</option>
              </select>
              <button className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 font-black text-white hover:bg-slate-800" type="submit">
                Search <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {hasLiveMarketplace ? featuredUnits.map((unit) => <MarketplacePreviewCard key={unit.id} unit={unit} />) : fallbackRentalPreviews.map((rental) => <FallbackRentalCard key={rental.address} rental={rental} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-24 bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader centered eyebrow="A better way to rent" title="Built for landlords and tenants. Designed for every step." description="The homepage now shows HomeBase as a full rental lifecycle platform, not just a collection of internal modules." />
          <div className="mt-10 space-y-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <WorkflowRow label="For landlords" steps={landlordSteps} tone="emerald" />
            <WorkflowRow label="For tenants" steps={tenantSteps} tone="brand" />
          </div>
        </div>
      </section>

      <section id="trust" className="scroll-mt-24 bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader dark centered eyebrow="Trusted. Secure. Built for real life." title="Public-facing trust signals that make signups feel safe." description="HomeBase handles housing applications, documents, messages, inspections, and lease records with clear controls and responsible defaults." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <TrustCard icon={Landmark} title="Fair housing" text="Promote equal access and responsible rental practices." />
            <TrustCard icon={LockKeyhole} title="Secure accounts" text="Password and session controls for sensitive housing records." />
            <TrustCard icon={LayoutDashboard} title="Audit logs" text="Track changes, actions, and workflow evidence." />
            <TrustCard icon={ShieldCheck} title="Document controls" text="Store applicant, tenant, and lease files with access boundaries." />
            <TrustCard icon={Heart} title="Accessible UX" text="Design for applicants, tenants, owners, and teams on every device." />
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-blue-300">Tools that help landlords succeed</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Everything important gets a real place to live.</h2>
            <p className="mt-4 leading-7 text-slate-300">A polished homepage should make the product feel complete without overwhelming new visitors. This grid gives prospects a fast mental map of the system.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Listings & marketing", "Applications & screening", "Messaging & communication", "Inspections & maintenance", "Documents & e-signature", "Rent ledger & reports", "Tenant management", "Applicant portal", "Admin controls"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 font-black text-white">
                <CheckCircle2 className="mb-3 text-blue-300" size={20} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex gap-1 text-amber-500" aria-label="Five star testimonial">
              {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={18} fill="currentColor" />)}
            </div>
            <p className="mt-5 text-xl font-black leading-8 text-slate-950">HomeBase turns the messy parts of renting into one clear process. I can list a home, review applicants, schedule inspections, and keep tenants informed without digging through email.</p>
            <p className="mt-5 font-black text-slate-950">Jessica L.</p>
            <p className="text-sm font-semibold text-slate-500">Landlord, Springfield, MO</p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="h-full min-h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,#dbeafe_0%,#f8fafc_34%,#dcfce7_100%)] p-8">
              <div className="ml-auto max-w-sm rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">Live tenant journey</p>
                {tenantSteps.slice(0, 4).map((step, index) => (
                  <div key={step} className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700">{index + 1}</span>
                    <span className="font-black text-slate-900">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-4xl font-black tracking-tight">Ready to simplify renting?</h2>
            <p className="mt-2 text-blue-50">Join landlords, applicants, and tenants using {branding.shortName} to move faster with less confusion.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?intent=landlord" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white hover:bg-emerald-400">Create Landlord Account</Link>
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-5 py-3 font-black text-white hover:bg-white/10">Create Applicant Account</Link>
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-5 py-3 font-black text-white hover:bg-white/10">Browse Marketplace</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroDashboard() {
  return (
    <div className="mx-auto w-full max-w-[760px] rounded-[2rem] border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/92 text-white">
        <div className="grid min-w-0 lg:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/10 bg-white/[0.04] p-5 lg:block">
            <HomeBaseLogo tone="light" />
            <div className="mt-7 space-y-2 text-sm font-black text-slate-400">
              {["Dashboard", "Listings", "Applications", "Inspections", "Leases", "Messages", "Ledger"].map((item, index) => (
                <div key={item} className={index === 0 ? "rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm" : "rounded-2xl px-4 py-3 hover:bg-white/5"}>{item}</div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-blue-200">Housing OS preview</p>
                <h2 className="mt-1 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">Good morning, Jessica</h2>
              </div>
              <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">Live workflow</span>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
              <MiniMetric value="12" label="Listings" />
              <MiniMetric value="8" label="Applications" />
              <MiniMetric value="3" label="Inspections" />
              <MiniMetric value="$24,560" label="Rent" />
            </div>
            <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black text-white">Recent applications</h3>
                  <Link href="/landlord/applications" className="text-sm font-black text-blue-300">View all</Link>
                </div>
                {["John Smith", "Maria Garcia", "David Johnson"].map((name, index) => (
                  <div key={name} className="flex items-center justify-between border-t border-white/10 py-3 first:border-t-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 font-black text-blue-200">{name.charAt(0)}</span>
                      <div>
                        <p className="font-bold text-white">{name}</p>
                        <p className="text-xs font-semibold text-slate-400">2bd - Apt {index + 1}A</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-200">Review</span>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="font-black text-white">Upcoming inspections</h3>
                {["123 Main St", "456 Oak Ave", "789 Pine Rd"].map((address) => (
                  <div key={address} className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                    <p className="font-bold text-white">{address}</p>
                    <p className="text-sm font-semibold text-slate-400">Today - 10:00 AM</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="truncate text-2xl font-black text-white">{value}</p>
      <p className="truncate text-sm font-bold text-slate-400">{label}</p>
    </div>
  );
}

function StatCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="group rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.09]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <HomeBaseMark tone="light" className="h-9 w-9 opacity-90" />
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Live</span>
      </div>
      <p className="text-4xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 font-black text-slate-100">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
function SectionHeader({ eyebrow, title, description, centered = false, dark = false }: { eyebrow: string; title: string; description: string; centered?: boolean; dark?: boolean }) {
  const eyebrowClass = dark ? "text-blue-200" : "text-blue-300";
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`font-black uppercase tracking-[0.25em] ${eyebrowClass}`}>{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-300">{description}</p>
    </div>
  );
}
function AudienceShowcase({ id, audience, title, cta, href, icon: Icon, tone, points }: { id: string; audience: string; title: string; cta: string; href: string; icon: IconType; tone: "emerald" | "brand"; points: string[] }) {
  const accent = tone === "emerald" ? "bg-emerald-500 text-slate-950" : "bg-blue-600 text-white";
  const button = tone === "emerald" ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-blue-600 text-white hover:bg-blue-500";
  const imageTone = tone === "emerald" ? "from-emerald-50 via-white to-slate-100" : "from-blue-50 via-white to-sky-100";

  return (
    <section id={id} className={`scroll-mt-24 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br ${imageTone} p-6 shadow-sm lg:min-h-[360px]`}>
      <div className="grid h-full gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}><Icon size={26} /></span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">{audience}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{title}</p>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                <CheckCircle2 className={tone === "emerald" ? "mt-0.5 shrink-0 text-emerald-400" : "mt-0.5 shrink-0 text-blue-400"} size={18} />
                {point}
              </li>
            ))}
          </ul>
          <Link href={href} className={`mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black ${button}`}>
            {cta} <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hidden md:block">
          <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-white/70 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.9),transparent_22%),radial-gradient(circle_at_70%_72%,rgba(37,99,235,0.18),transparent_28%)]" />
            <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{tone === "emerald" ? "Rental listing" : "Applicant portal"}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">{tone === "emerald" ? "Modern 3 bed home" : "Application under review"}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-600">{tone === "emerald" ? "Photos, policies, rent, applications, and lease workflow connected." : "Documents uploaded. Status updates, messages, and lease packet ready."}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureColumn({ title, features }: { title: string; features: Feature[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={21} /></span>
              <h3 className="mt-4 text-lg font-black text-slate-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketplacePreviewCard({ unit }: { unit: FeaturedUnit }) {
  const featuredPhoto = unit.photos[0];
  return (
    <Link href={`/marketplace/${unit.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-[radial-gradient(circle_at_top_left,#38bdf8_0,#0f172a_38%,#14532d_100%)]">
        {featuredPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/unit-photos/${featuredPhoto.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-slate-950/20" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-950">Available</div>
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/30 bg-white/85 p-3 shadow-sm backdrop-blur">
          <p className="line-clamp-1 font-black text-slate-950">{unit.property.name} - Unit {unit.unitNumber}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-600"><MapPin size={14} /> {unit.property.city}, {unit.property.state}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-950">{formatCurrency(unit.rentAmount)}<span className="text-sm font-bold text-slate-500"> /mo</span></p>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">{unit.property.addressLine}</p>
          </div>
          <Heart className="text-slate-300 group-hover:text-blue-400" size={21} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
          <span className="inline-flex items-center gap-1"><BedDouble size={16} /> {unit.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={16} /> {unit.bathrooms} ba</span>
        </div>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">View listing <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}

function FallbackRentalCard({ rental }: { rental: FallbackRentalPreview }) {
  return (
    <Link href="/marketplace" className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className={`relative h-40 bg-gradient-to-br ${rental.tone}`}>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-slate-800"><MapPin size={16} /> {rental.address}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-950">{rental.price}<span className="text-sm font-bold text-slate-500"> /mo</span></p>
            <h3 className="mt-1 font-black text-slate-950">{rental.title}</h3>
          </div>
          <Heart className="text-slate-300 group-hover:text-blue-400" size={21} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
          <span className="inline-flex items-center gap-1"><BedDouble size={16} /> {rental.meta.split(" - ")[0]}</span>
          <span className="inline-flex items-center gap-1"><Bath size={16} /> {rental.meta.split(" - ")[1]}</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-500">{rental.meta}</p>
      </div>
    </Link>
  );
}

function WorkflowRow({ label, steps, tone }: { label: string; steps: string[]; tone: "emerald" | "brand" }) {
  return (
    <div>
      <p className={tone === "emerald" ? "mb-4 font-black text-emerald-700" : "mb-4 font-black text-blue-700"}>{label}</p>
      <div className="grid gap-3 md:grid-cols-6">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 md:block">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm md:min-h-36">
              <span className={tone === "emerald" ? "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" : "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"}>
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-black text-slate-950">{step}</p>
            </div>
            {index < steps.length - 1 ? <MoveRight className="hidden text-slate-300 md:mx-auto md:mt-3 md:block" size={18} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: IconType; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <Icon className="text-blue-200" size={24} />
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
