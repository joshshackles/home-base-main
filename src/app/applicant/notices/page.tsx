export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getNoticeCenter } from "@/lib/notices";
import { NoticeCenterView } from "@/components/notices/NoticeCenterView";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ApplicantNoticesPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/notices");
  const center = await getNoticeCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), type: getParam(searchParams, "type"), audience: getParam(searchParams, "audience"), scope: "mine" });
  return <NoticeCenterView title="My notices" description="Review and acknowledge formal rent, lease, move-in, maintenance, entry, policy, and move-out notices tied to your housing account." basePath="applicant" center={center} searchParams={searchParams} />;
}
