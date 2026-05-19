export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { LeaseTemplateEditor } from "@/components/leases/LeaseTemplateEditor";
import { getLandlordLeaseTemplateDetail, extractLeaseTemplateTokens, humanizeTemplateKind, getLeaseTemplateQuality } from "@/lib/lease-templates";
import { updateLandlordLeaseTemplate } from "@/app/landlord/lease-templates/actions";

export default async function LandlordLeaseTemplateDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord/lease-templates");
  const template = await getLandlordLeaseTemplateDetail(user.userId, params.id);
  if (!template) notFound();
  const tokens = extractLeaseTemplateTokens(template.body);
  const quality = getLeaseTemplateQuality(template);
  const canEdit = template.ownerUserId === user.userId;
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-brand-200">Template preview</p><h1 className="mt-2 text-3xl font-black">{template.name}</h1><p className="mt-2 max-w-3xl text-sm text-slate-300">{template.description || "Reusable lease language for future packets."}</p></div>
        <Link href="/landlord/lease-templates" className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">Back to library</Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{humanizeTemplateKind(template.kind)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{template.jurisdictionState || "All states"}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{quality}% quality</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{template.scope}</span>
          </div>
          <pre className="mt-5 max-h-[760px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">{template.body}</pre>
        </section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Smart tokens</p><div className="mt-3 flex flex-wrap gap-2">{tokens.length ? tokens.map((token) => <code key={token} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{token}</code>) : <p className="text-sm text-slate-600">No smart tokens found.</p>}</div></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Usage</p><p className="mt-1 text-2xl font-black text-slate-950">{template.packetCount}</p><p className="text-sm text-slate-600">lease packets generated</p></div>
          {canEdit ? <LeaseTemplateEditor action={updateLandlordLeaseTemplate} template={template} title="Edit template" submitLabel="Save changes" /> : <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">System templates are read-only. Create a landlord template from the library if you need custom language.</div>}
        </aside>
      </div>
    </main>
  );
}
