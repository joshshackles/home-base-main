export const dynamic = "force-dynamic";

import Link from "next/link";
import { Activity, BarChart3, CheckCircle2, DatabaseBackup, FileText, Palette, ServerCog, ShieldCheck, TriangleAlert } from "lucide-react";
import { importDataSnapshotAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";
import { getEnvironmentWarnings } from "@/lib/env";
import { APP_RELEASE_LABEL, APP_VERSION } from "@/lib/app-version";

export default async function SystemStatusPage({ searchParams }: { searchParams?: { imported?: string } }) {
  const warnings = getEnvironmentWarnings();
  let databaseOk = true;
  let databaseMessage = "Database connection is responding.";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseOk = false;
    databaseMessage = error instanceof Error ? error.message : "Database connection failed.";
  }

  const checks = [
    { label: "Database", ok: databaseOk, detail: databaseMessage },
    { label: "Environment", ok: warnings.length === 0, detail: warnings.length === 0 ? "Required environment settings are present." : warnings.join(" ") },
    { label: "Document storage", ok: warnings.every((warning) => !warning.includes("DOCUMENT_STORAGE_PROVIDER") && !warning.includes("DOCUMENT_S3_")), detail: `Provider: ${process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")}${process.env.DOCUMENT_S3_BUCKET ? ` / Bucket: ${process.env.DOCUMENT_S3_BUCKET}` : ""}` },
    { label: "App version", ok: true, detail: APP_RELEASE_LABEL },
    { label: "Email provider", ok: true, detail: process.env.EMAIL_PROVIDER || "console" },
    { label: "Migration baseline", ok: true, detail: "Baseline and hardening migrations through the current package version are included. Run npm run migrations:check before deployment." },
    { label: "Sample data guard", ok: process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_DATA_IN_PRODUCTION === "true", detail: process.env.NODE_ENV === "production" ? "Production seeding is blocked unless ALLOW_SAMPLE_DATA_IN_PRODUCTION=true is intentionally set for a demo/sandbox environment." : "Seed data is available for local and staging workflow proof." }
  ];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="System"
        title="System Status"
        description="Run a quick production-readiness check for database access, environment variables, upload storage, and app version."
      />


      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/branding" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <Palette className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Branding studio</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Control logo text, public copy, colors, launch toggles, and identity settings.</p>
        </Link>
        <Link href="/admin/backups" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <DatabaseBackup className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Backup & recovery</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Generate JSON exports, track manifests, checksums, and recovery imports.</p>
        </Link>
        <Link href="/admin/analytics" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <BarChart3 className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Analytics hub</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Review operating KPIs, workflow load, transparent operational risk, and captured snapshots.</p>
        </Link>
        <Link href="/admin/operations" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <Activity className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Operations center</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Monitor readiness, alerts, queue jobs, automation scaffolds, and health snapshots.</p>
        </Link>
        <Link href="/admin/workflow-proof" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <ShieldCheck className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Workflow proof</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Review tenant repair, vendor, invoice, inspection, and reinspection launch proof.</p>
        </Link>
        <Link href="/admin/operations" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:bg-slate-50">
          <FileText className="text-brand-700" size={24} />
          <h2 className="mt-3 text-lg font-black text-slate-950">Production runbook</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Use the runbook in docs with operations center checks for deployment, incident, rollback, backup, seed safety, and final QA.</p>
        </Link>
      </section>

      <div className="grid gap-4">
        {checks.map((check) => (
          <div key={check.label} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${check.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {check.ok ? <CheckCircle2 size={24} /> : <TriangleAlert size={24} />}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">{check.label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Export site data</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Download a JSON snapshot of users, access requests, properties, units, leads, applications, documents, inspections, maintenance, messages, leases, ledger records, audit logs, and security events.</p>
          <a href="/admin/system/export" className="mt-5 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Export JSON</a>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Import site data</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Upload a HomeBase JSON snapshot to create or update records by ID. Existing matching IDs are updated; new IDs are inserted.</p>
          <a href="/admin/system/sample-data" className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">Download Sample Data</a>
          {searchParams?.imported ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Imported {searchParams.imported} records.</p> : null}
          <form action={importDataSnapshotAction} encType="multipart/form-data" className="mt-5 space-y-4">
            <input name="file" type="file" accept="application/json,.json" required className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Import JSON</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">Use this carefully on production. Import is additive/update-based and does not delete records that are missing from the file.</p>
        </div>
      </section>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <ServerCog size={24} />
          <h2 className="text-xl font-black">Recommended local checks</h2>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm"><code>{`npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run preflight
npm run routes:check
npm run storage:verify
npm run seed:verify
npm run workflow:verify
npm run security:verify
npm run update12:verify
npm run final-readiness:verify
npm run typecheck
npm run build`}</code></pre>
      </div>
    </main>
  );
}
