import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { tenantNavGroups } from "@/lib/navigation/first-release";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["TENANT"], "/tenant");

  return (
    <DashboardShell groups={tenantNavGroups} title="Tenant portal" accountLabel="Resident operations" inboxHref="/tenant/inbox" quickCreateHref="/tenant/maintenance" quickCreateLabel="Request Repair">
      {children}
    </DashboardShell>
  );
}
