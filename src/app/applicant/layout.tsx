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
      <div className="border-b border-slate-200 bg-slate-50">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white hover:text-slate-950">
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
