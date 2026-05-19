export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { getTaskCenter } from "@/lib/tasks";
import { TaskCenterView } from "@/components/tasks/TaskCenterView";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ApplicantTasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireUser("/applicant/tasks");
  const center = await getTaskCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), priority: getParam(searchParams, "priority"), type: getParam(searchParams, "type"), owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all" });
  return <TaskCenterView title="My housing tasks" description="Your assigned move-in, document, maintenance, lease, payment, and follow-up tasks in one simple queue." basePath="applicant" center={center} searchParams={searchParams} />;
}
