import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function ApplicantInspectionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], `/applicant/inspections/${params.id}`);
  const inspection = await prisma.inspection.findFirst({
    where: { id: params.id, application: { applicantUserId: user.userId } },
    include: { unit: { include: { property: true } }, application: true, checklistItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!inspection) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Inspection</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">{inspection.unit.property.name} - Unit {inspection.unit.unitNumber}</h1>
        <p className="mt-2 text-slate-600">Status: {label(inspection.status)}</p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Checklist</h2>
          <div className="mt-4 space-y-3">
            {inspection.checklistItems.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-950">{item.label}</p><p className="mt-1 text-sm text-slate-600">Status: {label(item.status)}</p>{item.notes ? <p className="mt-2 text-sm text-slate-600">{item.notes}</p> : null}</div>)}
          </div>
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Scheduled</dt><dd>{inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled"}</dd></div><div><dt className="font-bold text-slate-500">Completed</dt><dd>{inspection.completedAt ? inspection.completedAt.toLocaleString() : "Not completed"}</dd></div><div><dt className="font-bold text-slate-500">Result</dt><dd>{inspection.resultSummary || "No result summary yet."}</dd></div></dl>
        </aside>
      </section>
    </main>
  );
}
