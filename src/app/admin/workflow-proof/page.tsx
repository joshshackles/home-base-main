export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ClipboardCheck, Hammer, SearchCheck, ShieldCheck, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCanonicalConversationCounts } from "@/lib/conversations/canonical";
import { buildFieldWorkflowProofModel, type FieldWorkflowProofModel, type WorkflowProofItem, type WorkflowProofStep } from "@/lib/workflow-proof";

function badge(status: WorkflowProofItem["status"]) {
  if (status === "covered") return "bg-emerald-50 text-emerald-700";
  if (status === "watch") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-700";
}

function label(status: WorkflowProofItem["status"]) {
  if (status === "covered") return "Covered";
  if (status === "watch") return "Watch";
  return "Gap";
}

function ProofSection({ title, detail, icon, items }: { title: string; detail: string; icon: ReactNode; items: WorkflowProofItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</div>
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-950">{item.count}</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${badge(item.status)}`}>{label(item.status)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProofTimeline({ title, detail, items }: { title: string; detail: string; items: WorkflowProofStep[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-7">
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={item.href}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${badge(item.status)}`}>{label(item.status)}</span>
            </div>
            <p className="mt-3 text-sm font-black text-slate-950">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{item.count}</p>
            <p className="mt-2 text-xs font-bold uppercase text-slate-500">{item.owner}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LaunchHardening({ items }: { items: FieldWorkflowProofModel["launchHardening"] }) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black">Launch hardening</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6">
            Release readiness is tracked as explicit codebase coverage, not as fake production metrics. Items below are pass/fail proof points for the operational launch surface.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="rounded-2xl border border-emerald-200 bg-white/80 p-4 transition hover:bg-white">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black">{item.label}</p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">
                {item.covered ? "Covered" : "Open"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">{item.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function AdminWorkflowProofPage() {
  const user = await requireRole(["ADMIN"], "/admin/workflow-proof");
  const [model, conversationCounts] = await Promise.all([
    buildFieldWorkflowProofModel(user),
    getCanonicalConversationCounts(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <ClipboardCheck size={14} /> Workflow proof
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Operational field workflow proof</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">A launch-readiness view for the operational flows that must be real before release: tenant repair intake, landlord review, vendor assignment, mobile field updates, estimate and invoice handling, completion, inspection assignment, reports, and reinspections.</p>
            </div>
            <Link href="/admin" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50">Command Center</Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-950">{conversationCounts.legacyLeads}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">Legacy leads</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-950">{conversationCounts.legacyThreads}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">Legacy threads</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-950">{conversationCounts.canonicalRows}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">Canonical rows</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-2xl font-black text-emerald-700"><CheckCircle2 size={22} /> Started</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">Conversation migration</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-xl font-black">Canonical conversation model migration path</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6">This release creates `Conversation`, `ConversationParticipant`, and `ConversationEvent` as the future source of truth while preserving `Lead`, `LeadNote`, `MessageThread`, and `Message`. The landlord inbox now carries a canonical conversation id for each normalized record, so data migration can happen without breaking existing workflows.</p>
        </section>

        <div className="mt-5 grid gap-5">
          <ProofTimeline
            title="Repair field chain"
            detail="Tenant request to landlord review to vendor assignment, acceptance, field update, estimate / invoice, completion, and payout readiness."
            items={model.repairChain}
          />
          <ProofTimeline
            title="Inspection chain"
            detail="Assigned inspections, field reports, failed results, reinspection queue, and inspection closeout are tracked as one operational loop."
            items={model.inspectionChain}
          />
          <LaunchHardening items={model.launchHardening} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <ProofSection title="Maintenance" detail="Repair intake, message context, assignment, and status flow." icon={<Wrench size={20} />} items={model.maintenance} />
          <ProofSection title="Vendors" detail="Vendor profiles, mobile field updates, work logs, invoices, and payout handoff." icon={<Hammer size={20} />} items={model.vendor} />
          <ProofSection title="Inspectors" detail="Assigned inspections, findings, reports, failed inspections, and reinspection exceptions." icon={<SearchCheck size={20} />} items={model.inspector} />
        </div>
      </div>
    </main>
  );
}
