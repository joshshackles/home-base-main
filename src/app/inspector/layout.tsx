export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { inspectorNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function InspectorLayout({ children }: { children: ReactNode }) {
  const { capabilitySet } = await requireWorkspaceAccess("inspector", "/inspector");
  const groups = filterNavGroupsByCapabilities(inspectorNavGroups, capabilitySet.capabilities);
  return <DashboardShell groups={groups} title="Inspector dashboard" accountLabel="Inspection workflow" inboxHref="/inspector" quickCreateHref="/inspector#needs-attention" quickCreateLabel="Start Review">{children}</DashboardShell>;
}
