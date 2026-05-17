import Link from "next/link";
import { Building2, ClipboardList, DollarSign, FileSignature, Home, Inbox, LayoutDashboard, ClipboardCheck, MessageSquare, Wrench, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", icon: Building2 },
  { href: "/landlord/units", label: "Units", icon: Home },
  { href: "/landlord/leads", label: "Leads", icon: Inbox },
  { href: "/landlord/applications", label: "Applications", icon: ClipboardList },
  { href: "/landlord/leases", label: "Leases", icon: FileSignature },
  { href: "/landlord/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/landlord/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/landlord/contacts", label: "Contacts", icon: Users },
  { href: "/landlord/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/landlord/ledger", label: "Ledger", icon: DollarSign }
];

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LANDLORD"], "/landlord");

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
