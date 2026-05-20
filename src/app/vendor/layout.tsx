export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { assertVendorPortalAccess } from "@/lib/vendors";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { vendorNavGroups } from "@/lib/navigation/first-release";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/vendor");
  await assertVendorPortalAccess(user);
  return <DashboardShell groups={vendorNavGroups} title="Vendor portal" accountLabel="Field operations" inboxHref="/vendor/jobs" quickCreateHref="/vendor/invoices" quickCreateLabel="Submit Invoice">{children}</DashboardShell>;
}
