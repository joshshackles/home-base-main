export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationStatus, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility } from "@prisma/client";
import {
  activateTenantFromApplicationAction,
  endAdminTenantOccupancyAction,
  addApplicationNote,
  createDocumentRequest,
  createRecommendedApplicationDocumentRequests,
  createLeaseFromApplication,
  generateApplicationClaimLink,
  linkApplicationToApplicant,
  recordApplicationReviewDecision,
  updateApplicationStatus,
  updateDocumentRequestStatus,
  updateDocumentStatus,
  uploadAdminDocument
} from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { formatCurrency } from "@/lib/format";
import { buildStaffApplicationReview } from "@/lib/application-review";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function detailValue(value: string | Date | null | undefined) {
  if (!value) return "Not provided";
  if (value instanceof Date) return value.toLocaleDateString();
  return value;
}

function requestBadge(status: string) {
  const tone = status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : status === "REJECTED" ? "bg-rose-100 text-rose-800" : status === "SUBMITTED" ? "bg-amber-100 text-amber-800" : status === "WAIVED" ? "bg-slate-200 text-slate-700" : "bg-brand-100 text-brand-800";
  return `rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`;
}

export default async function ApplicationDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { claimLink?: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      unit: { include: { property: true } },
      lead: true,
      applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
      notes: { orderBy: { createdAt: "desc" } },
      documents: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      documentRequests: { include: { fulfilledDocument: true, requestedBy: true }, orderBy: { createdAt: "desc" } },
      leasePackets: { include: { template: true }, orderBy: { createdAt: "desc" } },
      claimTokens: { orderBy: { createdAt: "desc" }, take: 3 },
      occupancies: { include: { tenant: true, unit: { include: { property: true } }, leasePacket: { include: { template: true } } }, orderBy: { createdAt: "desc" } },
      applicationDetail: true
    }
  });

  if (!application) notFound();

  const openRequests = application.documentRequests.filter((request) => (["REQUESTED", "REJECTED"] as string[]).includes(request.status));
  const submittedRequests = application.documentRequests.filter((request) => request.status === "SUBMITTED");
  const acceptedRequests = application.documentRequests.filter((request) => request.status === "ACCEPTED");
  const leaseTemplates = await prisma.leaseTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const staffReview = buildStaffApplicationReview(application);
  const pendingRecommendedRequests = staffReview.recommendations.filter((item) => !item.alreadyRequested);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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


          <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Phase 3 staff review</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Decision readiness and document automation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use this panel to see what blocks approval, create recommended document requests, and record a final review decision.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase text-slate-500">Applicant readiness</p>
                <p className="text-3xl font-black text-slate-950">{staffReview.readiness.score}%</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">Next best action</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{staffReview.nextBestAction}</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {staffReview.checklist.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${item.complete ? "border-emerald-200 bg-emerald-50" : item.severity === "required" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${item.complete ? "bg-emerald-600 text-white" : item.severity === "required" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}`}>{item.complete ? "✓" : "!"}</span>
                    <div>
                      <p className="font-black text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <form action={createRecommendedApplicationDocumentRequests} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="applicationId" value={application.id} />
                <p className="font-black text-slate-950">Recommended document requests</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{pendingRecommendedRequests.length === 0 ? "All current recommended requests have already been created or waived." : `${pendingRecommendedRequests.length} recommended request(s) can be created from the application data.`}</p>
                <div className="mt-3 space-y-2">
                  {staffReview.recommendations.map((recommendation) => (
                    <div key={recommendation.key} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{recommendation.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${recommendation.alreadyRequested ? "bg-emerald-100 text-emerald-800" : recommendation.requiredForApproval ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{recommendation.alreadyRequested ? "Created" : recommendation.requiredForApproval ? "Required" : "Suggested"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="submit" className="mt-4 w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" disabled={pendingRecommendedRequests.length === 0}>{pendingRecommendedRequests.length === 0 ? "No New Requests Needed" : "Create Recommended Requests"}</button>
              </form>

              <form action={recordApplicationReviewDecision} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="applicationId" value={application.id} />
                <p className="font-black text-slate-950">Record review decision</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Approval is blocked until all required Phase 3 checklist items are complete.</p>
                <div className="mt-4 space-y-4">
                  <Field label="Decision"><select name="decision" className={selectClass} defaultValue={application.status}>{Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
                  <Field label="Move-in date for approval"><input name="moveInDate" type="date" className={inputClass} /></Field>
                  <Field label="Review note"><textarea name="reviewNote" className={textareaClass} rows={4} placeholder="Decision reason, conditions, missing items, or approval notes." /></Field>
                  {!staffReview.canApprove ? <div className="rounded-2xl bg-rose-50 p-3 text-sm leading-6 text-rose-900"><p className="font-black">Approval blocked</p><ul className="mt-2 list-disc space-y-1 pl-5">{staffReview.approvalBlockedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}
                  <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Save Review Decision</button>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Phase 2 structured review</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Applicant details and acknowledgements</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Structured applicant details collected from the applicant portal for screening and move-in review.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${application.applicationDetail?.signedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {application.applicationDetail?.signedAt ? "Signed" : "Not signed"}
              </span>
            </div>
            {application.applicationDetail ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div><p className="text-xs font-bold uppercase text-slate-500">Date of birth</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.dateOfBirth)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Government ID type</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.governmentIdType)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Emergency contact</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.emergencyContactName)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Emergency phone</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.emergencyContactPhone)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Previous landlord</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.previousLandlordName)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Landlord contact</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.previousLandlordPhone)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Requested move-in</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.requestedMoveInDate)}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Voucher program</p><p className="mt-1 font-semibold text-slate-900">{detailValue(application.applicationDetail.voucherProgram)}</p></div>
                <div className="md:col-span-2"><p className="text-xs font-bold uppercase text-slate-500">Reason for moving</p><p className="mt-1 leading-7 text-slate-700">{detailValue(application.applicationDetail.reasonForMoving)}</p></div>
                <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Prior eviction</p><p className="mt-1 font-bold text-slate-900">{application.applicationDetail.hasPriorEviction ? "Yes" : "No"}</p><p className="mt-2 text-sm text-slate-600">{application.applicationDetail.priorEvictionExplanation ?? "No explanation provided."}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Criminal history</p><p className="mt-1 font-bold text-slate-900">{application.applicationDetail.hasCriminalHistory ? "Yes" : "No"}</p><p className="mt-2 text-sm text-slate-600">{application.applicationDetail.criminalHistoryExplanation ?? "No explanation provided."}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Utility balance</p><p className="mt-1 font-bold text-slate-900">{application.applicationDetail.hasOutstandingUtilities ? "Yes" : "No"}</p><p className="mt-2 text-sm text-slate-600">{application.applicationDetail.outstandingUtilitiesExplanation ?? "No explanation provided."}</p></div>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">The applicant has not completed the structured Phase 2 details yet.</p>
            )}
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
              <div className="mt-4 space-y-4">
                {searchParams?.claimLink ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                    <p className="font-black">Claim link generated</p>
                    <p className="mt-2 break-all font-mono text-xs">{searchParams.claimLink}</p>
                    <p className="mt-2 text-xs font-bold uppercase">Copy this link into an email or message to the applicant.</p>
                  </div>
                ) : null}

                <form action={generateApplicationClaimLink} className="space-y-3 rounded-2xl bg-brand-50 p-4">
                  <input type="hidden" name="applicationId" value={application.id} />
                  <p className="text-sm leading-6 text-brand-950">Generate a secure claim link so the applicant can create/sign into their portal and connect this application automatically.</p>
                  <Field label="Expires in days"><input name="expiresInDays" type="number" min="1" max="30" defaultValue="7" className={inputClass} /></Field>
                  <button type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Generate Claim Link</button>
                </form>

                {application.claimTokens.length > 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                    <p className="font-black uppercase text-slate-500">Recent claim links</p>
                    {application.claimTokens.map((token) => (
                      <p key={token.id} className="mt-2">{token.claimedAt ? "Claimed" : token.expiresAt < new Date() ? "Expired" : "Open"} · expires {token.expiresAt.toLocaleString()}</p>
                    ))}
                  </div>
                ) : null}

                <form action={linkApplicationToApplicant} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <input type="hidden" name="applicationId" value={application.id} />
                  <p className="text-sm leading-6 text-slate-600">Or connect this application to an existing active applicant account by email.</p>
                  <Field label="Applicant account email"><input name="applicantEmail" type="email" defaultValue={application.applicantEmail} className={inputClass} required /></Field>
                  <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Connect Existing Account</button>
                </form>
              </div>
            )}
          </div>



          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Relationship lifecycle</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950">Approval now creates the tenant relationship, occupancy record, connected-renter relationship, rental assignment, and tenant dashboard access automatically.</p>
            {application.occupancies.length > 0 ? (
              <div className="mt-4 space-y-3">
                {application.occupancies.map((occupancy) => {
                  const isCurrent = occupancy.status !== "FORMER" && occupancy.status !== "CANCELLED";
                  return (
                    <div key={occupancy.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <p className="font-black text-slate-950">{occupancy.tenant.name ?? occupancy.tenant.email}</p>
                      <p className="mt-1 text-slate-600">{label(occupancy.status)} · {occupancy.unit.property.name} {occupancy.unit.unitNumber ? `#${occupancy.unit.unitNumber}` : ""}</p>
                      <p className="mt-1 text-xs font-bold uppercase text-slate-500">Move-in {occupancy.moveInDate ? occupancy.moveInDate.toLocaleDateString() : "not set"} · Move-out {occupancy.moveOutDate ? occupancy.moveOutDate.toLocaleDateString() : "not set"}</p>
                      {isCurrent ? (
                        <form action={endAdminTenantOccupancyAction} className="mt-4 space-y-3 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                          <input type="hidden" name="occupancyId" value={occupancy.id} />
                          <input type="hidden" name="applicationId" value={application.id} />
                          <Field label="Move-out date"><input name="moveOutDate" type="date" className={inputClass} /></Field>
                          <Field label="Reason"><input name="reason" className={inputClass} placeholder="Move-out, eviction, lease ended, transfer..." /></Field>
                          <Field label="Notes"><textarea name="notes" className={textareaClass} rows={3} placeholder="Final balance, deposit, key return, forwarding address, or turnover notes." /></Field>
                          <label className="flex items-start gap-3 text-xs font-bold text-rose-950"><input name="releaseRental" type="checkbox" defaultChecked className="mt-1" /> Release this rental into turnover and remove active tenant access.</label>
                          <button className="w-full rounded-2xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700">End tenancy</button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <form action={activateTenantFromApplicationAction} className="mt-5 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
                <input type="hidden" name="applicationId" value={application.id} />
                <Field label="Move-in date"><input name="moveInDate" type="date" className={inputClass} /></Field>
                <button type="submit" className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700" disabled={!application.applicantUserId}>{application.applicantUserId ? "Approve + Activate Tenant" : "Connect applicant account first"}</button>
                {!application.applicantUserId ? <p className="text-xs font-bold text-amber-800">Tenant activation requires a connected applicant portal account so the dashboard can switch modes.</p> : null}
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
