export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { buildDashboardForModule } from "@/lib/dashboard/role-dashboard";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";

export default async function VendorDashboardPage() {
  const user = await requireUser("/vendor");
  const model = await buildDashboardForModule(user, "vendor");
  return <RoleDashboard model={model} />;
}
