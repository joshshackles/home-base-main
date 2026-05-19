export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getOwnerVendorCenter } from "@/lib/vendors";
import { VendorCenterView } from "@/components/vendors/VendorCenterView";

export default async function LandlordVendorsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/vendors");
  const data = await getOwnerVendorCenter(user.userId);
  return <VendorCenterView data={data} scope="landlord" />;
}
