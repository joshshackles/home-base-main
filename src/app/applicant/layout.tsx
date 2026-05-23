import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { applicantNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export const dynamic = "force-dynamic";

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("applicant", "/applicant");
  const groups = filterNavGroupsByCapabilities(applicantNavGroups, capabilitySet.capabilities);

  return (
    <WorkspaceShell groups={groups} title="Renter workspace" accountLabel="Renter operations" inboxHref="/applicant/inbox" quickCreateHref="/marketplace" quickCreateLabel="Search Rentals">
      {children}
    </WorkspaceShell>
  );
}
