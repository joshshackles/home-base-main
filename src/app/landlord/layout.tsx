import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { getLandlordExperienceConfig, resolveLandlordExperienceMode } from "@/lib/landlord/experience-mode";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const { user, capabilitySet } = await requireWorkspaceAccess("landlord", "/landlord");
  const mode = await resolveLandlordExperienceMode(user.userId, capabilitySet.approvedAccessTypes);
  const config = getLandlordExperienceConfig(mode, capabilitySet.approvedAccessTypes);
  const groups = filterNavGroupsByCapabilities(config.navGroups, capabilitySet.capabilities);

  return (
    <WorkspaceShell
      groups={groups}
      title={config.title}
      accountLabel={config.accountLabel}
      shellDescription={config.shellDescription}
      inboxHref="/landlord/inbox"
      quickCreateHref={config.quickCreateHref}
      quickCreateLabel={config.quickCreateLabel}
      modeSwitchHref={config.modeSwitchHref}
      modeSwitchLabel={config.modeSwitchLabel}
    >
      {children}
    </WorkspaceShell>
  );
}
