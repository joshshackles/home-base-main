export const dynamic = "force-dynamic";

import Link from "next/link";
import { createLeaseTemplate } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeaseTemplateEditor } from "@/components/leases/LeaseTemplateEditor";
import { LeaseTemplateLibrary } from "@/components/leases/LeaseTemplateLibrary";
import { getAdminLeaseTemplateLibrary } from "@/lib/lease-templates";
import { DEFAULT_LEASE_TEMPLATE_BODY } from "@/lib/lease-render";

export default async function AdminLeaseTemplatesPage() {
  const { templates, metrics } = await getAdminLeaseTemplateLibrary();
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader title="Lease template library" description="Manage reusable lease templates, standard clauses, renewal packets, addendums, and jurisdiction-aware language used by lease packets." actionHref="/admin/leases" actionLabel="Back to leases" />
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/leases/templates" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Classic editor</Link>
        <Link href="/landlord/lease-templates" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Landlord view</Link>
      </div>
      <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <LeaseTemplateEditor action={createLeaseTemplate} title="Create system template" submitLabel="Create system template" template={{ body: DEFAULT_LEASE_TEMPLATE_BODY, isActive: true }} />
        <LeaseTemplateLibrary templates={templates} metrics={metrics} baseHref="/admin/lease-templates" canManage />
      </section>
    </main>
  );
}
