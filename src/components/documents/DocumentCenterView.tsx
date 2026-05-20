import Link from "next/link";
import { DocumentCategory, DocumentStatus, DocumentVisibility } from "@prisma/client";
import type { DocumentCenterDocument } from "@/lib/documents/center";
import { documentAttachmentHref, documentAttachmentLabel, documentFileSize, documentLabel, documentStatusTone } from "@/lib/documents/center";

export type DocumentCenterRequest = {
  id: string;
  title: string;
  category: DocumentCategory;
  status: string;
  dueDate: Date | null;
  instructions: string | null;
  reviewNotes: string | null;
  applicationId: string;
  application: { applicantName: string; unit: { unitNumber: string; property: { name: string } } };
  fulfilledDocument?: { id: string; originalName: string } | null;
};

type Props = {
  title: string;
  description: string;
  basePath: "admin" | "landlord" | "applicant" | "tenant";
  documents: DocumentCenterDocument[];
  requests: DocumentCenterRequest[];
  metrics: { total: number; accepted: number; pending: number; rejected: number; openRequests: number };
  searchParams?: Record<string, string | string[] | undefined>;
  uploadPanel?: React.ReactNode;
  canReview?: boolean;
};

function getParam(searchParams: Props["searchParams"], key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function metric(label: string, value: number, detail: string) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

export function DocumentCenterView({ title, description, basePath, documents, requests, metrics, searchParams, uploadPanel, canReview }: Props) {
  const q = getParam(searchParams, "q");
  const category = getParam(searchParams, "category");
  const status = getParam(searchParams, "status");
  const visibility = getParam(searchParams, "visibility");
  const pathname = `/${basePath}/documents`;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-700">Document Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Link href={`/${basePath}/notifications`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Notification settings</Link>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metric("Total files", metrics.total, "Visible to your account")}
        {metric("Accepted", metrics.accepted, "Reviewed or approved")}
        {metric("Pending", metrics.pending, "Uploaded or in review")}
        {metric("Rejected", metrics.rejected, "Needs replacement")}
        {metric("Requests", metrics.openRequests, "Open checklist items")}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <form action={pathname} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-lg font-black text-slate-950">Find documents</p>
            <div className="mt-4 space-y-3">
              <input name="q" defaultValue={q} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Search title, file, rental, applicant..." />
              <select name="category" defaultValue={category} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800">
                <option value="">All categories</option>
                {Object.values(DocumentCategory).map((value) => <option key={value} value={value}>{documentLabel(value)}</option>)}
              </select>
              <select name="status" defaultValue={status} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800">
                <option value="">All statuses</option>
                {Object.values(DocumentStatus).map((value) => <option key={value} value={value}>{documentLabel(value)}</option>)}
              </select>
              {basePath === "admin" ? <select name="visibility" defaultValue={visibility} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"><option value="">All visibility</option>{Object.values(DocumentVisibility).map((value) => <option key={value} value={value}>{documentLabel(value)}</option>)}</select> : null}
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Apply</button>
                <Link href={pathname} className="rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">Reset</Link>
              </div>
            </div>
          </form>
          {uploadPanel}
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
            <p className="font-black">Best practice</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Keep IDs, income records, lease packets, receipts, notices, and inspection photos attached to the rental or application they belong to. Shared visibility is safest for cross-role collaboration.</p>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-black text-slate-950">Open checklist requests</h2><p className="mt-1 text-sm text-slate-600">Requested, submitted, or rejected documents that still need attention.</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{requests.length} shown</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {requests.length === 0 ? <p className="text-sm text-slate-600">No open document requests.</p> : requests.map((request) => (
                <Link key={request.id} href={`/${basePath}/applications/${request.applicationId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:border-brand-200 hover:bg-brand-50">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{request.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{documentLabel(request.category)}</p><p className="mt-1 text-xs text-slate-600">{request.application.applicantName} · {request.application.unit.property.name} #{request.application.unit.unitNumber}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${documentStatusTone(request.status as never)}`}>{documentLabel(request.status)}</span></div>
                  {request.dueDate ? <p className="mt-2 text-xs font-bold text-amber-700">Due {request.dueDate.toLocaleDateString()}</p> : null}
                </Link>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="text-xl font-black text-slate-950">Document library</h2><p className="mt-1 text-sm text-slate-600">Dense file index across leases, IDs, receipts, applications, inspections, notices, and statements.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{documents.length} visible</span></div>
            <div className="divide-y divide-slate-200">
              {documents.length === 0 ? <p className="p-8 text-center text-slate-600">No documents match this view.</p> : documents.map((document) => (
                <article key={document.id} className="grid gap-3 p-4 hover:bg-slate-50 lg:grid-cols-[1.4fr_1fr_160px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{document.title}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${documentStatusTone(document.status)}`}>{documentLabel(document.status)}</span></div>
                    <p className="mt-1 text-xs text-slate-500">{documentLabel(document.category)} · {documentFileSize(document.sizeBytes)} · {document.originalName}</p>
                    {document.notes ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{document.notes}</p> : null}
                  </div>
                  <div className="text-sm text-slate-700"><Link className="font-bold text-brand-700 hover:underline" href={documentAttachmentHref(document, basePath)}>{documentAttachmentLabel(document)}</Link><p className="mt-1 text-xs text-slate-500">Uploaded {document.createdAt.toLocaleDateString()} by {document.uploadedBy?.name ?? document.uploadedBy?.email ?? "System"}</p><p className="mt-1 text-xs text-slate-500">Visibility: {documentLabel(document.visibility)}</p></div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end"><Link href={`/api/documents/${document.id}`} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700">Download</Link>{canReview ? <Link href={`/admin/documents?q=${encodeURIComponent(document.title)}`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Review</Link> : null}</div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
