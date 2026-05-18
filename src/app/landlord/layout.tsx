import { Building2, ClipboardList, DollarSign, FileSignature, Home, Inbox, LayoutDashboard, ClipboardCheck, MessageSquare, Wrench, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Operations", items: [
    { href: "/landlord", label: "Dashboard", icon: LayoutDashboard },
    { href: "/landlord/properties", label: "Properties", icon: Building2 },
    { href: "/landlord/units", label: "Units", icon: Home },
    { href: "/landlord/contacts", label: "Contacts", icon: Users }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/leads", label: "Leads", icon: Inbox },
    { href: "/landlord/applications", label: "Applications", icon: ClipboardList },
    { href: "/landlord/leases", label: "Leases", icon: FileSignature }
  ] },
  { label: "Maintenance", items: [
    { href: "/landlord/inspections", label: "Inspections", icon: ClipboardCheck },
    { href: "/landlord/maintenance", label: "Maintenance", icon: Wrench }
  ] },
  { label: "Financial", items: [
    { href: "/landlord/ledger", label: "Ledger", icon: DollarSign },
    { href: "/landlord/payments", label: "Payments", icon: DollarSign }
  ] },
  { label: "Communication", items: [
    { href: "/landlord/inbox", label: "Inbox", icon: MessageSquare }
  ] }
];

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LANDLORD"], "/landlord");

  return (
    <DashboardShell groups={navGroups} title="Landlord command center" accountLabel="Housing operations" inboxHref="/landlord/inbox" quickCreateHref="/landlord/units/new">
      {children}
    </DashboardShell>
  );
}
