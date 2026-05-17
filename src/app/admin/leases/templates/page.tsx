import { createLeaseTemplate, updateLeaseTemplate } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, inputClass, textareaClass } from "@/components/admin/FormFields";
import { DEFAULT_LEASE_TEMPLATE_BODY } from "@/lib/lease-render";
import { prisma } from "@/lib/prisma";

export default async function LeaseTemplatesPage() {
  const templates = await prisma.leaseTemplate.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Lease templates"
        description="Create reusable lease text with tokens such as {{tenant_name}}, {{property_address}}, {{monthly_rent}}, and {{lease_terms}}."
        actionHref="/admin/leases"
        actionLabel="Back to leases"
      />

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form action={createLeaseTemplate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">New template</h2>
          <div className="mt-5 space-y-4">
            <Field label="Template name"><input name="name" className={inputClass} placeholder="Standard residential lease" required /></Field>
            <Field label="Description"><input name="description" className={inputClass} placeholder="Optional internal description" /></Field>
            <Field label="Template body"><textarea name="body" className={`${textareaClass} min-h-[360px] font-mono text-xs`} defaultValue={DEFAULT_LEASE_TEMPLATE_BODY} required /></Field>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
            <button type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Create Template</button>
          </div>
        </form>

        <div className="space-y-4">
          {templates.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">No templates have been created yet.</div> : templates.map((template) => (
            <form key={template.id} action={updateLeaseTemplate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <input type="hidden" name="id" value={template.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Template name"><input name="name" className={inputClass} defaultValue={template.name} required /></Field>
                <Field label="Description"><input name="description" className={inputClass} defaultValue={template.description ?? ""} /></Field>
              </div>
              <Field label="Template body"><textarea name="body" className={`${textareaClass} mt-3 min-h-[260px] font-mono text-xs`} defaultValue={template.body} required /></Field>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked={template.isActive} /> Active</label>
                <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Save Template</button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
