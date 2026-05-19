import { requireRole } from "@/lib/auth";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Operations", items: [
    { href: "/landlord", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/landlord/rentals", label: "Rentals", icon: "Home" },
    { href: "/landlord/lifecycle", label: "Lifecycle", icon: "Route" },
    { href: "/landlord/contacts", label: "Contacts", icon: "Users" },
    { href: "/landlord/vendors", label: "Vendors", icon: "BriefcaseBusiness" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/leads", label: "Leads", icon: "Inbox" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/landlord/screening", label: "Screening", icon: "ScreeningCheck" },
    { href: "/landlord/leases", label: "Leases", icon: "FileSignature" },
    { href: "/landlord/lease-templates", label: "Lease templates", icon: "FileSignature" },
    { href: "/landlord/documents", label: "Documents", icon: "FileText" }
  ] },
  { label: "Maintenance", items: [
    { href: "/landlord/inspections", label: "Inspections", icon: "ClipboardCheck" },
    { href: "/landlord/maintenance", label: "Maintenance", icon: "Wrench" },
    { href: "/landlord/inventory", label: "Inventory", icon: "PackageSearch" },
    { href: "/landlord/compliance", label: "Compliance", icon: "Shield" },
    { href: "/landlord/tasks", label: "Tasks", icon: "CheckSquare" },
    { href: "/landlord/calendar", label: "Calendar", icon: "CalendarDays" }
  ] },
  { label: "Financial", items: [
    { href: "/landlord/ledger", label: "Ledger", icon: "DollarSign" },
    { href: "/landlord/payments", label: "Payments", icon: "DollarSign" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3" },
    { href: "/landlord/integrations", label: "Integrations", icon: "PlugZap" }
  ] },
  { label: "Communication", items: [
    { href: "/landlord/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/landlord/notifications", label: "Notifications", icon: "Bell" },
    { href: "/landlord/notices", label: "Notices", icon: "Megaphone" }
  ] }
];

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LANDLORD"], "/landlord");

  return (
    <DashboardShell groups={navGroups} title="Landlord command center" accountLabel="Housing operations" inboxHref="/landlord/inbox" quickCreateHref="/landlord/rentals/new">
      {children}
    </DashboardShell>
  );
}
