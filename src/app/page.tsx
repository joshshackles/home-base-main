import Link from "next/link";
import { UnitStatus } from "@prisma/client";
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
  Home,
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
  { price: "$1,650", title: "Sunny 2 bed near downtown", meta: "2 bd - 1 ba - 850 sqft", address: "123 Main St, Apt 3B", tone: "from-emerald-100 via-white to-brand-100" },
  { price: "$1,950", title: "Renovated townhome", meta: "3 bd - 2 ba - 1,200 sqft", address: "456 Oak Ave, Apt 2A", tone: "from-sky-100 via-white to-indigo-100" },
  { price: "$2,100", title: "Family home with yard", meta: "3 bd - 2.5 ba - 1,450 sqft", address: "789 Pine Rd, Apt 1C", tone: "from-amber-100 via-white to-emerald-100" },
  { price: "$1,750", title: "Loft-style apartment", meta: "2 bd - 1 ba - 950 sqft", address: "321 Elm St, Apt 5D", tone: "from-slate-100 via-white to-blue-100" }
];

const landlordSteps = ["List property", "Get leads", "Review applications", "Inspect", "Send lease", "Welcome tenant"];
const tenantSteps = ["Find a home", "Apply online", "Track status", "Get approved", "Sign lease", "Move in"];

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
  const featuredUnits = await getFeaturedUnits();
  const hasLiveMarketplace = featuredUnits.length > 0;

  return (
    <main id="main-content" className="overflow-hidden bg-white">
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-brand-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_70%_20%,rgba(37,99,235,0.14),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-10 hidden items-center justify-between gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:flex">
            <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm"><Home size={20} /></span>
              <span className="leading-tight">HomeBase<br /><span className="text-xs font-bold text-slate-500">Rental Management Simplified</span></span>
            </Link>
            <nav aria-label="Homepage sections" className="flex items-center gap-1 text-sm font-black text-slate-700">
              <a href="#landlords" className="inline-flex items-center gap-1 rounded-full px-4 py-2 hover:bg-slate-100 hover:text-slate-950">For Landlords <ChevronDown size={14} /></a>
              <a href="#tenants" className="inline-flex items-center gap-1 rounded-full px-4 py-2 hover:bg-slate-100 hover:text-slate-950">For Tenants <ChevronDown size={14} /></a>
              <a href="#marketplace" className="rounded-full px-4 py-2 hover:bg-slate-100 hover:text-slate-950">Marketplace</a>
              <a href="#workflow" className="rounded-full px-4 py-2 hover:bg-slate-100 hover:text-slate-950">Workflow</a>
              <a href="#trust" className="rounded-full px-4 py-2 hover:bg-slate-100 hover:text-slate-950">Trust</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-2xl border border-brand-200 bg-white px-4 py-2 text-sm font-black text-brand-700 hover:bg-brand-50">Sign In</Link>
              <Link href="/signup" className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-brand-700">Get Started</Link>
            </div>
          </div>

          <div className="grid gap-12 pb-16 pt-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-brand-700 shadow-sm ring-1 ring-brand-100">
                <Sparkles size={16} /> Public listings plus a complete rental workflow
              </p>
              <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                The rental workflow platform for <span className="text-emerald-600">landlords</span> and <span className="text-brand-600">tenants</span>.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                List properties, find homes, collect applications, run inspections, send leases, track documents, and keep the entire housing journey organized in one modern HomeBase account.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Link href="/signup?intent=landlord" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700">
                  List a Rental <ArrowRight size={18} />
                </Link>
                <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700">
                  Find a Home <Search size={18} />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black text-slate-950 hover:bg-slate-50">
                  Sign In
                </Link>
              </div>
              <Link href="#marketplace" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-brand-700 hover:text-brand-900">
                Explore the marketplace <ArrowRight size={16} />
              </Link>
              <div className="mt-7 flex flex-wrap gap-4 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-600" /> Public listings</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-600" /> Applicant portal</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-600" /> Lease workflow</span>
              </div>
            </div>

            <HeroDashboard />
          </div>
        </div>
      </section>

      <section className="bg-white py-8" aria-label="Quick stats">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <StatCard value={hasLiveMarketplace ? `${featuredUnits.length}+` : "12"} label="Active listings" detail="Publish units and keep rental inventory current." />
          <StatCard value="8" label="Applications" detail="Track started, submitted, review, and approval states." />
          <StatCard value="3" label="Inspections today" detail="Coordinate repair, move-in, and turnover tasks." />
          <StatCard value="$24k" label="Rent collected" detail="Keep property activity visible across your team." />
        </div>
      </section>

      <section className="bg-white pb-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <AudienceShowcase id="landlords" audience="For Landlords" title="Everything you need to manage rentals and grow your business." cta="Create Landlord Account" href="/signup?intent=landlord" icon={Building2} tone="emerald" points={["Publish unlimited listings", "Collect and screen applications", "Schedule inspections", "Send leases for e-signature", "Track rent and ledger activity", "Communicate with tenants"]} />
          <AudienceShowcase id="tenants" audience="For Tenants" title="A simple, transparent way to find a home and manage your housing journey." cta="Create Applicant Account" href="/signup" icon={UserRound} tone="brand" points={["Browse available rentals", "Apply online in minutes", "Upload and manage documents", "Track application status", "Sign leases securely", "Manage your tenant account"]} />
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FeatureColumn title="Landlord command center" features={landlordFeatures} />
          <FeatureColumn title="Tenant/applicant portal" features={tenantFeatures} />
        </div>
      </section>

      <section id="marketplace" className="scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeader eyebrow="Find your next home" title="A real marketplace view, connected to the application flow." description="Renters can search live listings, review details, save favorites, and move directly into the inquiry or application process." />
            <Link href="/marketplace" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-black text-white hover:bg-brand-700">
              Browse all rentals <ArrowRight size={18} />
            </Link>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl">
            <form action="/marketplace" className="grid gap-3 rounded-3xl bg-slate-50 p-3 md:grid-cols-[1fr_0.65fr_0.65fr_auto]">
              <label className="relative">
                <span className="sr-only">Search rentals</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="q" placeholder="Search city, property, pets, accessibility..." className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-semibold text-slate-950 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </label>
              <input name="city" placeholder="City" className="h-14 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              <select name="bedrooms" className="h-14 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-950 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" defaultValue="">
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

      <section id="workflow" className="scroll-mt-24 bg-white py-16">
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

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-brand-700">Tools that help landlords succeed</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Everything important gets a real place to live.</h2>
            <p className="mt-4 leading-7 text-slate-600">A polished homepage should make the product feel complete without overwhelming new visitors. This grid gives prospects a fast mental map of the system.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Listings & marketing", "Applications & screening", "Messaging & communication", "Inspections & maintenance", "Documents & e-signature", "Rent ledger & reports", "Tenant management", "Applicant portal", "Admin controls"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900">
                <CheckCircle2 className="mb-3 text-brand-600" size={20} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
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
                <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-700">Live tenant journey</p>
                {tenantSteps.slice(0, 4).map((step, index) => (
                  <div key={step} className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 font-black text-brand-700">{index + 1}</span>
                    <span className="font-black text-slate-900">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-4xl font-black tracking-tight">Ready to simplify renting?</h2>
            <p className="mt-2 text-brand-50">Join landlords, applicants, and tenants using HomeBase to move faster with less confusion.</p>
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
    <div className="mx-auto w-full max-w-[760px] rounded-[2rem] border border-white bg-white/80 p-2 shadow-2xl shadow-slate-200 backdrop-blur">
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
        <div className="grid min-w-0 lg:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-slate-50 p-5 lg:block">
            <div className="flex items-center gap-2 text-base font-black text-slate-950"><Home className="text-brand-600" size={19} /> HomeBase</div>
            <div className="mt-7 space-y-2 text-sm font-black text-slate-500">
              {["Dashboard", "Listings", "Applications", "Inspections", "Leases", "Messages", "Ledger"].map((item, index) => (
                <div key={item} className={index === 0 ? "rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-sm" : "rounded-2xl px-4 py-3"}>{item}</div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-500">Dashboard preview</p>
                <h2 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">Good morning, Jessica</h2>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">Live workflow</span>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
              <MiniMetric value="12" label="Listings" />
              <MiniMetric value="8" label="Applications" />
              <MiniMetric value="3" label="Inspections" />
              <MiniMetric value="$24,560" label="Rent" />
            </div>
            <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black text-slate-950">Recent applications</h3>
                  <Link href="/landlord/applications" className="text-sm font-black text-brand-700">View all</Link>
                </div>
                {["John Smith", "Maria Garcia", "David Johnson"].map((name, index) => (
                  <div key={name} className="flex items-center justify-between border-t border-slate-100 py-3 first:border-t-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700">{name.charAt(0)}</span>
                      <div>
                        <p className="font-bold text-slate-950">{name}</p>
                        <p className="text-xs font-semibold text-slate-500">2bd - Apt {index + 1}A</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Under review</span>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-950">Upcoming inspections</h3>
                {["123 Main St", "456 Oak Ave", "789 Pine Rd"].map((address) => (
                  <div key={address} className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-950">{address}</p>
                    <p className="text-sm font-semibold text-slate-500">Today - 10:00 AM</p>
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="truncate text-2xl font-black text-slate-950">{value}</p>
      <p className="truncate text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

function StatCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-4xl font-black text-slate-950">{value}</p>
      <p className="mt-2 font-black text-slate-800">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, centered = false, dark = false }: { eyebrow: string; title: string; description: string; centered?: boolean; dark?: boolean }) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={dark ? "font-black uppercase tracking-[0.25em] text-brand-200" : "font-black uppercase tracking-[0.25em] text-brand-700"}>{eyebrow}</p>
      <h2 className={dark ? "mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl" : "mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl"}>{title}</h2>
      <p className={dark ? "mt-4 text-lg leading-8 text-slate-300" : "mt-4 text-lg leading-8 text-slate-600"}>{description}</p>
    </div>
  );
}

function AudienceShowcase({ id, audience, title, cta, href, icon: Icon, tone, points }: { id: string; audience: string; title: string; cta: string; href: string; icon: IconType; tone: "emerald" | "brand"; points: string[] }) {
  const accent = tone === "emerald" ? "bg-emerald-600 text-white" : "bg-brand-600 text-white";
  const button = tone === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:bg-brand-700";
  const imageTone = tone === "emerald" ? "from-emerald-50 via-white to-slate-100" : "from-brand-50 via-white to-sky-100";

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
                <CheckCircle2 className={tone === "emerald" ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-brand-600"} size={18} />
                {point}
              </li>
            ))}
          </ul>
          <Link href={href} className={`mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black text-white ${button}`}>
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
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon size={21} /></span>
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
          <Heart className="text-slate-300 group-hover:text-brand-600" size={21} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
          <span className="inline-flex items-center gap-1"><BedDouble size={16} /> {unit.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={16} /> {unit.bathrooms} ba</span>
        </div>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-brand-700">View listing <ArrowRight size={15} /></span>
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
          <Heart className="text-slate-300 group-hover:text-brand-600" size={21} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
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
      <p className={tone === "emerald" ? "mb-4 font-black text-emerald-700" : "mb-4 font-black text-brand-700"}>{label}</p>
      <div className="grid gap-3 md:grid-cols-6">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 md:block">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm md:min-h-36">
              <span className={tone === "emerald" ? "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" : "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"}>
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
      <Icon className="text-brand-200" size={24} />
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
