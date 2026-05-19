import { LeaseTemplateKind } from "@prisma/client";
import type { LeaseTemplateSummary } from "@/lib/lease-templates";
import { LEASE_TEMPLATE_TOKENS, humanizeTemplateKind } from "@/lib/lease-templates";

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100";
const textareaClass = `${inputClass} min-h-[260px] font-mono text-xs leading-6`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><div className="mt-1">{children}</div></label>;
}

export function LeaseTemplateEditor({
  action,
  template,
  title = "Create template",
  submitLabel = "Save template"
}: {
  action: (formData: FormData) => void | Promise<void>;
  template?: Partial<LeaseTemplateSummary> | null;
  title?: string;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {template?.id ? <input type="hidden" name="id" value={template.id} /> : null}
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">Build reusable lease language with smart tokens, renewal/addendum types, state scoping, and active/inactive lifecycle controls.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Template name"><input name="name" className={inputClass} defaultValue={template?.name ?? ""} required /></Field>
        <Field label="Kind"><select name="kind" className={inputClass} defaultValue={template?.kind ?? LeaseTemplateKind.RESIDENTIAL}>{Object.values(LeaseTemplateKind).map((kind) => <option key={kind} value={kind}>{humanizeTemplateKind(kind)}</option>)}</select></Field>
        <Field label="State / jurisdiction"><input name="jurisdictionState" className={inputClass} defaultValue={template?.jurisdictionState ?? ""} placeholder="MO, KS, OK or blank for all" maxLength={2} /></Field>
        <Field label="Description"><input name="description" className={inputClass} defaultValue={template?.description ?? ""} placeholder="When to use this template" /></Field>
      </div>
      <div className="mt-3">
        <Field label="Template body"><textarea name="body" className={textareaClass} defaultValue={template?.body ?? ""} required /></Field>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Available tokens</p>
        <div className="mt-2 flex flex-wrap gap-2">{LEASE_TEMPLATE_TOKENS.map((token) => <code key={token} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{token}</code>)}</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-black text-slate-700"><input name="isActive" type="checkbox" defaultChecked={template?.isActive ?? true} /> Active</label>
        <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-brand-700">{submitLabel}</button>
      </div>
    </form>
  );
}
