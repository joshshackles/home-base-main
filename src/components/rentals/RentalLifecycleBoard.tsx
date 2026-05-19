import Link from "next/link";
import { ArrowRight, CircleDot, Gauge, Home, Wrench } from "lucide-react";
import { lifecycleLabel, lifecycleLane, rentalLifecycleEngineSteps, summarizeLifecycleRecommendations, type RentalLifecycleRecommendation } from "@/lib/rental-lifecycle-engine";

export type RentalLifecycleBoardItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  publicHref?: string;
  editHref?: string;
  leadsHref?: string;
  applicationsHref?: string;
  leasesHref?: string;
  ledgerHref?: string;
  maintenanceHref?: string;
  noticesHref?: string;
  documentsHref?: string;
  inspectionsHref?: string;
  calendarHref?: string;
  inboxHref?: string;
  recommendation: RentalLifecycleRecommendation;
};

function statusTone(score: number) {
  if (score >= 90) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (score >= 80) return "bg-blue-50 text-blue-800 ring-blue-200";
  if (score >= 70) return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-rose-50 text-rose-800 ring-rose-200";
}

function actionHref(item: RentalLifecycleBoardItem, href: string) {
  if (href === "public") return item.publicHref ?? item.href;
  if (href === "edit") return item.editHref ?? item.href;
  if (href === "leads") return item.leadsHref ?? item.href;
  if (href === "applications") return item.applicationsHref ?? item.href;
  if (href === "leases") return item.leasesHref ?? item.href;
  if (href === "ledger") return item.ledgerHref ?? item.href;
  if (href === "maintenance") return item.maintenanceHref ?? item.href;
  if (href === "notices") return item.noticesHref ?? item.href;
  if (href === "documents") return item.documentsHref ?? item.href;
  if (href === "inspections") return item.inspectionsHref ?? item.href;
  if (href === "calendar") return item.calendarHref ?? item.href;
  if (href === "inbox") return item.inboxHref ?? item.href;
  if (href === "photos") return `${item.href}#photos`;
  return item.href;
}

export function RentalLifecycleBoard({ title, description, items }: { title: string; description: string; items: RentalLifecycleBoardItem[] }) {
  const summary = summarizeLifecycleRecommendations(items.map((item) => item.recommendation));

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-200">Lifecycle engine</p>
        <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">{description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Rentals" value={summary.total} />
            <Metric label="Occupied" value={summary.occupied} />
            <Metric label="Market-ready" value={summary.ready} />
            <Metric label="Attention" value={summary.needsAttention} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-black text-slate-950">Lifecycle lanes</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">A rental moves through one operating model from listing to tenancy to turnover.</p>
        </div>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-6">
          {["Setup", "Market", "Lease", "Resident", "Exit", "Hold"].map((lane) => {
            const laneSteps = rentalLifecycleEngineSteps.filter((step) => step.lane === lane);
            const laneCount = summary.byStatus.filter((step) => step.lane === lane).reduce((sum, step) => sum + step.count, 0);
            return (
              <div key={lane} className="border-b border-slate-100 p-4 xl:border-b-0 xl:border-r xl:last:border-r-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{lane}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{laneCount}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {laneSteps.map((step) => (
                    <div key={step.status} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-slate-950">{step.label}</p>
                        <span className="text-xs font-black text-brand-700">{summary.byStatus.find((item) => item.status === step.status)?.count ?? 0}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
            <Home className="mx-auto text-slate-400" size={30} />
            <h2 className="mt-3 text-xl font-black text-slate-950">No rentals in this lifecycle view</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Add a rental to start tracking setup, marketing, leasing, resident, and turnover states.</p>
          </div>
        ) : items.map((item) => (
          <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${statusTone(item.recommendation.confidence)}`}>{lifecycleLabel(item.recommendation.status)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">{lifecycleLane(item.recommendation.status)}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{item.recommendation.confidence}% confidence</span>
                </div>
                <h2 className="mt-3 text-xl font-black text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.subtitle}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{item.recommendation.reason}</p>
              </div>
              <Link href={item.href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
                Open rental <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><CircleDot size={14} /> Signals</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.recommendation.signals.map((signal) => <span key={signal} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{signal}</span>)}
                  {item.recommendation.signals.length === 0 ? <span className="text-sm font-semibold text-slate-500">No workflow signals yet.</span> : null}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Wrench size={14} /> Next actions</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.recommendation.nextActions.map((action) => (
                    <Link key={`${item.id}-${action.label}`} href={actionHref(item, action.href)} className={`rounded-xl px-3 py-2 text-xs font-black ${action.tone === "primary" ? "bg-brand-600 text-white" : action.tone === "warning" ? "bg-amber-100 text-amber-900" : action.tone === "danger" ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-100"><Gauge size={13} /> {label}</div>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
