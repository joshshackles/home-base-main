import Link from "next/link";
import { notFound } from "next/navigation";
import { submitApplicantApplication, uploadApplicantDocument } from "@/app/applicant/actions";
import { DocumentCategory } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function requestTone(status: string) {
  if (status === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "SUBMITTED") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "WAIVED") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-brand-200 bg-brand-50 text-brand-800";
}

export default async function ApplicantApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], `/applicant/applications/${params.id}`);

  const application = await prisma.application.findFirst({
    where: { id: params.id, OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] },
    include: {
      unit: { include: { property: true } },
      notes: { orderBy: { createdAt: "desc" } },
      documents: { where: { OR: [{ visibility: { in: ["APPLICANT", "SHARED"] } }, { uploadedById: user.userId }] }, orderBy: { createdAt: "desc" } },
      documentRequests: { where: { visibility: { in: ["APPLICANT", "SHARED"] } }, include: { fulfilledDocument: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!application) notFound();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.userId },
    include: { householdMembers: true, incomeSources: true }
  });

  const unresolvedRequests = application.documentRequests.filter((request) => ["REQUESTED", "REJECTED"].includes(request.status));
  const canSubmit = application.status === "STARTED" && profile && profile.householdMembers.length > 0 && profile.incomeSources.length > 0 && unresolvedRequests.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Application</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{application.unit.property.name} #{application.unit.unitNumber}</h1>
          <p className="mt-2 text-slate-600">{application.unit.property.addressLine}, {application.unit.property.city}, {application.unit.property.state}</p>
        </div>
        <Link href="/applicant/applications" className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Back to applications</Link>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application status</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-slate-500">Status</p><p className="mt-1 text-lg font-black text-slate-950">{label(application.status)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Started</p><p className="mt-1 font-semibold text-slate-900">{application.createdAt.toLocaleString()}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Applicant</p><p className="mt-1 font-semibold text-slate-900">{application.applicantName}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Email</p><p className="mt-1 font-semibold text-slate-900">{application.applicantEmail}</p></div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-700">
              <p className="text-xs font-bold uppercase text-slate-500">Summary</p>
              <p className="mt-2 leading-7">{application.summary ?? "No summary has been added yet."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Requested documents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload the items requested by the housing team. Rejected items can be replaced from this checklist.</p>
            <div className="mt-5 space-y-3">
              {application.documentRequests.length === 0 ? <p className="text-slate-600">No specific documents have been requested yet.</p> : application.documentRequests.map((request) => {
                const needsUpload = ["REQUESTED", "REJECTED"].includes(request.status);
                return (
                  <article key={request.id} className={`rounded-2xl border p-4 ${requestTone(request.status)}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{request.title}</p>
                        <p className="mt-1 text-sm">{label(request.category)}{request.dueDate ? ` · Due ${request.dueDate.toLocaleDateString()}` : ""}</p>
                        {request.instructions ? <p className="mt-2 text-sm leading-6 text-slate-700">{request.instructions}</p> : null}
                        {request.reviewNotes ? <p className="mt-2 rounded-xl bg-white/70 p-3 text-sm leading-6 text-slate-700"><strong>Review note:</strong> {request.reviewNotes}</p> : null}
                        {request.fulfilledDocument ? <Link href={`/api/documents/${request.fulfilledDocument.id}`} className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50">Download submitted file</Link> : null}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(request.status)}</span>
                    </div>
                    {needsUpload ? (
                      <form action={uploadApplicantDocument} className="mt-4 grid gap-3 md:grid-cols-2" encType="multipart/form-data">
                        <input type="hidden" name="applicationId" value={application.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="title" value={request.title} />
                        <input type="hidden" name="category" value={request.category} />
                        <div>
                          <label className="text-sm font-bold text-slate-700">File</label>
                          <input name="file" type="file" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" required />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-slate-700">Notes</label>
                          <input name="notes" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Optional note" />
                        </div>
                        <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2">Upload Requested Document</button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Other documents</h2>
            <form action={uploadApplicantDocument} className="mt-5 grid gap-4 md:grid-cols-2" encType="multipart/form-data">
              <input type="hidden" name="applicationId" value={application.id} />
              <div><label className="text-sm font-bold text-slate-700">Document title</label><input name="title" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Example: Paystub" required /></div>
              <div><label className="text-sm font-bold text-slate-700">Category</label><select name="category" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" defaultValue="OTHER">{Object.values(DocumentCategory).filter((category) => !["LANDLORD_DOCUMENT", "RFTA", "UTILITY_ALLOWANCE"].includes(category)).map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></div>
              <div><label className="text-sm font-bold text-slate-700">File</label><input name="file" type="file" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" required /></div>
              <div><label className="text-sm font-bold text-slate-700">Notes</label><input name="notes" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Optional note" /></div>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2">Upload Other Document</button>
            </form>
            <div className="mt-6 space-y-3">
              {application.documents.length === 0 ? <p className="text-slate-600">No documents have been uploaded for this application yet.</p> : application.documents.map((document) => (
                <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-black text-slate-950">{document.title}</p><p className="mt-1 text-sm text-slate-600">{label(document.category)} · {label(document.status)}</p>{document.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">{document.notes}</p> : null}</div>
                    <Link href={`/api/documents/${document.id}`} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">Download</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Review notes</h2>
            <div className="mt-5 space-y-3">
              {application.notes.length === 0 ? <p className="text-slate-600">No notes have been added to this application yet.</p> : application.notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="leading-7 text-slate-700">{note.note}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p></article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Requested unit</h2>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(application.unit.rentAmount)}</p>
            <p className="mt-2 text-slate-600">{application.unit.bedrooms} bed · {application.unit.bathrooms} bath</p>
            <Link href={`/marketplace/${application.unit.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">View Listing</Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Submit package</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p className={profile ? "text-emerald-700" : "text-rose-700"}>Profile: {profile ? "started" : "missing"}</p>
              <p className={(profile?.householdMembers.length ?? 0) > 0 ? "text-emerald-700" : "text-rose-700"}>Household: {profile?.householdMembers.length ?? 0} member(s)</p>
              <p className={(profile?.incomeSources.length ?? 0) > 0 ? "text-emerald-700" : "text-rose-700"}>Income: {profile?.incomeSources.length ?? 0} source(s)</p>
              <p className={unresolvedRequests.length === 0 ? "text-emerald-700" : "text-rose-700"}>Requested documents: {unresolvedRequests.length === 0 ? "complete" : `${unresolvedRequests.length} missing/rejected`}</p>
            </div>
            {application.status === "STARTED" ? (
              <form action={submitApplicantApplication} className="mt-5">
                <input type="hidden" name="applicationId" value={application.id} />
                <button disabled={!canSubmit} type="submit" className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">Submit Application</button>
                {!canSubmit ? <p className="mt-3 text-sm leading-6 text-slate-500">Complete your profile, household, income, and requested document checklist before submitting.</p> : null}
              </form>
            ) : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">This application has already moved out of the starter step.</p>}
          </div>
        </aside>
      </section>
    </main>
  );
}
