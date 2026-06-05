export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { housingAuthorityNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireCapability } from "@/lib/role-capabilities.server";

export default async function HousingAuthorityLayout({ children }: { children: ReactNode }) {
  const { capabilitySet } = await requireCapability("admin.workflows", "/housing-authority");
  const groups = filterNavGroupsByCapabilities(housingAuthorityNavGroups, capabilitySet.capabilities);

  return (
    <WorkspaceShell
      groups={groups}
      title="Housing Authority Workspace"
      accountLabel="Program operations"
      shellDescription="RFTA, inspections, subsidy, documents"
      inboxHref="/admin/inbox"
      quickCreateHref="/housing-authority#rfta"
      quickCreateLabel="Review RFTAs"
    >
      {children}
    </WorkspaceShell>
  );
}
