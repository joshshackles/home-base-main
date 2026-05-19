export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function LandlordInspectionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], `/landlord/inspections/${params.id}`);
  const inspection = await prisma.inspection.findFirst({
    where: { id: params.id, unit: { property: { ownerId: user.userId } } },
    include: { unit: { include: { property: true } }, application: true, checklistItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!inspection) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Inspection Detail" description={`${inspection.unit.property.name} - Unit ${inspection.unit.unitNumber}`} />
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Checklist</h2>
          <div className="mt-4 space-y-3">
            {inspection.checklistItems.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-950">{item.label}</p><p className="mt-1 text-sm text-slate-600">Status: {label(item.status)}</p>{item.notes ? <p className="mt-2 text-sm text-slate-600">{item.notes}</p> : null}</div>)}
          </div>
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Status</dt><dd>{label(inspection.status)}</dd></div><div><dt className="font-bold text-slate-500">Scheduled</dt><dd>{inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled"}</dd></div><div><dt className="font-bold text-slate-500">Completed</dt><dd>{inspection.completedAt ? inspection.completedAt.toLocaleString() : "Not completed"}</dd></div><div><dt className="font-bold text-slate-500">Result</dt><dd>{inspection.resultSummary || "No result summary yet."}</dd></div></dl>
        </aside>
      </section>
    </main>
  );
}
