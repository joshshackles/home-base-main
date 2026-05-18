import { requireRole } from "@/lib/auth";
import { getNoticeCenter, getNoticeFormOptions } from "@/lib/notices";
import { NoticeCenterView } from "@/components/notices/NoticeCenterView";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminNoticesPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireRole(["ADMIN"], "/admin/notices");
  const [center, options] = await Promise.all([
    getNoticeCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), type: getParam(searchParams, "type"), audience: getParam(searchParams, "audience"), scope: getParam(searchParams, "scope") === "mine" ? "mine" : "all" }),
    getNoticeFormOptions(user)
  ]);
  return <NoticeCenterView title="Admin notices" description="Create, send, acknowledge, and audit rent reminders, late notices, entry notices, lease renewal/non-renewal notices, policy notices, and move-out communications across the platform." basePath="admin" center={center} searchParams={searchParams} canCreate users={options.users.map((u) => ({ id: u.id, label: `${u.name || u.email} · ${u.role}` }))} properties={options.properties.map((p) => ({ id: p.id, label: `${p.name} · ${p.city}, ${p.state}` }))} units={options.units.map((u) => ({ id: u.id, label: `${u.property.name} #${u.unitNumber}` }))} applications={options.applications.map((a) => ({ id: a.id, label: `${a.applicantName} · ${a.unit.property.name} #${a.unit.unitNumber} · ${a.status}` }))} leasePackets={options.leasePackets.map((l) => ({ id: l.id, label: `${l.title} · ${l.application.applicantName} · ${l.status}` }))} />;
}
