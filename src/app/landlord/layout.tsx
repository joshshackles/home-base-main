import { DashboardShell } from "@/components/layout/DashboardShell";
import { landlordNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("landlord", "/landlord");
  const groups = filterNavGroupsByCapabilities(landlordNavGroups, capabilitySet.capabilities);

  return (
    <DashboardShell groups={groups} title="Landlord command center" accountLabel="Housing operations" inboxHref="/landlord/inbox" quickCreateHref="/landlord/rentals/new" quickCreateLabel="Create Listing">
      {children}
    </DashboardShell>
  );
}
