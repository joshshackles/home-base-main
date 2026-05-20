export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getTaskCenter } from "@/lib/tasks";
import { TaskCenterView } from "@/components/tasks/TaskCenterView";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TenantTasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["TENANT"], "/tenant/tasks");
  const center = await getTaskCenter(user, {
    q: getParam(searchParams, "q"),
    status: getParam(searchParams, "status"),
    priority: getParam(searchParams, "priority"),
    type: getParam(searchParams, "type"),
    owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all"
  });

  return (
    <TaskCenterView
      title="Resident tasks"
      description="Track lease, rent, maintenance, document, notice, and inspection follow-up items connected to your home."
      basePath="tenant"
      center={center}
      searchParams={searchParams}
    />
  );
}
