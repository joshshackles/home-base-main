import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { landlordNavGroups } from "@/lib/navigation/first-release";

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LANDLORD"], "/landlord");

  return (
    <DashboardShell groups={landlordNavGroups} title="Landlord command center" accountLabel="Housing operations" inboxHref="/landlord/inbox" quickCreateHref="/landlord/rentals/new" quickCreateLabel="Create Listing">
      {children}
    </DashboardShell>
  );
}
