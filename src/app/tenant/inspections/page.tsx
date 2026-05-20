export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeOccupancyStatuses } from "@/lib/relationship-lifecycle";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function TenantInspectionsPage() {
  const user = await requireRole(["TENANT"], "/tenant/inspections");
  const inspections = await prisma.inspection.findMany({
    where: {
      OR: [
        { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
        { unit: { occupancies: { some: { userId: user.userId, status: { in: activeOccupancyStatuses() } } } } }
      ]
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    include: { unit: { include: { property: true } }, application: true, checklistItems: true }
  });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Resident inspections</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Inspections</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Track scheduled inspections, results, and reinspection needs connected to your home.</p>
      </div>
      <div className="grid gap-4">
        {inspections.map((inspection) => (
          <article key={inspection.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label(inspection.status)}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{inspection.unit.property.name} - Unit {inspection.unit.unitNumber}</h2>
            <p className="mt-2 text-slate-600">Scheduled: {inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{inspection.checklistItems.length} checklist items</p>
          </article>
        ))}
        {inspections.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">No inspections scheduled</h2>
            <p className="mt-2 text-slate-600">Upcoming inspection appointments and completed inspection results will appear here.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
