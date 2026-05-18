import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, ChevronDown, Menu, Search, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeBaseLogo } from "@/components/brand/HomeBaseLogo";
import { CommandPalette } from "@/components/ui/system";

export type ShellNavGroup = {
  label: string;
  items: Array<{ href: string; label: string; icon: LucideIcon }>;
};

export function DashboardShell({ children, groups, title, accountLabel, inboxHref = "/applicant/inbox", quickCreateHref = "/marketplace" }: { children: ReactNode; groups: ShellNavGroup[]; title: string; accountLabel: string; inboxHref?: string; quickCreateHref?: string }) {
  return (
    <div className="min-h-screen bg-slate-50" data-density="compact">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-slate-800 bg-slate-950 p-3 text-white lg:block">
          <Link href="/" className="mb-4 block rounded-2xl px-2 py-1.5 hover:bg-white/5">
            <HomeBaseLogo tone="light" />
          </Link>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <span>{group.label}</span>
                  <ChevronDown size={12} />
                </div>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <CommandPalette />
          </div>
        </aside>

        <div className="min-w-0" data-dashboard-scroll-root>
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 lg:px-5">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden" type="button" aria-label="Open navigation">
                <Menu size={18} />
              </button>
              <div className="min-w-0" data-dashboard-scroll-root>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{accountLabel}</p>
                <h1 className="truncate text-base font-black text-slate-950">{title}</h1>
              </div>
              <div className="ml-auto hidden min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:flex">
                <Search size={15} />
                <span className="font-semibold">Search units, tenants, payments, messages</span>
                <kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black">Cmd K</kbd>
              </div>
              <Link href={inboxHref} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Inbox">
                <Bell size={17} />
              </Link>
              <Link href={quickCreateHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
                <Sparkles size={15} /> Quick create
              </Link>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 lg:hidden">
              {groups.flatMap((group) => group.items).slice(0, 10).map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100"><Icon size={14} />{item.label}</Link>;
              })}
            </nav>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
