import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function LandlordInspectionsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/inspections");
  const inspections = await prisma.inspection.findMany({
    where: { unit: { property: { ownerId: user.userId } } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    include: { unit: { include: { property: true } }, application: true, checklistItems: true }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Inspections" description="Review scheduled inspections and inspection outcomes for your assigned units." />
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Scheduled</th><th className="px-5 py-4">Checklist</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {inspections.map((inspection) => <tr key={inspection.id}><td className="px-5 py-4 font-bold">{inspection.unit.property.name} Unit {inspection.unit.unitNumber}</td><td className="px-5 py-4">{label(inspection.status)}</td><td className="px-5 py-4">{inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled"}</td><td className="px-5 py-4">{inspection.checklistItems.filter((item) => item.status !== "PENDING").length}/{inspection.checklistItems.length}</td><td className="px-5 py-4"><Link href={`/landlord/inspections/${inspection.id}`} className="font-bold text-brand-700">Open</Link></td></tr>)}
            {inspections.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No inspections are connected to your units yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
