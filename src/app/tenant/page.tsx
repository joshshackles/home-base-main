export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { buildDashboardForModule } from "@/lib/dashboard/role-dashboard";

export default async function TenantDashboardPage() {
  const user = await requireRole(["TENANT"], "/tenant");
  const model = await buildDashboardForModule(user, "tenant");

  return <RoleDashboard model={model} />;
}
