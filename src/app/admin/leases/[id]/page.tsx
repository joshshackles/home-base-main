import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentCategory, DocumentStatus, LeasePacketStatus, SignatureStatus } from "@prisma/client";
import { addLeasePacketNote, extendSignatureExpiration, generateFinalSignedLeasePdf, generateLeasePacketPdf, prepareLeaseForSignatures, queueSignatureReminder, reissueLeasePacket, updateDocumentStatus, updateLeasePacket, updateLeasePacketStatus, uploadAdminDocument, voidSignatureRequest } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { formatCurrency } from "@/lib/format";
import { renderLeaseTemplate } from "@/lib/lease-render";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function LeasePacketDetailPage({ params }: { params: { id: string } }) {
  const packet = await prisma.leasePacket.findUnique({
    where: { id: params.id },
    include: {
      template: true,
      application: {
        include: {
          applicantUser: true,
          unit: { include: { property: { include: { owner: true } } } }
        }
      },
      packetNotes: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      signatureRequests: { orderBy: { createdAt: "asc" }, include: { notifications: { orderBy: { createdAt: "desc" }, take: 3 } } }
    }
  });

  if (!packet) notFound();
  const preview = renderLeaseTemplate(packet);
  const isLocked = packet.status === LeasePacketStatus.SENT_FOR_SIGNATURE || packet.status === LeasePacketStatus.COMPLETED || packet.status === LeasePacketStatus.VOIDED;
  const finalDocument = packet.finalDocumentId ? packet.documents.find((document) => document.id === packet.finalDocumentId) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={`Lease packet: ${packet.application.applicantName}`}
        description="Review lease terms, generate downloadable PDF versions, update packet status, and keep lease documents connected to the application."
        actionHref="/admin/leases"
        actionLabel="Back to leases"
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">PDF-ready lease preview</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">This is the rendered template using application, property, unit, landlord, and lease packet data.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(packet.status)}</span>
                <form action={generateLeasePacketPdf}>
                  <input type="hidden" name="id" value={packet.id} />
                  <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={packet.status === "VOIDED"}>Generate PDF</button>
                </form>
                <form action={prepareLeaseForSignatures}>
                  <input type="hidden" name="leasePacketId" value={packet.id} />
                  <input type="hidden" name="expiresInDays" value="7" />
                  <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLocked}>Send for Signature</button>
                </form>
              </div>
            </div>
            <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-6 font-serif text-sm leading-8 text-slate-900">{preview}</pre>
          </div>

          <form action={updateLeasePacket} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="leasePacketId" value={packet.id} />
            <h2 className="text-2xl font-black text-slate-950">Lease terms</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Lease start date"><input name="leaseStartDate" type="date" className={inputClass} defaultValue={dateInputValue(packet.leaseStartDate)} /></Field>
              <Field label="Lease end date"><input name="leaseEndDate" type="date" className={inputClass} defaultValue={dateInputValue(packet.leaseEndDate)} /></Field>
              <Field label="Monthly rent"><input name="monthlyRent" type="number" min="0" className={inputClass} defaultValue={packet.monthlyRent} required /></Field>
              <Field label="Security deposit"><input name="securityDeposit" type="number" min="0" className={inputClass} defaultValue={packet.securityDeposit ?? ""} /></Field>
              <Field label="Additional lease terms"><textarea name="terms" className={textareaClass} defaultValue={packet.terms ?? ""} placeholder="Add terms that should appear inside the lease packet." /></Field>
              <Field label="Internal packet notes"><textarea name="notes" className={textareaClass} defaultValue={packet.notes ?? ""} placeholder="Optional notes for staff only." /></Field>
            </div>
            {isLocked ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">This lease packet is locked because it has been sent, completed, or voided. Void and reissue it before changing terms.</p> : <button type="submit" className="mt-5 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Lease Terms</button>}
          </form>



          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Signature workflow</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track tenant and landlord signature requests. This release captures typed signatures, timestamps, IP/user-agent metadata, and completion status. Completed packets generate a final signed PDF with signature blocks and audit metadata.</p>
            <div className="mt-5 space-y-3">
              {packet.signatureRequests.length === 0 ? <p className="text-slate-600">No signature requests have been created yet. Use Send for Signature above when the lease is ready.</p> : packet.signatureRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{label(request.signerRole)} signature</p>
                      <p className="mt-1 text-sm text-slate-600">{request.signerName} · {request.signerEmail}</p>
                      <p className="mt-1 text-xs font-bold uppercase text-slate-500">Status: {label(request.status)}{request.signedAt ? ` · Signed ${request.signedAt.toLocaleString()}` : ""}</p>
                      <p className="mt-1 text-xs text-slate-500">Expires: {request.expiresAt ? request.expiresAt.toLocaleDateString() : "Not set"} · Reminders: {request.reminderCount} · Last notice: {request.lastNotificationAt ? request.lastNotificationAt.toLocaleString() : "None"}</p>
                      {request.signatureText ? <p className="mt-3 rounded-xl bg-white px-3 py-2 font-serif text-lg text-slate-950">{request.signatureText}</p> : null}
                      {request.notifications.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {request.notifications.map((notification) => (
                            <p key={notification.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">{label(notification.type)} notification · {label(notification.status)} · {notification.createdAt.toLocaleString()}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {request.status === SignatureStatus.PENDING ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={queueSignatureReminder}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="type" value="REMINDER" />
                          <button type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">Queue Reminder</button>
                        </form>
                        <form action={extendSignatureExpiration}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="extendDays" value="7" />
                          <button type="submit" className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">Extend 7 Days</button>
                        </form>
                        <form action={voidSignatureRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="status" value="VOIDED" />
                          <button type="submit" className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300">Void Request</button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Final signed lease</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">When every required tenant and landlord signature is complete, HomeBase MLS generates a final signed PDF with a completion certificate and signature audit details.</p>
            {finalDocument ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-black text-emerald-950">Final signed PDF is available.</p>
                <p className="mt-1 text-sm text-emerald-800">Generated {packet.finalPdfGeneratedAt ? packet.finalPdfGeneratedAt.toLocaleString() : "recently"} · {finalDocument.originalName}</p>
                <Link href={`/api/documents/${finalDocument.id}`} className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">Download Final Signed Lease</Link>
              </div>
            ) : packet.status === LeasePacketStatus.COMPLETED ? (
              <form action={generateFinalSignedLeasePdf} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="id" value={packet.id} />
                <p className="text-sm font-bold text-slate-700">This lease is completed but no final signed PDF is attached yet.</p>
                <button type="submit" className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">Generate Final Signed PDF</button>
              </form>
            ) : (
              <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">Final signed PDF generation unlocks after all pending signature requests are signed.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Lease packet documents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Attach draft lease files, review notes, or generated PDF versions to this lease packet record. Generated PDFs appear here as version history.</p>
            <form action={uploadAdminDocument} className="mt-5 grid gap-4 md:grid-cols-2" encType="multipart/form-data">
              <input type="hidden" name="leasePacketId" value={packet.id} />
              <input type="hidden" name="applicationId" value={packet.application.id} />
              <input type="hidden" name="visibility" value="APPLICANT" />
              <Field label="Document title"><input name="title" className={inputClass} placeholder="Example: Draft lease packet" required /></Field>
              <Field label="Category"><select name="category" className={selectClass} defaultValue="LEASE">{Object.values(DocumentCategory).map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></Field>
              <Field label="File"><input name="file" type="file" className={inputClass} required /></Field>
              <Field label="Notes"><input name="notes" className={inputClass} placeholder="Optional note" /></Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2">Upload Lease Document</button>
            </form>
            <div className="mt-6 space-y-3">
              {packet.documents.length === 0 ? <p className="text-slate-600">No documents are attached to this lease packet yet.</p> : packet.documents.map((document) => (
                <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{label(document.category)} · {label(document.status)} · {document.originalName}</p>
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
            <h2 className="text-2xl font-black text-slate-950">Lease notes</h2>
            <form action={addLeasePacketNote} className="mt-5 space-y-4">
              <input type="hidden" name="leasePacketId" value={packet.id} />
              <Field label="Add note"><textarea name="note" className={textareaClass} placeholder="Example: Need landlord review before PDF generation." required /></Field>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Save Note</button>
            </form>
            <div className="mt-6 space-y-3">
              {packet.packetNotes.length === 0 ? <p className="text-slate-600">No lease notes have been added yet.</p> : packet.packetNotes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="leading-7 text-slate-700">{note.note}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-slate-500">{note.createdAt.toLocaleString()}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <form action={updateLeasePacketStatus} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="leasePacketId" value={packet.id} />
            <Field label="Lease status"><select name="status" className={selectClass} defaultValue={packet.status}>{Object.values(LeasePacketStatus).map((status) => <option key={status} value={status} disabled={status === LeasePacketStatus.COMPLETED}>{label(status)}</option>)}</select></Field>
            <button type="submit" className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Update Status</button>
          </form>

          <form action={reissueLeasePacket} className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <input type="hidden" name="leasePacketId" value={packet.id} />
            <h2 className="text-xl font-black text-amber-950">Void and reissue</h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">Use this when terms need to change after signatures begin or after a lease is completed. The current packet is voided and a replacement draft is created.</p>
            <textarea name="reason" className={`${textareaClass} mt-4`} placeholder="Explain why this lease is being reissued." required />
            <button type="submit" className="mt-4 w-full rounded-2xl bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800" disabled={packet.status === LeasePacketStatus.DRAFT}>Void and Create Replacement Draft</button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Lease summary</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-700">
              <div><dt className="font-bold uppercase text-slate-500">Template</dt><dd>{packet.template.name}</dd></div>
              <div><dt className="font-bold uppercase text-slate-500">Monthly rent</dt><dd>{formatCurrency(packet.monthlyRent)}</dd></div>
              <div><dt className="font-bold uppercase text-slate-500">Deposit</dt><dd>{packet.securityDeposit == null ? "Not set" : formatCurrency(packet.securityDeposit)}</dd></div>
              <div><dt className="font-bold uppercase text-slate-500">Created</dt><dd>{packet.createdAt.toLocaleString()}</dd></div>
              {packet.approvedAt ? <div><dt className="font-bold uppercase text-slate-500">Approved</dt><dd>{packet.approvedAt.toLocaleString()}</dd></div> : null}
              {packet.sentForSignatureAt ? <div><dt className="font-bold uppercase text-slate-500">Sent for signature</dt><dd>{packet.sentForSignatureAt.toLocaleString()}</dd></div> : null}
              {packet.completedAt ? <div><dt className="font-bold uppercase text-slate-500">Completed</dt><dd>{packet.completedAt.toLocaleString()}</dd></div> : null}
              {packet.lockedAt ? <div><dt className="font-bold uppercase text-slate-500">Locked</dt><dd>{packet.lockedAt.toLocaleString()}</dd></div> : null}
              {packet.finalDocumentId ? <div><dt className="font-bold uppercase text-slate-500">Final document</dt><dd>{packet.finalDocumentId}</dd></div> : null}
              {packet.reissuedFromId ? <div><dt className="font-bold uppercase text-slate-500">Reissued from</dt><dd>{packet.reissuedFromId}</dd></div> : null}
              {packet.voidedAt ? <div><dt className="font-bold uppercase text-slate-500">Voided</dt><dd>{packet.voidedAt.toLocaleString()}</dd></div> : null}
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Application</h2>
            <p className="mt-3 font-bold text-slate-950">{packet.application.applicantName}</p>
            <p className="text-sm text-slate-600">{packet.application.applicantEmail}</p>
            <Link href={`/admin/applications/${packet.application.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Application</Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Unit</h2>
            <p className="mt-3 font-bold text-slate-950">{packet.application.unit.property.name} #{packet.application.unit.unitNumber}</p>
            <p className="text-sm text-slate-600">{packet.application.unit.property.addressLine}</p>
            <p className="text-sm text-slate-600">{packet.application.unit.property.city}, {packet.application.unit.property.state} {packet.application.unit.property.zip}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
