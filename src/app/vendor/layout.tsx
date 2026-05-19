export const dynamic = "force-dynamic";

import { BriefcaseBusiness, ClipboardList, DollarSign, LayoutDashboard, MessageSquare, Wrench, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { DashboardShell, type ShellNavGroup } from "@/components/layout/DashboardShell";

const navGroups: ShellNavGroup[] = [
  { label: "Vendor", items: [
    { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/jobs", label: "Jobs", icon: Wrench },
    { href: "/vendor/invoices", label: "Invoices", icon: DollarSign },
    { href: "/vendor", label: "Profile", icon: BriefcaseBusiness },
    { href: "/vendor/contacts", label: "Contacts", icon: Users }
  ] },
  { label: "Communication", items: [
    { href: "/vendor/jobs", label: "Work updates", icon: ClipboardList },
    { href: "/vendor", label: "Messages", icon: MessageSquare }
  ] }
];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/vendor");
  await assertVendorPortalAccess(user);
  return <DashboardShell groups={navGroups} title="Vendor portal" accountLabel="Field operations" inboxHref="/vendor/jobs" quickCreateHref="/vendor/invoices">{children}</DashboardShell>;
}
