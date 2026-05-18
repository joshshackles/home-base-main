import { requireRole } from "@/lib/auth";
import type { ReactNode } from "react";
import { Activity, Building2, ClipboardCheck, ClipboardList, Database, DollarSign, FileSignature, Home, Inbox, LayoutDashboard, MessageSquare, ShieldCheck, Users, Wrench, CheckSquare, CalendarDays, BarChart3, Megaphone, BriefcaseBusiness, Shield, PackageSearch, PlugZap, ClipboardCheck as ScreeningCheck } from "lucide-react";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Operations", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/rentals", label: "Rentals", icon: Home },
    { href: "/admin/properties", label: "Property groups", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/vendors", label: "Vendors", icon: BriefcaseBusiness }
  ] },
  { label: "Leasing", items: [
    { href: "/admin/leads", label: "Leads", icon: Inbox },
    { href: "/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/admin/screening", label: "Screening", icon: ScreeningCheck },
    { href: "/admin/leases", label: "Leases", icon: FileSignature },
    { href: "/admin/lease-templates", label: "Lease templates", icon: FileSignature },
    { href: "/admin/documents", label: "Documents", icon: Database }
  ] },
  { label: "Maintenance", items: [
    { href: "/admin/inspections", label: "Inspections", icon: ClipboardCheck },
    { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/admin/inventory", label: "Inventory", icon: PackageSearch },
    { href: "/admin/compliance", label: "Compliance", icon: Shield },
    { href: "/admin/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarDays }
  ] },
  { label: "Financial", items: [
    { href: "/admin/ledger", label: "Ledger", icon: DollarSign },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 }
  ] },
  { label: "Communication", items: [
    { href: "/admin/inbox", label: "Inbox", icon: MessageSquare },
    { href: "/admin/notifications", label: "Notifications", icon: Inbox },
    { href: "/admin/notices", label: "Notices", icon: Megaphone }
  ] },
  { label: "Administration", items: [
    { href: "/admin/operations", label: "Operations", icon: Activity },
    { href: "/admin/security", label: "Security", icon: ShieldCheck },
    { href: "/admin/system", label: "System", icon: Database },
    { href: "/admin/integrations", label: "Integrations", icon: PlugZap }
  ] }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["ADMIN"]);
  return <DashboardShell groups={navGroups} title="Admin command center" accountLabel="Platform operations" inboxHref="/admin/inbox" quickCreateHref="/admin/rentals/new">{children}</DashboardShell>;
}
