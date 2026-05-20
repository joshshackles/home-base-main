export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { vendorNavGroups } from "@/lib/navigation/first-release";
import { filterNavGroupsByCapabilities } from "@/lib/role-capabilities";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/vendor");
  await assertVendorPortalAccess(user);
  const { capabilitySet } = await requireWorkspaceAccess("vendor", "/vendor");
  const groups = filterNavGroupsByCapabilities(vendorNavGroups, capabilitySet.capabilities);
  return <DashboardShell groups={groups} title="Vendor portal" accountLabel="Field operations" inboxHref="/vendor/jobs" quickCreateHref="/vendor/invoices" quickCreateLabel="Submit Invoice">{children}</DashboardShell>;
}
