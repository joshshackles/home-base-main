export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Operations", items: [
    { href: "/applicant", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/applicant/profile", label: "Profile", icon: "UserRound" },
    { href: "/applicant/contacts", label: "Contacts", icon: "Users" },
    { href: "/applicant/favorites", label: "Favorites", icon: "Heart" },
    { href: "/applicant/home-tools", label: "Home Tools", icon: "Home" }
  ] },
  { label: "Leasing", items: [
    { href: "/applicant/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/applicant/leases", label: "Leases", icon: "FileSignature" },
    { href: "/applicant/documents", label: "Documents", icon: "FileText" }
  ] },
  { label: "Maintenance", items: [
    { href: "/applicant/inspections", label: "Inspections", icon: "ClipboardCheck" },
    { href: "/applicant/maintenance", label: "Maintenance", icon: "Wrench" },
    { href: "/applicant/tasks", label: "Tasks", icon: "CheckSquare" },
    { href: "/applicant/calendar", label: "Calendar", icon: "CalendarDays" }
  ] },
  { label: "Financial", items: [
    { href: "/applicant/ledger", label: "Ledger", icon: "DollarSign" },
    { href: "/applicant/payments", label: "Payments", icon: "DollarSign" }
  ] },
  { label: "Communication", items: [
    { href: "/applicant/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/applicant/notifications", label: "Notifications", icon: "Bell" },
    { href: "/applicant/notices", label: "Notices", icon: "Megaphone" }
  ] }
];

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/applicant");

  return (
    <DashboardShell groups={navGroups} title="Applicant command center" accountLabel="Renter operations" inboxHref="/applicant/inbox" quickCreateHref="/marketplace">
      {children}
    </DashboardShell>
  );
}
