export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardCheck, ClipboardList, DollarSign, FileSignature, Heart, Home, LayoutDashboard, MessageSquare, Wrench, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/applicant", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applicant/favorites", label: "Favorites", icon: Heart },
  { href: "/applicant/applications", label: "Applications", icon: ClipboardList },
  { href: "/applicant/leases", label: "Leases", icon: FileSignature },
  { href: "/applicant/home-tools", label: "Home Tools", icon: Home },
  { href: "/applicant/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/applicant/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/applicant/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/applicant/ledger", label: "Ledger", icon: DollarSign },
  { href: "/applicant/profile", label: "Profile", icon: UserRound }
];

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/applicant");

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-3 py-2 sm:px-4 lg:px-6">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100 hover:text-slate-950">
                <Icon size={15} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
