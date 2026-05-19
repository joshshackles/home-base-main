import Link from "next/link";
import type { LeaseTemplateSummary } from "@/lib/lease-templates";
import { getLeaseTemplateQuality, humanizeTemplateKind } from "@/lib/lease-templates";

function badgeClass(active: boolean) {
  return active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600";
}

export function LeaseTemplateLibrary({
  templates,
  metrics,
  baseHref,
  canManage = false
}: {
  templates: LeaseTemplateSummary[];
  metrics: Record<string, number>;
  baseHref: string;
  canManage?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{key.replace(/[A-Z]/g, " $&")}</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Template library</h2>
            <p className="mt-1 text-sm text-slate-600">Reusable clauses, state-aware packet bodies, renewal language, and addendum-ready lease templates.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{templates.length} templates</span>
        </div>
        <div className="divide-y divide-slate-200">
          {templates.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No lease templates have been created yet.</div>
          ) : templates.map((template) => {
            const quality = getLeaseTemplateQuality(template);
            return (
              <article key={template.id} className="grid gap-4 p-4 hover:bg-slate-50 lg:grid-cols-[1fr_180px_160px_140px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-950">{template.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${badgeClass(template.isActive)}`}>{template.isActive ? "Active" : "Inactive"}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase text-blue-700">{humanizeTemplateKind(template.kind)}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">{template.scope === "SYSTEM" ? "System" : "Landlord"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{template.description || "No description provided."}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span>{template.jurisdictionState || "All states"}</span>
                    <span>•</span>
                    <span>{template.tokenCount} tokens</span>
                    <span>•</span>
                    <span>{template.clauseCount} clauses</span>
                    <span>•</span>
                    <span>v{template.version}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Quality</p>
                  <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${quality}%` }} /></div>
                  <p className="mt-1 text-xs font-bold text-slate-600">{quality}% ready</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Usage</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{template.packetCount} packets</p>
                  <p className="text-xs text-slate-500">{template.lastUsedAt ? `Last used ${template.lastUsedAt.toLocaleDateString()}` : "Not used yet"}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`${baseHref}/${template.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white">Preview</Link>
                  {canManage ? <Link href={`${baseHref}?edit=${template.id}`} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">Edit</Link> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
