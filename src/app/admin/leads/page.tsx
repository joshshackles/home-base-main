import Link from "next/link";
import { LeadStatus, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LeadsAdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const status = getFilter(searchParams, "status");
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.LeadWhereInput = {
    ...(status ? { status: status as LeadStatus } : {}),
    ...(query ? {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { message: { contains: query, mode: "insensitive" } },
        { unit: { unitNumber: { contains: query, mode: "insensitive" } } },
        { unit: { property: { name: { contains: query, mode: "insensitive" } } } }
      ]
    } : {})
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { unit: { include: { property: true } }, application: true, notes: true },
      orderBy: { createdAt: "desc" },
      take,
      skip
    }),
    prisma.lead.count({ where })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Leads" description="Review public marketplace inquiries, track follow-up, and convert qualified leads into application records." />
      <AdminListControls searchPlaceholder="Search leads by name, email, phone, unit, property, or message..." defaultQuery={query}>
        <FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(LeadStatus).map((value) => ({ value, label: label(value) }))]} />
      </AdminListControls>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Lead</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Rent</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Notes</th><th className="px-5 py-4">Received</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {leads.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-600">No leads match the current search.</td></tr> : leads.map((lead) => (
              <tr key={lead.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4"><p className="font-bold text-slate-950">{lead.name}</p><p className="mt-1 text-xs text-slate-500">Lead ID: {lead.id.slice(0, 8)}</p></td>
                <td className="px-5 py-4 text-slate-600"><p className="font-semibold text-slate-900">{lead.email}</p><p className="mt-1">{lead.phone ?? "No phone provided"}</p></td>
                <td className="px-5 py-4"><Link href={`/marketplace/${lead.unit.id}`} className="font-bold text-brand-700 hover:underline">{lead.unit.property.name} #{lead.unit.unitNumber}</Link><p className="mt-1 text-xs text-slate-500">{lead.unit.property.city}, {lead.unit.property.state}</p></td>
                <td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(lead.unit.rentAmount)}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(lead.status)}</span>{lead.application ? <p className="mt-2 text-xs font-bold text-brand-700">Application created</p> : null}</td>
                <td className="px-5 py-4 text-slate-600">{lead.notes.length}</td>
                <td className="px-5 py-4 text-slate-600">{lead.createdAt.toLocaleDateString()}</td>
                <td className="px-5 py-4"><Link href={`/admin/leads/${lead.id}`} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pathname="/admin/leads" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} />
    </main>
  );
}
