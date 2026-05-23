import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { adminNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("admin", "/admin");
  const groups = filterNavGroupsByCapabilities(adminNavGroups, capabilitySet.capabilities);
  return <WorkspaceShell groups={groups} title="Operations workspace" accountLabel="Authoritative platform operations" inboxHref="/admin/inbox" quickCreateHref="/admin" quickCreateLabel="Open Workspace">{children}</WorkspaceShell>;
}
