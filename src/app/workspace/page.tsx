export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardCheck, Home, Landmark, Search, ShieldCheck, UserRound, UsersRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { requireUser } from "@/lib/auth";
import { buildWorkspaceLauncher, type WorkspaceLauncherCard } from "@/lib/workspace/workspace-launcher";

const iconMap: Record<WorkspaceLauncherCard["icon"], LucideIcon> = {
  admin: ShieldCheck,
  applicant: Search,
  caseworker: UsersRound,
  inspector: ClipboardCheck,
  landlord: Home,
  owner: BriefcaseBusiness,
  participant: Landmark,
  tenant: UserRound,
  vendor: Wrench
};

function statusLabel(status: WorkspaceLauncherCard["status"]) {
  if (status === "primary") return "Primary";
  if (status === "protected") return "Protected";
  if (status === "contextual") return "Contextual";
  return "Available";
}

function statusClass(status: WorkspaceLauncherCard["status"]) {
  if (status === "primary") return "border-blue-100 bg-blue-50 text-blue-700";
  if (status === "protected") return "border-rose-100 bg-rose-50 text-rose-700";
  if (status === "contextual") return "border-amber-100 bg-amber-50 text-amber-800";
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

export default async function WorkspaceLauncherPage() {
  const user = await requireUser("/workspace");
  const model = await buildWorkspaceLauncher(user);
  const primaryCard = model.cards.find((card) => card.status === "primary") ?? model.cards[0];
  const contextualCards = model.cards.filter((card) => card.status === "contextual");
  const protectedCards = model.cards.filter((card) => card.status === "protected");

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
        <CommandCenterHeader
          eyebrow="Workspace Launcher"
          title={`Welcome back, ${model.userName}`}
          description="Choose the role workspace you want to operate from. Each option uses the same platform data, permissions, audit posture, and workflow rules."
          actionHref={primaryCard?.href ?? "/dashboard"}
          actionLabel={primaryCard ? `Open ${primaryCard.label}` : "Open workspace"}
          secondaryHref="/account/password"
          secondaryLabel="Account"
          icon={<ShieldCheck className="text-blue-700" size={32} />}
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CommandCenterMetric label="Available workspaces" value={model.cards.length} detail="Based on role and approved access" href="#workspace-options" icon={<ShieldCheck size={20} />} tone="blue" />
          <CommandCenterMetric label="Primary workspace" value={statusLabel(primaryCard?.status ?? "available")} detail={primaryCard?.label ?? "No primary workspace"} href={primaryCard?.href} icon={<Home size={20} />} tone="green" />
          <CommandCenterMetric label="Contextual views" value={model.contextualCount} detail="Participant, owner, or program views" href="#contextual-workspaces" icon={<Landmark size={20} />} tone={model.contextualCount ? "amber" : "slate"} />
          <CommandCenterMetric label="Protected consoles" value={model.protectedCount} detail="Super-admin operations only" href="#protected-workspaces" icon={<ShieldCheck size={20} />} tone={model.protectedCount ? "rose" : "slate"} />
        </section>

        <CommandCenterSurface className="bg-slate-950 text-white">
          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">One source of truth</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Different workspaces, same platform layer.</h2>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                HomeBase workspaces are role-specific views into shared entities, permissions, workflows, documents, messages, and audit history. Switch context without changing the source of truth.
              </p>
            </div>
            {primaryCard ? <WorkspaceCard card={primaryCard} dark /> : null}
          </div>
        </CommandCenterSurface>

        <CommandCenterPanel id="workspace-options" title="Your Workspaces" detail="Open the workspace that matches the task you are doing right now." badge={`${model.cards.length} options`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.cards.map((card) => <WorkspaceCard key={card.id} card={card} />)}
          </div>
        </CommandCenterPanel>

        <section className="grid gap-4 xl:grid-cols-2">
          <CommandCenterPanel id="contextual-workspaces" title="Contextual Views" detail="These workspaces appear when a normal role needs a safer, plainer, or more executive-facing view of the same platform records.">
            {contextualCards.length ? (
              <div className="space-y-3">
                {contextualCards.map((card) => <CompactRow key={card.id} card={card} />)}
              </div>
            ) : (
              <EmptyState title="No contextual workspaces available" detail="Participant, owner, housing-authority, or other contextual views appear here when your role or approved access allows them." />
            )}
          </CommandCenterPanel>

          <CommandCenterPanel id="protected-workspaces" title="Protected Operations" detail="High-risk consoles are separated from daily work and only appear when central permissions allow them.">
            {protectedCards.length ? (
              <div className="space-y-3">
                {protectedCards.map((card) => <CompactRow key={card.id} card={card} />)}
              </div>
            ) : (
              <EmptyState title="No protected consoles available" detail="Super-admin operations, security, audit, sample data, and recovery tools remain hidden unless your access explicitly allows them." />
            )}
          </CommandCenterPanel>
        </section>
      </div>
    </main>
  );
}

function WorkspaceCard({ card, dark = false }: { card: WorkspaceLauncherCard; dark?: boolean }) {
  const Icon = iconMap[card.icon];
  return (
    <Link href={card.href} className={`group block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${dark ? "border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12]" : "border-slate-200 bg-white text-slate-950 hover:border-blue-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${dark ? "bg-white text-blue-700" : "bg-blue-50 text-blue-700"}`}>
          <Icon size={21} />
        </span>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${dark ? "border-white/15 bg-white/10 text-white" : statusClass(card.status)}`}>{statusLabel(card.status)}</span>
      </div>
      <p className={`mt-4 text-xs font-black uppercase tracking-[0.18em] ${dark ? "text-blue-200" : "text-blue-700"}`}>{card.eyebrow}</p>
      <h2 className="mt-2 text-xl font-black tracking-tight">{card.label}</h2>
      <p className={`mt-2 text-sm font-semibold leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>{card.description}</p>
      <span className={`mt-4 inline-flex items-center gap-2 text-sm font-black ${dark ? "text-blue-100" : "text-blue-700"}`}>
        Open workspace
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function CompactRow({ card }: { card: WorkspaceLauncherCard }) {
  const Icon = iconMap[card.icon];
  return (
    <Link href={card.href} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-black text-slate-950">{card.label}</p>
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(card.status)}`}>{statusLabel(card.status)}</span>
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
      </div>
    </Link>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
