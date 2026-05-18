export const dynamic = "force-dynamic";

import { BarChart3, Download, Gauge, RefreshCw } from "lucide-react";
import { captureAdminAnalyticsAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsMetric, OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import { getAdminAnalyticsMetrics, listRecentAnalyticsSnapshots } from "@/lib/admin-ops";
import { formatCurrency } from "@/lib/format";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams?: { snapshot?: string } }) {
  const [metrics, snapshots] = await Promise.all([getAdminAnalyticsMetrics(), listRecentAnalyticsSnapshots()]);
  const riskScore = metrics.securityEvents7 + metrics.pendingAccess + metrics.maintenanceOpen;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Analytics"
        title="Admin analytics hub"
        description="A compact operating view of growth, marketplace health, workflow load, security activity, and financial exposure."
      />
      {searchParams?.snapshot ? <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Analytics snapshot captured.</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric label="Active users" value={metrics.activeUsers} detail={`${metrics.landlords} landlords / ${metrics.applicants} renters`} />
        <OpsMetric label="Occupancy" value={`${metrics.occupancyRate}%`} detail={`${metrics.occupiedUnits} of ${metrics.units} active units`} tone={metrics.occupancyRate >= 90 ? "success" : "default"} />
        <OpsMetric label="Application velocity" value={`${metrics.applicationVelocity}%`} detail={`${metrics.applications30} apps / ${metrics.leads30} leads in 30 days`} />
        <OpsMetric label="Ledger exposure" value={formatCurrency(metrics.ledgerBalance)} detail="Open charges less payments" tone={metrics.ledgerBalance > 0 ? "warning" : "success"} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OpsPanel
          title="Operating load"
          eyebrow="Workflows"
          action={<form action={captureAdminAnalyticsAction}><button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700"><RefreshCw size={16} /> Capture</button></form>}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <OpsMetric label="Submitted apps" value={metrics.submittedApplications} detail="Submitted or under review" />
            <OpsMetric label="Open inspections" value={metrics.inspectionsOpen} detail="Scheduled, in progress, or reinspection" />
            <OpsMetric label="Open maintenance" value={metrics.maintenanceOpen} detail="Repairs requiring coordination" tone={metrics.maintenanceOpen > 10 ? "warning" : "default"} />
            <OpsMetric label="Open threads" value={metrics.threadsOpen} detail="Messaging threads not closed" />
            <OpsMetric label="Documents" value={metrics.documents} detail="Stored and tracked records" />
            <OpsMetric label="Risk index" value={riskScore} detail="Security + access + maintenance load" tone={riskScore > 20 ? "danger" : riskScore > 8 ? "warning" : "success"} />
          </div>
        </OpsPanel>

        <OpsPanel title="Export options" eyebrow="Business intelligence">
          <div className="space-y-3">
            <a href="/admin/system/export" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 hover:bg-white"><span className="inline-flex items-center gap-2"><Download size={16} /> Full JSON export</span><span>→</span></a>
            <a href="/admin/ledger/export" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 hover:bg-white"><span className="inline-flex items-center gap-2"><BarChart3 size={16} /> Ledger CSV</span><span>→</span></a>
            <a href="/admin/security/events" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 hover:bg-white"><span className="inline-flex items-center gap-2"><Gauge size={16} /> Security events</span><span>→</span></a>
          </div>
        </OpsPanel>
      </section>

      <OpsPanel title="Captured snapshots" eyebrow="Trend history">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Users</th><th className="px-4 py-3">Occupancy</th><th className="px-4 py-3">Captured</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {snapshots.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No snapshots captured yet.</td></tr> : snapshots.map((snapshot) => {
                const m = snapshot.metrics as any;
                return <tr key={snapshot.id}><td className="px-4 py-3 font-bold">{snapshot.period}</td><td className="px-4 py-3">{snapshot.periodKey}</td><td className="px-4 py-3">{m.activeUsers ?? "—"}</td><td className="px-4 py-3">{m.occupancyRate ?? "—"}%</td><td className="px-4 py-3 text-slate-600">{snapshot.createdAt.toLocaleString()}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </main>
  );
}
