export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { inspectorNavGroups } from "@/lib/navigation/first-release";

export default async function InspectorLayout({ children }: { children: ReactNode }) {
  await requireRole(["INSPECTOR"], "/inspector");
  return <DashboardShell groups={inspectorNavGroups} title="Inspector dashboard" accountLabel="Inspection workflow" inboxHref="/inspector" quickCreateHref="/inspector#needs-attention" quickCreateLabel="Start Review">{children}</DashboardShell>;
}
