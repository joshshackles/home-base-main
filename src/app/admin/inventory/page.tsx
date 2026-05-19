export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getMaintenanceInventoryModule } from "@/lib/operations/modules";
import { MaintenanceInventoryModule } from "@/components/operations/MaintenanceInventoryModule";
import { createAdminAssetServiceRecordAction, createAdminAssetWarrantyAction, createAdminKeyLockRecordAction, createAdminMaintenanceAssetAction } from "@/app/admin/actions";

export default async function Page() {
  await requireRole(["ADMIN"], "/admin/inventory");
  const data = await getMaintenanceInventoryModule(undefined);

  return (
    <MaintenanceInventoryModule
      scope="admin"
      data={data}
      actions={{
        createAsset: createAdminMaintenanceAssetAction,
        createServiceRecord: createAdminAssetServiceRecordAction,
        createWarranty: createAdminAssetWarrantyAction,
        createKeyLock: createAdminKeyLockRecordAction
      }}
    />
  );
}
