import { requireRole } from "@/lib/auth";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { adminNavGroups } from "@/lib/navigation/first-release";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["ADMIN"]);
  return <DashboardShell groups={adminNavGroups} title="Admin command center" accountLabel="Authoritative platform operations" inboxHref="/admin/inbox" quickCreateHref="/admin" quickCreateLabel="Open Command Center">{children}</DashboardShell>;
}
