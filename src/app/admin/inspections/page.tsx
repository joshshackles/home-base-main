import Link from "next/link";
import { InspectionStatus, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<InspectionStatus, string> = { SCHEDULED: "Scheduled", IN_PROGRESS: "In progress", PASSED: "Passed", FAILED: "Failed", NEEDS_REINSPECTION: "Needs reinspection", CANCELLED: "Cancelled" };

export default async function AdminInspectionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const status = getFilter(searchParams, "status");
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.InspectionWhereInput = {
    ...(status ? { status: status as InspectionStatus } : {}),
    ...(query ? { OR: [
      { inspectorName: { contains: query, mode: "insensitive" } },
      { notes: { contains: query, mode: "insensitive" } },
      { resultSummary: { contains: query, mode: "insensitive" } },
      { unit: { unitNumber: { contains: query, mode: "insensitive" } } },
      { unit: { property: { name: { contains: query, mode: "insensitive" } } } },
      { application: { applicantName: { contains: query, mode: "insensitive" } } }
    ] } : {})
  };
  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({ where, orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }], include: { unit: { include: { property: true } }, application: true, assignedTo: true, checklistItems: true }, take, skip }),
    prisma.inspection.count({ where })
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Inspections" description="Schedule inspections, track pass/fail results, and keep inspection history connected to units and applications." actionHref="/admin/inspections/new" actionLabel="Schedule Inspection" />
      <AdminListControls searchPlaceholder="Search inspections by property, unit, applicant, inspector, or notes..." defaultQuery={query}>
        <FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(InspectionStatus).map((value) => ({ value, label: statusLabels[value] }))]} />
      </AdminListControls>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Scheduled</th><th className="px-5 py-4">Inspector</th><th className="px-5 py-4">Checklist</th><th className="px-5 py-4">Application</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
        {inspections.map((inspection) => { const complete = inspection.checklistItems.filter((item) => item.status !== "PENDING").length; return <tr key={inspection.id}><td className="px-5 py-4 font-bold text-slate-950">{inspection.unit.property.name}<br/><span className="font-medium text-slate-500">Unit {inspection.unit.unitNumber}</span></td><td className="px-5 py-4">{statusLabels[inspection.status]}</td><td className="px-5 py-4">{inspection.scheduledFor ? inspection.scheduledFor.toLocaleString() : "Not scheduled"}</td><td className="px-5 py-4">{inspection.assignedTo?.name || inspection.inspectorName || "Unassigned"}</td><td className="px-5 py-4">{complete}/{inspection.checklistItems.length}</td><td className="px-5 py-4">{inspection.application ? inspection.application.applicantName : "None"}</td><td className="px-5 py-4"><Link className="font-bold text-brand-700 hover:text-brand-900" href={`/admin/inspections/${inspection.id}`}>Open</Link></td></tr>; })}
        {inspections.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No inspections match the current search.</td></tr> : null}
      </tbody></table></div>
      <Pagination pathname="/admin/inspections" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} />
    </main>
  );
}
