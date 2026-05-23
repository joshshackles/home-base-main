export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { WorkspaceShell } from "@/components/layout/DashboardShell";
import { vendorNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/vendor");
  await assertVendorPortalAccess(user);
  const { capabilitySet } = await requireWorkspaceAccess("vendor", "/vendor");
  const groups = filterNavGroupsByCapabilities(vendorNavGroups, capabilitySet.capabilities);
  return <WorkspaceShell groups={groups} title="Field workspace" accountLabel="Vendor operations" inboxHref="/vendor/jobs" quickCreateHref="/vendor/invoices" quickCreateLabel="Submit Invoice">{children}</WorkspaceShell>;
}
