export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LeaseTemplateEditor } from "@/components/leases/LeaseTemplateEditor";
import { LeaseTemplateLibrary } from "@/components/leases/LeaseTemplateLibrary";
import { createLandlordLeaseTemplate } from "@/app/landlord/lease-templates/actions";
import { getLandlordLeaseTemplateLibrary } from "@/lib/lease-templates";
import { DEFAULT_LEASE_TEMPLATE_BODY } from "@/lib/lease-render";

export default async function LandlordLeaseTemplatesPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/lease-templates");
  const { templates, metrics } = await getLandlordLeaseTemplateLibrary(user.userId);
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-200">Lease template library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Reusable lease packets, clauses, and addendums</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Create landlord-owned templates while still using HomeBase system templates for standard residential, renewal, and addendum workflows.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/landlord/leases" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Lease packets</Link>
        <Link href="/landlord/documents" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Documents</Link>
      </div>
      <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <LeaseTemplateEditor action={createLandlordLeaseTemplate} title="Create landlord template" submitLabel="Create template" template={{ body: DEFAULT_LEASE_TEMPLATE_BODY, isActive: true }} />
        <LeaseTemplateLibrary templates={templates} metrics={metrics} baseHref="/landlord/lease-templates" canManage />
      </section>
    </main>
  );
}
