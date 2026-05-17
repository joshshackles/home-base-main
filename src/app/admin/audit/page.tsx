import { AuditAction, Prisma } from "@prisma/client";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function niceDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AuditLogPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const action = getFilter(searchParams, "action");
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: action as AuditAction } : {}),
    ...(query ? { OR: [
      { actorEmail: { contains: query, mode: "insensitive" } },
      { entityType: { contains: query, mode: "insensitive" } },
      { entityId: { contains: query, mode: "insensitive" } },
      { message: { contains: query, mode: "insensitive" } }
    ] } : {})
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.auditLog.count({ where })
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader eyebrow="System" title="Audit Log" description="Review administrative and security-sensitive activity with search and pagination for larger audit histories." />
      <AdminListControls searchPlaceholder="Search audit logs by actor, entity, ID, or message..." defaultQuery={query}>
        <FilterSelect name="action" label="Action" defaultValue={action ?? ""} options={[{ value: "", label: "All actions" }, ...Object.values(AuditAction).map((value) => ({ value, label: value.replaceAll("_", " ") }))]} />
      </AdminListControls>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">When</th><th className="px-5 py-4">Actor</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Entity</th><th className="px-5 py-4">Message</th></tr></thead><tbody className="divide-y divide-slate-100">
        {logs.map((log) => <tr key={log.id} className="align-top"><td className="whitespace-nowrap px-5 py-4 text-slate-600">{niceDate(log.createdAt)}</td><td className="px-5 py-4"><p className="font-bold text-slate-900">{log.actorEmail || "System"}</p><p className="text-xs text-slate-500">{log.actorRole || "No role"}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{log.action}</span></td><td className="px-5 py-4 text-slate-700">{log.entityType}{log.entityId ? <span className="block text-xs text-slate-400">{log.entityId}</span> : null}</td><td className="px-5 py-4 text-slate-700">{log.message}</td></tr>)}
        {logs.length === 0 ? <tr><td className="px-5 py-10 text-center text-slate-500" colSpan={5}>No audit events match the current search.</td></tr> : null}
      </tbody></table></div></div>
      <Pagination pathname="/admin/audit" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} />
    </main>
  );
}
