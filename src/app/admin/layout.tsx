import { requireRole } from "@/lib/auth";
import type { ReactNode } from "react";
import { Building2, ClipboardCheck, ClipboardList, Database, DollarSign, FileSignature, Home, Inbox, LayoutDashboard, MessageSquare, ShieldCheck, Users, Wrench } from "lucide-react";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Operations", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/properties", label: "Properties", icon: Building2 },
    { href: "/admin/units", label: "Units", icon: Home },
    { href: "/admin/users", label: "Users", icon: Users }
  ] },
  { label: "Leasing", items: [
    { href: "/admin/leads", label: "Leads", icon: Inbox },
    { href: "/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/admin/leases", label: "Leases", icon: FileSignature },
    { href: "/admin/documents", label: "Documents", icon: Database }
  ] },
  { label: "Maintenance", items: [
    { href: "/admin/inspections", label: "Inspections", icon: ClipboardCheck },
    { href: "/admin/maintenance", label: "Maintenance", icon: Wrench }
  ] },
  { label: "Financial", items: [
    { href: "/admin/ledger", label: "Ledger", icon: DollarSign }
  ] },
  { label: "Communication", items: [
    { href: "/admin/inbox", label: "Inbox", icon: MessageSquare },
    { href: "/admin/notifications", label: "Notifications", icon: Inbox }
  ] },
  { label: "Administration", items: [
    { href: "/admin/security", label: "Security", icon: ShieldCheck },
    { href: "/admin/system", label: "System", icon: Database }
  ] }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["ADMIN"]);
  return <DashboardShell groups={navGroups} title="Admin command center" accountLabel="Platform operations" inboxHref="/admin/inbox" quickCreateHref="/admin/units/new">{children}</DashboardShell>;
}
