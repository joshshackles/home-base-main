export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTaskCenter } from "@/lib/tasks";
import { TaskCenterView } from "@/components/tasks/TaskCenterView";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LandlordTasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/tasks");
  const portfolioWhere = { ownerId: user.userId, isArchived: false };
  const [center, users, properties, units, applications, maintenanceRequests, leasePackets, documents] = await Promise.all([
    getTaskCenter(user, { q: getParam(searchParams, "q"), status: getParam(searchParams, "status"), priority: getParam(searchParams, "priority"), type: getParam(searchParams, "type"), owner: getParam(searchParams, "owner") === "mine" ? "mine" : "all" }),
    prisma.user.findMany({ where: { OR: [{ id: user.userId }, { targetConnections: { some: { landlordUserId: user.userId, status: "ACTIVE" } } }] }, orderBy: { email: "asc" }, select: { id: true, name: true, email: true, role: true }, take: 200 }),
    prisma.property.findMany({ where: portfolioWhere, orderBy: { name: "asc" }, select: { id: true, name: true, city: true, state: true }, take: 250 }),
    prisma.unit.findMany({ where: { property: portfolioWhere, NOT: { status: "ARCHIVED" } }, include: { property: { select: { name: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 300 }),
    prisma.application.findMany({ where: { unit: { property: portfolioWhere } }, include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.maintenanceRequest.findMany({ where: { unit: { property: portfolioWhere } }, include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.leasePacket.findMany({ where: { application: { unit: { property: portfolioWhere } } }, include: { application: { include: { unit: { include: { property: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.document.findMany({ where: { OR: [{ property: portfolioWhere }, { unit: { property: portfolioWhere } }, { application: { unit: { property: portfolioWhere } } }] }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, category: true }, take: 200 })
  ]);

  return <TaskCenterView title="Rental tasks" description="A compact owner workbench for leasing follow-up, move-in steps, repairs, document requests, collections, vendor coordination, and staff assignments." basePath="landlord" center={center} searchParams={searchParams} canCreate users={users.map((u) => ({ id: u.id, label: `${u.name || u.email} · ${u.role}` }))} properties={properties.map((p) => ({ id: p.id, label: `${p.name} · ${p.city}, ${p.state}` }))} units={units.map((u) => ({ id: u.id, label: `${u.property.name} #${u.unitNumber}` }))} applications={applications.map((a) => ({ id: a.id, label: `${a.applicantName} · ${a.unit.property.name} #${a.unit.unitNumber}` }))} maintenanceRequests={maintenanceRequests.map((r) => ({ id: r.id, label: `${r.subject} · ${r.unit?.property.name ?? "No rental"}` }))} leasePackets={leasePackets.map((l) => ({ id: l.id, label: `${l.title} · ${l.application.applicantName}` }))} documents={documents.map((d) => ({ id: d.id, label: `${d.title} · ${d.category}` }))} />;
}
