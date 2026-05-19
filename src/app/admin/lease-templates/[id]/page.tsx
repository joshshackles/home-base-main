export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminLeaseTemplateLibrary, extractLeaseTemplateTokens, humanizeTemplateKind, getLeaseTemplateQuality } from "@/lib/lease-templates";

export default async function AdminLeaseTemplateDetailPage({ params }: { params: { id: string } }) {
  const { templates } = await getAdminLeaseTemplateLibrary();
  const template = templates.find((item) => item.id === params.id);
  if (!template) notFound();
  const tokens = extractLeaseTemplateTokens(template.body);
  const quality = getLeaseTemplateQuality(template);
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader title={template.name} description="Preview lease language, token coverage, quality readiness, and usage before applying this template to approved applications." actionHref="/admin/lease-templates" actionLabel="Template library" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{humanizeTemplateKind(template.kind)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{template.jurisdictionState || "All states"}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{quality}% quality</span>
          </div>
          <pre className="mt-5 max-h-[760px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">{template.body}</pre>
        </section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Scope</p><p className="mt-1 text-lg font-black text-slate-950">{template.scope}</p><p className="mt-1 text-sm text-slate-600">Owner: {template.ownerName}</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Tokens</p><div className="mt-3 flex flex-wrap gap-2">{tokens.length ? tokens.map((token) => <code key={token} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{token}</code>) : <p className="text-sm text-slate-600">No smart tokens found.</p>}</div></div>
          <Link href="/admin/leases" className="block rounded-2xl bg-brand-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-brand-700">Use in lease builder</Link>
        </aside>
      </div>
    </main>
  );
}
