export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Gauge, Route, ShieldAlert, Sparkles, TestTube2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsMetric, OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import { getWorkflowReadinessSummary, workflowReadinessItems, type WorkflowReadinessStatus } from "@/lib/workflow-readiness";

function statusClass(status: WorkflowReadinessStatus) {
  if (status === "PROVEN") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "COVERED") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (status === "BASIC") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-rose-50 text-rose-800 ring-rose-200";
}

function scoreClass(score: number) {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-blue-700";
  if (score >= 55) return "text-amber-700";
  return "text-rose-700";
}

export default function AdminWorkflowReadinessPage() {
  const summary = getWorkflowReadinessSummary();

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Workflow readiness"
        title="Platform workflow readiness center"
        description="See which end-to-end product promises are proven, which are covered but still need polish, and which areas should drive the next major update."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OpsMetric label="Average readiness" value={`${summary.averageScore}%`} detail="Across core workflows" tone={summary.averageScore >= 85 ? "success" : summary.averageScore >= 70 ? "default" : "warning"} />
        <OpsMetric label="Proven workflows" value={summary.proven} detail="Covered by E2E or static gates" tone="success" />
        <OpsMetric label="Covered workflows" value={summary.covered} detail="Usable, needs more depth" />
        <OpsMetric label="Basic or below" value={summary.basicOrBelow} detail="Needs product investment" tone={summary.basicOrBelow > 0 ? "warning" : "success"} />
        <OpsMetric label="Workflow catalog" value={summary.total} detail="Tracked operating promises" />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <OpsPanel title="Readiness map" eyebrow="Core operating promises">
          <div className="grid gap-3">
            {workflowReadinessItems.map((item) => (
              <article key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${statusClass(item.status)}`}>{item.status.replace("_", " ")}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{item.owner}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-950">{item.title}</h2>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{item.userPromise}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-right ring-1 ring-slate-200">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Score</p>
                    <p className={`text-3xl font-black ${scoreClass(item.score)}`}>{item.score}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><TestTube2 size={14} /> Proven by</div>
                    <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                      {item.provenBy.map((proof) => <li key={proof}>- {proof}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Route size={14} /> Main routes</div>
                    <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                      {item.mainRoutes.map((route) => <li key={route} className="font-mono">{route}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><ShieldAlert size={14} /> Known gaps</div>
                    <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                      {item.knownGaps.map((gap) => <li key={gap}>- {gap}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-brand-700">Next best update</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{item.nextBestUpdate}</p>
                  </div>
                  <ArrowRight size={18} className="text-brand-600" />
                </div>
              </article>
            ))}
          </div>
        </OpsPanel>

        <div className="space-y-5">
          <OpsPanel title="Recommended sequence" eyebrow="Next work">
            <div className="space-y-3">
              {summary.nextUpdates.map((item, index) => (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-brand-700 ring-1 ring-slate-200">{index + 1}</span>
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.nextBestUpdate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </OpsPanel>

          <OpsPanel title="Release controls" eyebrow="Verification">
            <div className="space-y-3">
              <Link href="/admin/operations" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-900 hover:border-brand-200 hover:bg-white">
                <span className="inline-flex items-center gap-2"><Gauge size={17} /> Operations control center</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/admin/backups" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-900 hover:border-brand-200 hover:bg-white">
                <span className="inline-flex items-center gap-2"><ClipboardList size={17} /> Data import/export checks</span>
                <ArrowRight size={16} />
              </Link>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="mt-0.5 text-emerald-700" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Every major update should move a score</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">Use this page as the product compass: ship features when they make a workflow more proven, simpler, faster, or safer.</p>
                  </div>
                </div>
              </div>
            </div>
          </OpsPanel>

          <OpsPanel title="Maturity legend" eyebrow="How to read it">
            <div className="grid gap-2 text-xs font-semibold leading-5 text-slate-600">
              <p><span className="font-black text-emerald-700">Proven</span> means the workflow has deterministic seed data and a browser or static gate.</p>
              <p><span className="font-black text-blue-700">Covered</span> means the surface is usable but needs more scenario depth.</p>
              <p><span className="font-black text-amber-700">Basic</span> means the module exists but the day-to-day loop is still thin.</p>
              <p><span className="font-black text-rose-700">Underdeveloped</span> means the platform needs focused product work before depending on that workflow operationally.</p>
            </div>
          </OpsPanel>

          <OpsPanel title="Product principle" eyebrow="Coherence">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="mt-0.5 text-brand-200" />
                <p className="text-sm font-bold leading-6 text-slate-200">A workflow is only ready when the user can start it, finish it, recover from common mistakes, and understand what changed afterward.</p>
              </div>
            </div>
          </OpsPanel>
        </div>
      </section>
    </main>
  );
}
