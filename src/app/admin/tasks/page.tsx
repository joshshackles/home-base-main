export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTaskCenter } from "@/lib/tasks";
import { TaskCenterView } from "@/components/tasks/TaskCenterView";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminTasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["ADMIN"], "/admin/tasks");
  const [center, users, properties, units, applications, maintenanceRequests, leasePackets, documents] = await Promise.all([
    getTaskCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), priority: getParam(searchParams, "priority"), type: getParam(searchParams, "type"), owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all" }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ role: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true, role: true }, take: 250 }),
    prisma.property.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true, state: true }, take: 250 }),
    prisma.unit.findMany({ where: { NOT: { status: "ARCHIVED" } }, include: { property: { select: { name: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 300 }),
    prisma.application.findMany({ include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.maintenanceRequest.findMany({ include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.leasePacket.findMany({ include: { application: { include: { unit: { include: { property: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.document.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, category: true }, take: 200 })
  ]);

  return <TaskCenterView title="Admin tasks" description="A universal task and work-order queue for leasing, maintenance, documents, collections, move-ins, move-outs, vendors, and operational follow-up." basePath="admin" center={center} searchParams={searchParams} canCreate users={users.map((u) => ({ id: u.id, label: `${u.name || u.email} · ${u.role}` }))} properties={properties.map((p) => ({ id: p.id, label: `${p.name} · ${p.city}, ${p.state}` }))} units={units.map((u) => ({ id: u.id, label: `${u.property.name} #${u.unitNumber}` }))} applications={applications.map((a) => ({ id: a.id, label: `${a.applicantName} · ${a.unit.property.name} #${a.unit.unitNumber}` }))} maintenanceRequests={maintenanceRequests.map((r) => ({ id: r.id, label: `${r.subject} · ${r.unit?.property.name ?? "No rental"}` }))} leasePackets={leasePackets.map((l) => ({ id: l.id, label: `${l.title} · ${l.application.applicantName}` }))} documents={documents.map((d) => ({ id: d.id, label: `${d.title} · ${d.category}` }))} />;
}
