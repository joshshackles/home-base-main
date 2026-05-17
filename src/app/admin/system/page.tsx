import { CheckCircle2, ServerCog, TriangleAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";
import { getEnvironmentWarnings } from "@/lib/env";

export default async function SystemStatusPage() {
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
    { label: "Upload storage", ok: Boolean(process.env.DOCUMENT_UPLOAD_DIR), detail: process.env.DOCUMENT_UPLOAD_DIR ? process.env.DOCUMENT_UPLOAD_DIR : "Using local storage/documents fallback." },
    { label: "App version", ok: true, detail: "HomeBase MLS v2.6.0" },
    { label: "Email provider", ok: true, detail: process.env.EMAIL_PROVIDER || "console" },
    { label: "Migration baseline", ok: true, detail: "Baseline through v2.4.0 migrations are included. v2.5.0 and v2.6.0 do not require schema changes." }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="System"
        title="System Status"
        description="Run a quick production-readiness check for database access, environment variables, upload storage, and app version."
      />

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
npm run typecheck
npm run build`}</code></pre>
      </div>
    </main>
  );
}
