export const dynamic = "force-dynamic";

import { MaintenancePriority } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMaintenanceRequest, sendWorkflowMessage } from "@/app/workflow-actions";

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

export default async function ApplicantMaintenancePage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/maintenance");
  const [applications, requests] = await Promise.all([
    prisma.application.findMany({
      where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.maintenanceRequest.findMany({
      where: { requesterId: user.userId },
      include: { unit: { include: { property: true } }, application: true, messageThreads: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-200">Maintenance</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Request maintenance help</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">Submit repair requests, track status, and keep the conversation attached to the request.</p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <form action={createMaintenanceRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">New request</h2>
          <label className="mt-5 block text-sm font-bold text-slate-700">Application / unit</label>
          <select name="applicationId" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="">Select application</option>
            {applications.map((application) => <option key={application.id} value={application.id}>{application.unit.property.name} #{application.unit.unitNumber}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold text-slate-700">Priority</label>
          <select name="priority" defaultValue={MaintenancePriority.NORMAL} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
            {Object.values(MaintenancePriority).map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold text-slate-700">Subject</label>
          <input name="subject" required minLength={3} maxLength={140} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Leaking sink, broken heater, etc." />
          <label className="mt-4 block text-sm font-bold text-slate-700">Description</label>
          <textarea name="description" required minLength={10} rows={5} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="What is happening? When did it start?" />
          <label className="mt-4 block text-sm font-bold text-slate-700">Access notes</label>
          <textarea name="accessNotes" rows={3} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Best time to enter, pets, gate code, etc." />
          <button className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Submit Request</button>
        </form>

        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-950">Your requests</h2>
          {requests.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">No maintenance requests yet.</div> : requests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">{request.subject}</h3>
                  <p className="mt-1 text-sm text-slate-600">{request.unit?.property.name} {request.unit ? `#${request.unit.unitNumber}` : ""}</p>
                </div>
                <div className="flex gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(request.status)}</span><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700">{label(request.priority)}</span></div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-slate-700">{request.description}</p>
              {request.messageThreads[0] ? (
                <form action={sendWorkflowMessage} className="mt-5 border-t border-slate-100 pt-5">
                  <input type="hidden" name="threadId" value={request.messageThreads[0].id} />
                  <label className="block text-sm font-bold text-slate-700">Reply</label>
                  <textarea name="body" required rows={3} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Add an update or answer a question..." />
                  <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send Reply</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
