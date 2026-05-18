export const dynamic = "force-dynamic";

import Link from "next/link";
import { LeasePacketStatus, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }
function statusTone(status: LeasePacketStatus) { if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800"; if (status === "APPROVED") return "bg-blue-100 text-blue-800"; if (status === "SENT_FOR_SIGNATURE") return "bg-purple-100 text-purple-800"; if (status === "READY_FOR_REVIEW") return "bg-amber-100 text-amber-800"; if (status === "VOIDED") return "bg-rose-100 text-rose-800"; return "bg-slate-100 text-slate-700"; }

export default async function LeasesAdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const status = getFilter(searchParams, "status");
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.LeasePacketWhereInput = {
    ...(status ? { status: status as LeasePacketStatus } : {}),
    ...(query ? { OR: [
      { application: { applicantName: { contains: query, mode: "insensitive" } } },
      { application: { applicantEmail: { contains: query, mode: "insensitive" } } },
      { application: { unit: { unitNumber: { contains: query, mode: "insensitive" } } } },
      { application: { unit: { property: { name: { contains: query, mode: "insensitive" } } } } },
      { template: { name: { contains: query, mode: "insensitive" } } }
    ] } : {})
  };
  const [packets, total, templates, allPacketStatuses] = await Promise.all([
    prisma.leasePacket.findMany({ where, include: { template: true, application: { include: { unit: { include: { property: true } } } }, packetNotes: true, signatureRequests: true }, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.leasePacket.count({ where }),
    prisma.leaseTemplate.count({ where: { isActive: true } }),
    prisma.leasePacket.groupBy({ by: ["status"], _count: { _all: true } })
  ]);
  const countFor = (s: LeasePacketStatus) => allPacketStatuses.find((item) => item.status === s)?._count._all ?? 0;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Lease builder" description="Create and review lease packets from approved applications, generate PDF versions, and manage signature workflows." actionHref="/admin/leases/templates" actionLabel="Manage templates" />
      <div className="mb-6 grid gap-4 md:grid-cols-4"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Lease packets</p><p className="mt-2 text-4xl font-black text-slate-950">{allPacketStatuses.reduce((sum, item) => sum + item._count._all, 0)}</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Out for signature</p><p className="mt-2 text-4xl font-black text-slate-950">{countFor("SENT_FOR_SIGNATURE")}</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Completed</p><p className="mt-2 text-4xl font-black text-slate-950">{countFor("COMPLETED")}</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Active templates</p><p className="mt-2 text-4xl font-black text-slate-950">{templates}</p></div></div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">Lease lifecycle engine</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Draft → Review → Signature → Active lease</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Lease packets now operate as workflow records: template selection, rent/deposit terms, signing state, final PDF generation, ledger handoff, and renewal readiness are visible from one compact command surface.</p>
          </div>
          <Link href="/admin/leases/templates" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Clause/templates</Link>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {["Draft", "Ready for review", "Sent for signature", "Completed", "Renewal/Archive"].map((step, index) => (
            <div key={step} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase text-slate-500">Step {index + 1}</p>
              <p className="mt-1 text-sm font-black text-slate-950">{step}</p>
            </div>
          ))}
        </div>
      </section>
      <AdminListControls searchPlaceholder="Search leases by applicant, email, property, unit, or template..." defaultQuery={query}><FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(LeasePacketStatus).map((value) => ({ value, label: label(value) }))]} /></AdminListControls>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1100px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Applicant</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Template</th><th className="px-5 py-4">Rent</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Signatures</th><th className="px-5 py-4">Created</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-200">
        {packets.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-600">No lease packets match the current search.</td></tr> : packets.map((packet) => <tr key={packet.id} className="align-top hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold text-slate-950">{packet.application.applicantName}</p><p className="mt-1 text-slate-600">{packet.application.applicantEmail}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-950">{packet.application.unit.property.name} #{packet.application.unit.unitNumber}</p><p className="mt-1 text-xs text-slate-500">{packet.application.unit.property.city}, {packet.application.unit.property.state}</p></td><td className="px-5 py-4 text-slate-700">{packet.template.name}</td><td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(packet.monthlyRent)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusTone(packet.status)}`}>{label(packet.status)}</span></td><td className="px-5 py-4 text-slate-600">{packet.signatureRequests.filter((request) => request.status === "SIGNED").length}/{packet.signatureRequests.length}</td><td className="px-5 py-4 text-slate-600">{packet.createdAt.toLocaleDateString()}</td><td className="px-5 py-4"><Link href={`/admin/leases/${packet.id}`} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">Open</Link></td></tr>)}
      </tbody></table></div>
      <Pagination pathname="/admin/leases" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} />
    </main>
  );
}
