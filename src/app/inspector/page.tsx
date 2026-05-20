export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { buildDashboardForModule } from "@/lib/dashboard/role-dashboard";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";

export default async function InspectorDashboardPage() {
  const user = await requireRole(["INSPECTOR"], "/inspector");
  const model = await buildDashboardForModule(user, "inspector");
  return <RoleDashboard model={model} />;
}
