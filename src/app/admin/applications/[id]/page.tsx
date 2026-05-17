import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationStatus, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility } from "@prisma/client";
import {
  addApplicationNote,
  createDocumentRequest,
  createLeaseFromApplication,
  linkApplicationToApplicant,
  updateApplicationStatus,
  updateDocumentRequestStatus,
  updateDocumentStatus,
  uploadAdminDocument
} from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function requestBadge(status: string) {
  const tone = status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : status === "REJECTED" ? "bg-rose-100 text-rose-800" : status === "SUBMITTED" ? "bg-amber-100 text-amber-800" : status === "WAIVED" ? "bg-slate-200 text-slate-700" : "bg-brand-100 text-brand-800";
  return `rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`;
}

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      unit: { include: { property: true } },
      lead: true,
      applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
      notes: { orderBy: { createdAt: "desc" } },
      documents: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      documentRequests: { include: { fulfilledDocument: true, requestedBy: true }, orderBy: { createdAt: "desc" } },
      leasePackets: { include: { template: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!application) notFound();

  const openRequests = application.documentRequests.filter((request) => ["REQUESTED", "REJECTED"].includes(request.status));
  const submittedRequests = application.documentRequests.filter((request) => request.status === "SUBMITTED");
  const acceptedRequests = application.documentRequests.filter((request) => request.status === "ACCEPTED");
  const leaseTemplates = await prisma.leaseTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={application.applicantName}
        description="Track application status, required documents, applicant uploads, and internal review notes."
        actionHref="/admin/applications"
        actionLabel="Back to applications"
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-slate-500">Email</p><p className="mt-1 font-semibold text-slate-900">{application.applicantEmail}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Phone</p><p className="mt-1 font-semibold text-slate-900">{application.applicantPhone ?? "Not provided"}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Status</p><p className="mt-1 font-semibold text-slate-900">{label(application.status)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Started</p><p className="mt-1 font-semibold text-slate-900">{application.createdAt.toLocaleString()}</p></div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700">
              <p className="text-xs font-bold uppercase text-slate-500">Summary</p>
              <p className="mt-2 leading-7">{application.summary ?? "No summary provided."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Document checklist</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Request specific documents from the applicant and review each upload when it comes back.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-950">{openRequests.length}</p><p>Missing</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-950">{submittedRequests.length}</p><p>Review</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-950">{acceptedRequests.length}</p><p>Accepted</p></div>
              </div>
            </div>

            <form action={createDocumentRequest} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <Field label="Request title"><input name="title" className={inputClass} placeholder="Example: Most recent paystub" required /></Field>
              <Field label="Category"><select name="category" className={selectClass} defaultValue="PROOF_OF_INCOME">{Object.values(DocumentCategory).map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></Field>
              <Field label="Visibility"><select name="visibility" className={selectClass} defaultValue="APPLICANT">{Object.values(DocumentVisibility).filter((visibility) => visibility !== "INTERNAL").map((visibility) => <option key={visibility} value={visibility}>{label(visibility)}</option>)}</select></Field>
              <Field label="Due date"><input name="dueDate" type="date" className={inputClass} /></Field>
              <Field label="Instructions"><textarea name="instructions" className={textareaClass} placeholder="Tell the applicant exactly what to upload." /></Field>
              <button type="submit" className="self-end rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Request Document</button>
            </form>

            <div className="mt-6 space-y-3">
              {application.documentRequests.length === 0 ? <p className="text-slate-600">No document requests have been created for this application yet.</p> : application.documentRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{request.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{label(request.category)}{request.dueDate ? ` · Due ${request.dueDate.toLocaleDateString()}` : ""}</p>
                      {request.instructions ? <p className="mt-2 text-sm leading-6 text-slate-700">{request.instructions}</p> : null}
                      {request.reviewNotes ? <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>Review note:</strong> {request.reviewNotes}</p> : null}
                      {request.fulfilledDocument ? <Link href={`/api/documents/${request.fulfilledDocument.id}`} className="mt-3 inline-flex rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">Download Upload</Link> : null}
                    </div>
                    <span className={requestBadge(request.status)}>{label(request.status)}</span>
                  </div>
                  <form action={updateDocumentRequestStatus} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <select name="status" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" defaultValue={request.status}>{Object.values(DocumentRequestStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
                    <input name="reviewNotes" className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs" defaultValue={request.reviewNotes ?? ""} placeholder="Review note or rejection reason" />
                    <button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Save Request</button>
                  </form>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application documents</h2>
            <form action={uploadAdminDocument} className="mt-5 grid gap-4 md:grid-cols-2" encType="multipart/form-data">
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="visibility" value="APPLICANT" />
              <Field label="Document title"><input name="title" className={inputClass} placeholder="Example: Proof of income" required /></Field>
              <Field label="Category"><select name="category" className={selectClass} defaultValue="OTHER">{Object.values(DocumentCategory).map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></Field>
              <Field label="File"><input name="file" type="file" className={inputClass} required /></Field>
              <Field label="Notes"><input name="notes" className={inputClass} placeholder="Optional note" /></Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2">Upload Document</button>
            </form>

            <div className="mt-6 space-y-3">
              {application.documents.length === 0 ? <p className="text-slate-600">No documents have been attached to this application yet.</p> : application.documents.map((document) => (
                <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{label(document.category)} · {label(document.visibility)} · {document.originalName}</p>
                      {document.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">{document.notes}</p> : null}
                    </div>
                    <Link href={`/api/documents/${document.id}`} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">Download</Link>
                  </div>
                  <form action={updateDocumentStatus} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="documentId" value={document.id} />
                    <select name="status" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" defaultValue={document.status}>{Object.values(DocumentStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
                    <input name="notes" className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs" defaultValue={document.notes ?? ""} placeholder="Review note" />
                    <button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Save Review</button>
                  </form>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application notes</h2>
            <form action={addApplicationNote} className="mt-5 space-y-4">
              <input type="hidden" name="applicationId" value={application.id} />
              <Field label="Add note"><textarea name="note" className={textareaClass} placeholder="Example: Applicant will bring income documents tomorrow." required /></Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Note</button>
            </form>
            <div className="mt-6 space-y-3">
              {application.notes.length === 0 ? <p className="text-slate-600">No notes have been added yet.</p> : application.notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4" >
                  <p className="leading-7 text-slate-700">{note.note}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Requested unit</h2>
            <p className="mt-3 text-lg font-bold text-slate-950">{application.unit.property.name} #{application.unit.unitNumber}</p>
            <p className="text-slate-600">{application.unit.property.city}, {application.unit.property.state}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(application.unit.rentAmount)}</p>
            <Link href={`/marketplace/${application.unit.id}`} className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">View listing</Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Lease packets</h2>
            <div className="mt-4 space-y-3">
              {application.leasePackets.length === 0 ? <p className="text-sm leading-6 text-slate-600">No lease packet has been created for this application yet.</p> : application.leasePackets.map((packet) => (
                <Link key={packet.id} href={`/admin/leases/${packet.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
                  <p className="font-bold text-slate-950">{packet.template.name}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label(packet.status)}</p>
                  <p className="mt-1 text-xs text-slate-500">Created {packet.createdAt.toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
            {application.status === "APPROVED" ? (
              <form action={createLeaseFromApplication} className="mt-5 space-y-4 rounded-2xl bg-slate-50 p-4">
                <input type="hidden" name="applicationId" value={application.id} />
                <Field label="Lease template"><select name="templateId" className={selectClass} required>{leaseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
                <Field label="Start date"><input name="leaseStartDate" type="date" className={inputClass} /></Field>
                <Field label="End date"><input name="leaseEndDate" type="date" className={inputClass} /></Field>
                <Field label="Monthly rent"><input name="monthlyRent" type="number" min="0" className={inputClass} defaultValue={application.unit.rentAmount} required /></Field>
                <Field label="Security deposit"><input name="securityDeposit" type="number" min="0" className={inputClass} defaultValue={application.unit.deposit ?? ""} /></Field>
                <Field label="Lease terms"><textarea name="terms" className={textareaClass} placeholder="Optional terms to place in the lease preview." /></Field>
                <Field label="Internal notes"><textarea name="notes" className={textareaClass} placeholder="Optional internal note." /></Field>
                <button type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" disabled={leaseTemplates.length === 0}>{leaseTemplates.length === 0 ? "Create a template first" : "Create Lease Packet"}</button>
              </form>
            ) : (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Approve this application before creating a lease packet.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Applicant portal account</h2>
            {application.applicantUser ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p><strong>User:</strong> {application.applicantUser.name ?? application.applicantUser.email}</p>
                <p><strong>Email:</strong> {application.applicantUser.email}</p>
                <p><strong>Profile:</strong> {application.applicantUser.applicantProfile ? "Started" : "Not started"}</p>
                <p><strong>Household members:</strong> {application.applicantUser.applicantProfile?.householdMembers.length ?? 0}</p>
                <p><strong>Income sources:</strong> {application.applicantUser.applicantProfile?.incomeSources.length ?? 0}</p>
              </div>
            ) : (
              <form action={linkApplicationToApplicant} className="mt-4 space-y-4">
                <input type="hidden" name="applicationId" value={application.id} />
                <p className="text-sm leading-6 text-slate-600">Connect this application to an active applicant account so the applicant can complete their profile and submit updates from the portal.</p>
                <Field label="Applicant account email"><input name="applicantEmail" type="email" defaultValue={application.applicantEmail} className={inputClass} required /></Field>
                <button type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Connect Account</button>
              </form>
            )}
          </div>

          <form action={updateApplicationStatus} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="id" value={application.id} />
            <Field label="Application status"><select name="status" className={selectClass} defaultValue={application.status}>{Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
            <button type="submit" className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Update Status</button>
          </form>

          {application.lead ? (
            <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Original lead</h2>
              <p className="mt-2 text-slate-700">This application was created from a marketplace inquiry.</p>
              <Link href={`/admin/leads/${application.lead.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Lead</Link>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
