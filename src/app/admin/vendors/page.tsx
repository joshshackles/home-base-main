export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getOwnerVendorCenter } from "@/lib/vendors";
import { VendorCenterView } from "@/components/vendors/VendorCenterView";

export default async function AdminVendorsPage() {
  await requireRole(["ADMIN"], "/admin/vendors");
  const data = await getOwnerVendorCenter();
  return <VendorCenterView data={data} scope="admin" />;
}
