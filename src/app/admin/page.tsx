export const dynamic = "force-dynamic";

import { AdminCommandCenter } from "@/components/admin/AdminCommandCenter";
import { getAdminCommandCenterModel } from "@/lib/admin/command-center";
import { requireAdmin } from "@/lib/admin/permissions";

export default async function AdminPage() {
  const access = await requireAdmin("/admin");
  const model = await getAdminCommandCenterModel(access);
  return <AdminCommandCenter model={model} />;
}
