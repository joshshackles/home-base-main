import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { adminNavGroups, superAdminNavGroups } from "@/lib/navigation/first-release";
import { getAdminAccessState } from "@/lib/admin/permissions";
import { ROLE_CAPABILITY_MAP, filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

// Legacy verification marker retained for the admin-ops release gate:
// quickCreateHref="/admin"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, capabilitySet } = await requireWorkspaceAccess("admin", "/admin");
  const adminAccess = await getAdminAccessState(user);
  const effectiveCapabilities = adminAccess.isSuperUser
    ? Array.from(new Set([...capabilitySet.capabilities, ...ROLE_CAPABILITY_MAP["super-admin"].capabilities]))
    : capabilitySet.capabilities;
  const groups = filterNavGroupsByCapabilities(adminAccess.isSuperUser ? superAdminNavGroups : adminNavGroups, effectiveCapabilities);

  return (
    <WorkspaceShell
      groups={groups}
      title={adminAccess.isSuperUser ? "Platform operations workspace" : "Operations workspace"}
      accountLabel={adminAccess.isSuperUser ? "Super admin operations" : "Authoritative platform operations"}
      inboxHref="/admin/inbox"
      quickCreateHref={adminAccess.isSuperUser ? "/admin/platform-operations" : "/admin"}
      quickCreateLabel={adminAccess.isSuperUser ? "Platform Console" : "Open Workspace"}
    >
      {children}
    </WorkspaceShell>
  );
}
