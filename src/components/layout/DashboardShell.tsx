"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Bell, BriefcaseBusiness, CalendarDays, CheckSquare, ChevronDown, ClipboardCheck, ClipboardList, Database, DollarSign, FileSignature, FileText, Heart, Home, Inbox, LayoutDashboard, Megaphone, Menu, MessageSquare, PackageSearch, PlugZap, Route, Search, Shield, ShieldCheck, Sparkles, TestTube2, UserRound, Users, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeBaseLogo } from "@/components/brand/HomeBaseLogo";
import { CommandPalette } from "@/components/ui/system";
import type { RoleCapabilityKey } from "@/lib/role-capabilities";

const shellIconMap = {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Database,
  DollarSign,
  FileSignature,
  FileText,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PackageSearch,
  PlugZap,
  Route,
  Search,
  ScreeningCheck: ClipboardCheck,
  Shield,
  ShieldCheck,
  Sparkles,
  TestTube2,
  UserRound,
  Users,
  Wrench
} satisfies Record<string, LucideIcon>;

export type ShellIconName = keyof typeof shellIconMap;

export type ShellNavGroup = {
  label: string;
  items: Array<{ href: string; label: string; icon: ShellIconName; capability?: RoleCapabilityKey }>;
};

function getShellIcon(icon: ShellIconName): LucideIcon {
  return shellIconMap[icon] ?? LayoutDashboard;
}

function ShellNavigation({ groups, onNavigate }: { groups: ShellNavGroup[]; onNavigate?: () => void }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            <span>{group.label}</span>
            <ChevronDown size={12} />
          </div>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const Icon = getShellIcon(item.icon);
              return (
                <Link key={item.href} href={item.href} onClick={onNavigate} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

export function DashboardShell({ children, groups, title, accountLabel, inboxHref = "/applicant/inbox", quickCreateHref = "/marketplace", quickCreateLabel = "Quick Action" }: { children: ReactNode; groups: ShellNavGroup[]; title: string; accountLabel: string; inboxHref?: string; quickCreateHref?: string; quickCreateLabel?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const commandKey = event.metaKey || event.ctrlKey;
      if (commandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-slate-50" data-density="compact">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-slate-800 bg-slate-950 p-3 text-white lg:block">
          <Link href="/" className="mb-4 block rounded-2xl px-2 py-1.5 hover:bg-white/5">
            <HomeBaseLogo tone="light" />
          </Link>
          <ShellNavigation groups={groups} />
          <div className="mt-5">
            <CommandPalette />
          </div>
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard navigation">
            <button className="absolute inset-0 bg-slate-950/70" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
            <aside className="relative flex h-full w-[min(86vw,340px)] flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-3 text-white shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Link href="/" onClick={() => setDrawerOpen(false)} className="rounded-2xl px-2 py-1.5 hover:bg-white/5">
                  <HomeBaseLogo tone="light" />
                </Link>
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-200" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <ShellNavigation groups={groups} onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-5">
                <CommandPalette compact actions={flatItems.slice(0, 8).map((item) => ({ label: item.label, href: item.href }))} />
              </div>
            </aside>
          </div>
        ) : null}

        {paletteOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 pt-24" role="dialog" aria-modal="true" aria-label="Command palette">
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Search size={16} />
                <span className="font-bold">Jump to a workflow</span>
                <button type="button" onClick={() => setPaletteOpen(false)} className="ml-auto rounded-xl p-1 text-slate-500 hover:bg-slate-200" aria-label="Close command palette"><X size={16} /></button>
              </div>
              <div className="mt-2 grid gap-1">
                {flatItems.slice(0, 12).map((item) => {
                  const Icon = getShellIcon(item.icon);
                  return <Link key={item.href} href={item.href} onClick={() => setPaletteOpen(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100"><Icon size={16} />{item.label}</Link>;
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-w-0" data-dashboard-scroll-root>
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 lg:px-5">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden" type="button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{accountLabel}</p>
                <h1 className="truncate text-base font-black text-slate-950">{title}</h1>
              </div>
              <button type="button" onClick={() => setPaletteOpen(true)} className="ml-auto hidden min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:flex">
                <Search size={15} />
                <span className="font-semibold">Search rentals, tenants, payments, messages</span>
                <kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black">Cmd K</kbd>
              </button>
              <Link href={inboxHref} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Inbox">
                <Bell size={17} />
              </Link>
              <Link href={quickCreateHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
                <Sparkles size={15} /> {quickCreateLabel}
              </Link>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 lg:hidden">
              {flatItems.slice(0, 10).map((item) => {
                const Icon = getShellIcon(item.icon);
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
