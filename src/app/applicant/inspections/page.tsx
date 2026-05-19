export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function ApplicantInspectionsPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/inspections");
  const inspections = await prisma.inspection.findMany({
    where: { application: { applicantUserId: user.userId } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    include: { unit: { include: { property: true } }, application: true, checklistItems: true }
  });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Applicant</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Inspections</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Track inspections connected to your active applications.</p>
      </div>
      <div className="grid gap-4">
        {inspections.map((inspection) => <Link key={inspection.id} href={`/applicant/inspections/${inspection.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label(inspection.status)}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{inspection.unit.property.name} - Unit {inspection.unit.unitNumber}</h2><p className="mt-2 text-slate-600">Scheduled: {inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled yet"}</p></Link>)}
        {inspections.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">No inspections are connected to your applications yet.</div> : null}
      </div>
    </main>
  );
}
