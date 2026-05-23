import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { tenantNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("tenant", "/tenant");
  const groups = filterNavGroupsByCapabilities(tenantNavGroups, capabilitySet.capabilities);

  return (
    <WorkspaceShell groups={groups} title="Resident workspace" accountLabel="Resident operations" inboxHref="/tenant/inbox" quickCreateHref="/tenant/maintenance" quickCreateLabel="Request Repair">
      {children}
    </WorkspaceShell>
  );
}
