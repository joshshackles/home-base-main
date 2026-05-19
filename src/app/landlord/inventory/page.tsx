export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getMaintenanceInventoryModule } from "@/lib/operations/modules";
import { MaintenanceInventoryModule } from "@/components/operations/MaintenanceInventoryModule";
import { createLandlordAssetServiceRecordAction, createLandlordAssetWarrantyAction, createLandlordKeyLockRecordAction, createLandlordMaintenanceAssetAction } from "@/app/landlord/actions";

export default async function Page() {
  const user = await requireRole(["LANDLORD"], "/landlord/inventory");
  const data = await getMaintenanceInventoryModule(user.userId);

  return (
    <MaintenanceInventoryModule
      scope="landlord"
      data={data}
      actions={{
        createAsset: createLandlordMaintenanceAssetAction,
        createServiceRecord: createLandlordAssetServiceRecordAction,
        createWarranty: createLandlordAssetWarrantyAction,
        createKeyLock: createLandlordKeyLockRecordAction
      }}
    />
  );
}
