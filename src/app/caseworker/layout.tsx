export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { caseworkerNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function CaseworkerLayout({ children }: { children: ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("caseworker", "/caseworker");
  const groups = filterNavGroupsByCapabilities(caseworkerNavGroups, capabilitySet.capabilities);

  return (
    <WorkspaceShell
      groups={groups}
      title="Caseworker Workspace"
      accountLabel="Program casework"
      shellDescription="Guided participant queues"
      inboxHref="/caseworker#messages"
      quickCreateHref="/caseworker#cases"
      quickCreateLabel="Open Cases"
    >
      {children}
    </WorkspaceShell>
  );
}
