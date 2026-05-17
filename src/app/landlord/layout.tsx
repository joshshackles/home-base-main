import Link from "next/link";
import { Building2, ClipboardList, DollarSign, FileSignature, Home, Inbox, LayoutDashboard, ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", icon: Building2 },
  { href: "/landlord/units", label: "Units", icon: Home },
  { href: "/landlord/leads", label: "Leads", icon: Inbox },
  { href: "/landlord/applications", label: "Applications", icon: ClipboardList },
  { href: "/landlord/leases", label: "Leases", icon: FileSignature },
  { href: "/landlord/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/landlord/ledger", label: "Ledger", icon: DollarSign }
];

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LANDLORD"], "/landlord");

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
