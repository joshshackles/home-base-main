import { DashboardShell } from "@/components/layout/DashboardShell";
import { tenantNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("tenant", "/tenant");
  const groups = filterNavGroupsByCapabilities(tenantNavGroups, capabilitySet.capabilities);

  return (
    <DashboardShell groups={groups} title="Tenant portal" accountLabel="Resident operations" inboxHref="/tenant/inbox" quickCreateHref="/tenant/maintenance" quickCreateLabel="Request Repair">
      {children}
    </DashboardShell>
  );
}
