export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  saveApplicationDetail,
  submitApplicantApplication,
  uploadApplicantDocument,
  withdrawApplicantApplication,
} from "@/app/applicant/actions";
import { ApplicationStatus, DocumentCategory } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  visibleDocumentRequestWhereForUser,
  visibleDocumentWhereForUser,
} from "@/lib/authorization";
import { buildApplicationReadiness } from "@/lib/application-readiness";
import { Field, inputClass, textareaClass } from "@/components/admin/FormFields";

const withdrawableApplicationStatuses: ApplicationStatus[] = [
  ApplicationStatus.STARTED,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
];

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function requestTone(status: string) {
  if (status === "ACCEPTED")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "SUBMITTED")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "WAIVED")
    return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-brand-200 bg-brand-50 text-brand-800";
}

export default async function ApplicantApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(
    ["APPLICANT", "TENANT"],
    `/applicant/applications/${params.id}`,
  );

  const [documentWhere, documentRequestWhere] = await Promise.all([
    visibleDocumentWhereForUser(user),
    visibleDocumentRequestWhereForUser(user),
  ]);

  const application = await prisma.application.findFirst({
    where: {
      id: params.id,
      OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }],
    },
    include: {
      unit: { include: { property: true } },
      notes: { orderBy: { createdAt: "desc" } },
      documents: { where: documentWhere, orderBy: { createdAt: "desc" } },
      documentRequests: {
        where: documentRequestWhere,
        include: { fulfilledDocument: true },
        orderBy: { createdAt: "desc" },
      },
      applicationDetail: true,
    },
  });

  if (!application) notFound();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.userId },
    include: { householdMembers: true, incomeSources: true },
  });

  const readiness = buildApplicationReadiness(
    profile,
    application.documentRequests,
    application.applicationDetail,
  );
  const canSubmit = application.status === "STARTED" && readiness.canSubmit;
  const canWithdraw = withdrawableApplicationStatuses.includes(
    application.status,
  );

  return (
    <main
      id="main-content"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            Application
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            {application.unit.property.name} #{application.unit.unitNumber}
          </h1>
          <p className="mt-2 text-slate-600">
            {application.unit.property.addressLine},{" "}
            {application.unit.property.city}, {application.unit.property.state}
          </p>
        </div>
        <Link
          href="/applicant/applications"
          className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50"
        >
          Back to applications
        </Link>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Application status
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Status
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {label(application.status)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Started
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {application.createdAt.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Applicant
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {application.applicantName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Email
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {application.applicantEmail}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700">
              <p className="text-xs font-bold uppercase text-slate-500">
                Summary
              </p>
              <p className="mt-2 leading-7">
                {application.summary ?? "No summary has been added yet."}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  Readiness checklist
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Application completion
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Complete each required section before sending this application
                  to the housing team for review.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 px-5 py-4 text-right text-white">
                <p className="text-xs font-bold uppercase text-slate-300">
                  Complete
                </p>
                <p className="text-3xl font-black">{readiness.score}%</p>
                <p className="text-xs text-slate-300">
                  {readiness.completedCount} of {readiness.totalCount} items
                </p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${readiness.score}%` }}
              />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {readiness.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${item.complete ? "border-emerald-200 bg-emerald-50" : item.required ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${item.complete ? "bg-emerald-600 text-white" : item.required ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}`}
                    >
                      {item.complete ? "✓" : "!"}
                    </span>
                    <div>
                      <p className="font-black text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {item.description}
                      </p>
                      {item.actionHref ? (
                        <Link
                          href={item.actionHref}
                          className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          {item.actionLabel ?? "Update"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


          <form
            id="application-details"
            action={saveApplicationDetail}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="applicationId" value={application.id} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  Phase 2 application details
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Applicant details and acknowledgements
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Add the structured information staff need for screening, housing review, and move-in planning.
                </p>
              </div>
              {application.applicationDetail?.signedAt ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                  Signed {application.applicationDetail.signedAt.toLocaleDateString()}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
                  Signature needed
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Date of birth">
                <input name="dateOfBirth" type="date" defaultValue={dateValue(application.applicationDetail?.dateOfBirth)} className={inputClass} />
              </Field>
              <Field label="Government ID type">
                <input name="governmentIdType" defaultValue={application.applicationDetail?.governmentIdType ?? ""} className={inputClass} placeholder="Driver license, state ID, passport, etc." />
              </Field>
              <Field label="Emergency contact name">
                <input name="emergencyContactName" defaultValue={application.applicationDetail?.emergencyContactName ?? ""} className={inputClass} />
              </Field>
              <Field label="Emergency contact phone">
                <input name="emergencyContactPhone" defaultValue={application.applicationDetail?.emergencyContactPhone ?? ""} className={inputClass} />
              </Field>
              <Field label="Emergency contact relationship">
                <input name="emergencyContactRelation" defaultValue={application.applicationDetail?.emergencyContactRelation ?? ""} className={inputClass} />
              </Field>
              <Field label="Current housing start date">
                <input name="currentHousingStartDate" type="date" defaultValue={dateValue(application.applicationDetail?.currentHousingStartDate)} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Previous address">
                  <input name="previousAddress" defaultValue={application.applicationDetail?.previousAddress ?? ""} className={inputClass} placeholder="Street, city, state, ZIP" />
                </Field>
              </div>
              <Field label="Previous landlord name">
                <input name="previousLandlordName" defaultValue={application.applicationDetail?.previousLandlordName ?? ""} className={inputClass} />
              </Field>
              <Field label="Previous landlord phone or email">
                <input name="previousLandlordPhone" defaultValue={application.applicationDetail?.previousLandlordPhone ?? ""} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Reason for moving">
                  <textarea name="reasonForMoving" defaultValue={application.applicationDetail?.reasonForMoving ?? ""} className={textareaClass} placeholder="Briefly explain why you are moving or what kind of housing you are looking for." />
                </Field>
              </div>
              <Field label="Requested move-in date">
                <input name="requestedMoveInDate" type="date" defaultValue={dateValue(application.applicationDetail?.requestedMoveInDate)} className={inputClass} />
              </Field>
              <Field label="Voucher or subsidy program">
                <input name="voucherProgram" defaultValue={application.applicationDetail?.voucherProgram ?? ""} className={inputClass} placeholder="Section 8, RAP, SPC, VASH, etc." />
              </Field>
              <Field label="Voucher case worker">
                <input name="voucherCaseWorker" defaultValue={application.applicationDetail?.voucherCaseWorker ?? ""} className={inputClass} />
              </Field>
              <Field label="Case worker contact">
                <input name="voucherCaseWorkerContact" defaultValue={application.applicationDetail?.voucherCaseWorkerContact ?? ""} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Vehicle information">
                  <textarea name="vehicleInfo" defaultValue={application.applicationDetail?.vehicleInfo ?? ""} className={textareaClass} placeholder="Vehicle make/model, plate, parking needs, or no vehicle." />
                </Field>
              </div>
              <Field label="Pet details">
                <textarea name="petDetails" defaultValue={application.applicationDetail?.petDetails ?? ""} className={textareaClass} placeholder="Type, breed, size, weight, or no pets." />
              </Field>
              <Field label="Service animal or accommodation details">
                <textarea name="serviceAnimalAccommodation" defaultValue={application.applicationDetail?.serviceAnimalAccommodation ?? ""} className={textareaClass} placeholder="Optional accessibility or accommodation notes." />
              </Field>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                <input type="checkbox" name="hasPriorEviction" defaultChecked={application.applicationDetail?.hasPriorEviction ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
                Prior eviction history
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                <input type="checkbox" name="hasCriminalHistory" defaultChecked={application.applicationDetail?.hasCriminalHistory ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
                Criminal history to explain
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                <input type="checkbox" name="hasOutstandingUtilities" defaultChecked={application.applicationDetail?.hasOutstandingUtilities ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
                Outstanding utility balance
              </label>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              <Field label="Eviction explanation">
                <textarea name="priorEvictionExplanation" defaultValue={application.applicationDetail?.priorEvictionExplanation ?? ""} className={textareaClass} />
              </Field>
              <Field label="Criminal history explanation">
                <textarea name="criminalHistoryExplanation" defaultValue={application.applicationDetail?.criminalHistoryExplanation ?? ""} className={textareaClass} />
              </Field>
              <Field label="Utility balance explanation">
                <textarea name="outstandingUtilitiesExplanation" defaultValue={application.applicationDetail?.outstandingUtilitiesExplanation ?? ""} className={textareaClass} />
              </Field>
            </div>

            <div className="mt-6 rounded-3xl border border-brand-100 bg-brand-50 p-5">
              <h3 className="text-lg font-black text-slate-950">Applicant certification</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-brand-950">
                <label className="flex gap-3">
                  <input type="checkbox" name="consentToScreening" defaultChecked={application.applicationDetail?.consentToScreening ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>I authorize the housing team or property representative to review my application information, contact references, and request screening information allowed by law and program policy.</span>
                </label>
                <label className="flex gap-3">
                  <input type="checkbox" name="informationCertified" defaultChecked={application.applicationDetail?.informationCertified ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>I certify that the information I provided is accurate to the best of my knowledge and understand that incomplete or inaccurate information may delay review.</span>
                </label>
              </div>
              <Field label="Type your full legal name as your signature">
                <input name="applicantSignature" defaultValue={application.applicationDetail?.applicantSignature ?? ""} className={inputClass} />
              </Field>
            </div>

            <button type="submit" className="mt-6 rounded-2xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
              Save Application Details
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Requested documents
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload the items requested by the housing team. Rejected items can
              be replaced from this checklist.
            </p>
            <div className="mt-5 space-y-3">
              {application.documentRequests.length === 0 ? (
                <p className="text-slate-600">
                  No specific documents have been requested yet.
                </p>
              ) : (
                application.documentRequests.map((request) => {
                  const needsUpload = (
                    ["REQUESTED", "REJECTED"] as string[]
                  ).includes(request.status);
                  return (
                    <article
                      key={request.id}
                      className={`rounded-2xl border p-4 ${requestTone(request.status)}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {request.title}
                          </p>
                          <p className="mt-1 text-sm">
                            {label(request.category)}
                            {request.dueDate
                              ? ` - Due ${request.dueDate.toLocaleDateString()}`
                              : ""}
                          </p>
                          {request.instructions ? (
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {request.instructions}
                            </p>
                          ) : null}
                          {request.reviewNotes ? (
                            <p className="mt-2 rounded-xl bg-white/70 p-3 text-sm leading-6 text-slate-700">
                              <strong>Review note:</strong>{" "}
                              {request.reviewNotes}
                            </p>
                          ) : null}
                          {request.fulfilledDocument ? (
                            <Link
                              href={`/api/documents/${request.fulfilledDocument.id}`}
                              className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50"
                            >
                              Download submitted file
                            </Link>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-700">
                          {label(request.status)}
                        </span>
                      </div>
                      {needsUpload ? (
                        <form
                          action={uploadApplicantDocument}
                          className="mt-4 grid gap-3 md:grid-cols-2"
                          encType="multipart/form-data"
                        >
                          <input
                            type="hidden"
                            name="applicationId"
                            value={application.id}
                          />
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="title"
                            value={request.title}
                          />
                          <input
                            type="hidden"
                            name="category"
                            value={request.category}
                          />
                          <div>
                            <label className="text-sm font-bold text-slate-700">
                              File
                            </label>
                            <input
                              name="file"
                              type="file"
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-slate-700">
                              Notes
                            </label>
                            <input
                              name="notes"
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                              placeholder="Optional note"
                            />
                          </div>
                          <button
                            type="submit"
                            className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2"
                          >
                            Upload Requested Document
                          </button>
                        </form>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Other documents
            </h2>
            <form
              action={uploadApplicantDocument}
              className="mt-5 grid gap-4 md:grid-cols-2"
              encType="multipart/form-data"
            >
              <input
                type="hidden"
                name="applicationId"
                value={application.id}
              />
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Document title
                </label>
                <input
                  name="title"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  placeholder="Example: Paystub"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  defaultValue="OTHER"
                >
                  {Object.values(DocumentCategory)
                    .filter(
                      (category) =>
                        !(
                          [
                            "LANDLORD_DOCUMENT",
                            "RFTA",
                            "UTILITY_ALLOWANCE",
                          ] as string[]
                        ).includes(category),
                    )
                    .map((category) => (
                      <option key={category} value={category}>
                        {label(category)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">File</label>
                <input
                  name="file"
                  type="file"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Notes
                </label>
                <input
                  name="notes"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  placeholder="Optional note"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2"
              >
                Upload Other Document
              </button>
            </form>
            <div className="mt-6 space-y-3">
              {application.documents.length === 0 ? (
                <p className="text-slate-600">
                  No documents have been uploaded for this application yet.
                </p>
              ) : (
                application.documents.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {document.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {label(document.category)} - {label(document.status)}
                        </p>
                        {document.notes ? (
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {document.notes}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={`/api/documents/${document.id}`}
                        className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                      >
                        Download
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Review notes</h2>
            <div className="mt-5 space-y-3">
              {application.notes.length === 0 ? (
                <p className="text-slate-600">
                  No notes have been added to this application yet.
                </p>
              ) : (
                application.notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="leading-7 text-slate-700">{note.note}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-500">
                      {note.createdAt.toLocaleString()}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Requested unit
            </h2>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {formatCurrency(application.unit.rentAmount)}
            </p>
            <p className="mt-2 text-slate-600">
              {application.unit.bedrooms} bed - {application.unit.bathrooms}{" "}
              bath
            </p>
            <Link
              href={`/marketplace/${application.unit.id}`}
              className="mt-4 inline-flex w-full justify-center rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50"
            >
              View Listing
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Submit package
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Application readiness
                </p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {readiness.score}%
                </p>
                <p className="text-sm text-slate-600">
                  {readiness.completedCount} of {readiness.totalCount} checklist
                  items complete
                </p>
              </div>
              {readiness.requiredMissing.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                  <p className="font-black">Required before submission</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {readiness.requiredMissing.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <p className="font-black">Ready to submit</p>
                  <p className="mt-1 leading-6">
                    All required items are complete. Review your information,
                    then submit the package for staff review.
                  </p>
                </div>
              )}
            </div>
            {application.status === "STARTED" ? (
              <form action={submitApplicantApplication} className="mt-5">
                <input
                  type="hidden"
                  name="applicationId"
                  value={application.id}
                />
                <button
                  disabled={!canSubmit}
                  type="submit"
                  className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Submit Application
                </button>
                {!canSubmit ? (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Complete all required readiness checklist items before
                    submitting.
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                This application has already moved out of the starter step.
              </p>
            )}
          </div>

          {canWithdraw ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-xl font-black text-rose-950">
                Withdraw application
              </h2>
              <p className="mt-3 text-sm leading-6 text-rose-900">
                Use this if you found another home or no longer want this
                application reviewed. This moves the application out of the
                active queue but keeps its history.
              </p>
              <form action={withdrawApplicantApplication} className="mt-5">
                <input
                  type="hidden"
                  name="applicationId"
                  value={application.id}
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-rose-700 px-5 py-3 font-bold text-white hover:bg-rose-800"
                >
                  Withdraw Application
                </button>
              </form>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
