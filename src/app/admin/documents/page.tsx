import Link from "next/link";
import { DocumentCategory, DocumentStatus, DocumentVisibility, Prisma } from "@prisma/client";
import { deleteDocument, updateDocumentStatus, uploadAdminDocument } from "@/app/admin/actions";
import { AdminListControls, FilterSelect } from "@/components/admin/AdminListControls";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { DEFAULT_PAGE_SIZE, SearchParams, getFilter, getPagination, getSearchQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminDocumentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const query = getSearchQuery(searchParams);
  const status = getFilter(searchParams, "status");
  const category = getFilter(searchParams, "category");
  const { page, take, skip } = getPagination(searchParams);
  const where: Prisma.DocumentWhereInput = {
    ...(status ? { status: status as DocumentStatus } : {}),
    ...(category ? { category: category as DocumentCategory } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: "insensitive" } },
      { originalName: { contains: query, mode: "insensitive" } },
      { notes: { contains: query, mode: "insensitive" } },
      { application: { applicantName: { contains: query, mode: "insensitive" } } },
      { property: { name: { contains: query, mode: "insensitive" } } },
      { unit: { unitNumber: { contains: query, mode: "insensitive" } } }
    ] } : {})
  };
  const [documents, documentTotal, applications, properties, units, requests] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        application: { include: { unit: { include: { property: true } } } },
        property: true,
        unit: { include: { property: true } },
        uploadedBy: true,
        reviewedBy: true
      },
      orderBy: { createdAt: "desc" },
      take,
      skip
    }),
    prisma.document.count({ where }),
    prisma.application.findMany({ include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.property.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { NOT: { status: "ARCHIVED" } }, include: { property: true }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }] }),
    prisma.documentRequest.findMany({ where: { status: { in: ["REQUESTED", "SUBMITTED", "REJECTED"] } }, include: { application: { include: { unit: { include: { property: true } } } }, fulfilledDocument: true }, orderBy: { createdAt: "desc" }, take: 12 })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Documents" description="Upload, categorize, review, and manage files connected to applications, properties, and units." />
      <AdminListControls searchPlaceholder="Search documents by title, filename, applicant, property, unit, or notes..." defaultQuery={query}>
        <FilterSelect name="status" label="Status" defaultValue={status ?? ""} options={[{ value: "", label: "All statuses" }, ...Object.values(DocumentStatus).map((value) => ({ value, label: label(value) }))]} />
        <FilterSelect name="category" label="Category" defaultValue={category ?? ""} options={[{ value: "", label: "All categories" }, ...Object.values(DocumentCategory).map((value) => ({ value, label: label(value) }))]} />
      </AdminListControls>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Open document requests</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">A quick queue of missing, rejected, or newly submitted documents across applications.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">{requests.length} shown</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {requests.length === 0 ? <p className="text-slate-600">No open document requests need attention.</p> : requests.map((request) => (
            <Link key={request.id} href={`/admin/applications/${request.applicationId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-brand-200 hover:bg-brand-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{request.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.application.applicantName}</p>
                  <p className="mt-1 text-xs text-slate-500">{request.application.unit.property.name} #{request.application.unit.unitNumber}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(request.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form action={uploadAdminDocument} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" encType="multipart/form-data">
          <h2 className="text-2xl font-black text-slate-950">Upload document</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Attach at least one record type. Application documents are preferred when the document belongs to an applicant file.</p>
          <div className="mt-5 space-y-4">
            <Field label="Document title"><input name="title" className={inputClass} placeholder="Example: Photo ID" required /></Field>
            <Field label="Category"><select name="category" className={selectClass} defaultValue="OTHER">{Object.values(DocumentCategory).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
            <Field label="Visibility"><select name="visibility" className={selectClass} defaultValue="INTERNAL">{Object.values(DocumentVisibility).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
            <Field label="Application"><select name="applicationId" className={selectClass} defaultValue=""><option value="">No application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} · {application.unit.property.name} #{application.unit.unitNumber}</option>)}</select></Field>
            <Field label="Property"><select name="propertyId" className={selectClass} defaultValue=""><option value="">No property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></Field>
            <Field label="Unit"><select name="unitId" className={selectClass} defaultValue=""><option value="">No unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select></Field>
            <Field label="File"><input name="file" type="file" className={inputClass} required /></Field>
            <Field label="Notes"><textarea name="notes" className={textareaClass} placeholder="Optional internal document note." /></Field>
            <button type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Upload Document</button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-4">Document</th><th className="px-5 py-4">Attached To</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Visibility</th><th className="px-5 py-4">Uploaded</th><th className="px-5 py-4">Review</th><th className="px-5 py-4">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No documents match the current search.</td></tr> : documents.map((document) => (
                <tr key={document.id} className="align-top hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-black text-slate-950">{document.title}</p><p className="mt-1 text-xs text-slate-500">{label(document.category)} · {fileSize(document.sizeBytes)}</p><p className="mt-1 text-xs text-slate-500">{document.originalName}</p></td>
                  <td className="px-5 py-4 text-slate-700">
                    {document.application ? <Link className="font-bold text-brand-700 hover:underline" href={`/admin/applications/${document.application.id}`}>{document.application.applicantName}</Link> : null}
                    {document.property ? <p>{document.property.name}</p> : null}
                    {document.unit ? <p>{document.unit.property.name} #{document.unit.unitNumber}</p> : null}
                    {!document.application && !document.property && !document.unit ? "Unattached" : null}
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(document.status)}</span></td>
                  <td className="px-5 py-4 text-slate-600">{label(document.visibility)}</td>
                  <td className="px-5 py-4 text-slate-600"><p>{document.createdAt.toLocaleDateString()}</p><p className="mt-1 text-xs">{document.uploadedBy?.name ?? document.uploadedBy?.email ?? "Unknown"}</p></td>
                  <td className="px-5 py-4">
                    <form action={updateDocumentStatus} className="space-y-2">
                      <input type="hidden" name="documentId" value={document.id} />
                      <select name="status" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" defaultValue={document.status}>{Object.values(DocumentStatus).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
                      <textarea name="notes" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs" defaultValue={document.notes ?? ""} placeholder="Review notes" />
                      <button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Save</button>
                    </form>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <Link href={`/api/documents/${document.id}`} className="rounded-xl bg-brand-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-brand-700">Download</Link>
                      <form action={deleteDocument}><input type="hidden" name="documentId" value={document.id} /><button className="w-full rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Remove</button></form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Pagination pathname="/admin/documents" searchParams={searchParams} page={page} pageSize={DEFAULT_PAGE_SIZE} total={documentTotal} />
    </main>
  );
}
