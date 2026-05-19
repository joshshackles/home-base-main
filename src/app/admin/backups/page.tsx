export const dynamic = "force-dynamic";

import { DatabaseBackup, Download, RotateCcw, ShieldCheck } from "lucide-react";
import { importDataSnapshotAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsLinkCard, OpsMetric, OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import { listRecentBackups } from "@/lib/admin-ops";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminBackupsPage({ searchParams }: { searchParams?: { imported?: string } }) {
  const backups = await listRecentBackups();
  const latest = backups[0];
  const generated = backups.filter((backup) => backup.status === "GENERATED" || backup.status === "DOWNLOADED").length;
  const restores = backups.filter((backup) => backup.restoredAt).length;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Recovery"
        title="Backup & recovery center"
        description="Create portable JSON backups, track backup manifests, validate recovery imports, and keep administrative recovery actions visible in audit logs."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <OpsMetric label="Backup manifests" value={backups.length} detail="Recent generated/exported snapshots" />
        <OpsMetric label="Ready exports" value={generated} detail="Generated or downloaded" tone="success" />
        <OpsMetric label="Restores tracked" value={restores} detail="Imports tied to backup operations" tone={restores > 0 ? "warning" : "default"} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OpsPanel
          title="Create a backup"
          eyebrow="Portable export"
          action={<a href="/admin/backups/export" className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700"><Download size={16} /> Download JSON</a>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <OpsLinkCard href="/admin/backups/export?label=Pre-deployment%20backup" title="Pre-deployment backup" detail="Generate a new snapshot before applying migrations or feature releases." icon={<DatabaseBackup size={18} />} />
            <OpsLinkCard href="/admin/system/sample-data" title="Sample recovery file" detail="Download a sample payload to test recovery formatting in staging." icon={<ShieldCheck size={18} />} />
            <OpsLinkCard href="/admin/audit" title="Audit recovery actions" detail="Review who exported or imported data and when it happened." icon={<RotateCcw size={18} />} />
          </div>
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">For large production datasets, use this manifest as the admin UI workflow and pair it with database-native backups from Neon/Postgres plus object-storage lifecycle backups.</p>
        </OpsPanel>

        <OpsPanel title="Restore from JSON" eyebrow="Careful operation">
          {searchParams?.imported ? <p className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Imported {searchParams.imported} records.</p> : null}
          <form action={importDataSnapshotAction} encType="multipart/form-data" className="space-y-3">
            <input name="backupId" defaultValue={latest?.id ?? ""} type="hidden" />
            <input name="redirectTo" value="/admin/backups" type="hidden" />
            <input name="file" type="file" accept="application/json,.json" required className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
            <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Import recovery JSON</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">Imports are upsert-based and do not delete records missing from the file. Test in staging before production recovery.</p>
        </OpsPanel>
      </section>

      <OpsPanel title="Recent backup manifests" eyebrow="History">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Label</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Checksum</th><th className="px-4 py-3">Created</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {backups.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No backup manifests yet. Generate your first backup above.</td></tr> : backups.map((backup) => (
                <tr key={backup.id} className="align-top">
                  <td className="px-4 py-3 font-bold text-slate-950">{backup.label}<p className="text-xs font-semibold text-slate-500">{backup.requestedByEmail || "System"}</p></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{backup.status}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatBytes(backup.sizeBytes)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-500">{backup.checksum || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{backup.createdAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </main>
  );
}
