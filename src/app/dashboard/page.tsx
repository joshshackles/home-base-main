export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { buildDashboardForUser } from "@/lib/dashboard/role-dashboard";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const model = await buildDashboardForUser(user);
  return <RoleDashboard model={model} />;
}
