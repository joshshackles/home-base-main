export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { getVendorPortal } from "@/lib/vendors";
import { VendorPortalView } from "@/components/vendors/VendorPortalView";

export default async function VendorJobsPage() {
  const user = await requireUser("/vendor/jobs");
  const data = await getVendorPortal(user.userId);
  return <VendorPortalView data={data} active="jobs" />;
}
