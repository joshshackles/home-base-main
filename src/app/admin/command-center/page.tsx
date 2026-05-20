export const dynamic = "force-dynamic";

import { AdminCommandCenter } from "@/components/admin/AdminCommandCenter";
import { getAdminCommandCenterModel } from "@/lib/admin/command-center";
import { requireSuperUser } from "@/lib/admin/permissions";

export default async function AdminSuperUserCommandCenterPage() {
  const access = await requireSuperUser("/admin/command-center");
  const model = await getAdminCommandCenterModel(access);
  return <AdminCommandCenter model={model} />;
}
