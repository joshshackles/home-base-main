export const dynamic = "force-dynamic";

import { MaintenanceRequestStatus, UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWorkflowMessage, updateMaintenanceRequestStatus } from "@/app/workflow-actions";

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

export default async function LandlordMaintenancePage() {
  const user = await requireRole(["LANDLORD"], "/landlord/maintenance");
  const where = user.role === UserRole.ADMIN ? {} : { unit: { property: { ownerId: user.userId } } };
  const [requests, staff] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        unit: { include: { property: true } },
        application: true,
        messageThreads: { include: { messages: { include: { sender: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 3 } } }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.user.findMany({ where: { role: { in: [UserRole.ADMIN, UserRole.LANDLORD, UserRole.INSPECTOR] }, isActive: true }, select: { id: true, name: true, email: true, role: true }, orderBy: { email: "asc" } })
  ]);

  const openCount = requests.filter((request) => !["COMPLETED", "CANCELLED"].includes(request.status)).length;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Maintenance</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Maintenance queue</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">Track tenant requests, assign staff, update status, and keep notes/messages attached to the repair.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Open</p><p className="text-4xl font-black text-slate-950">{openCount}</p></div>
      </div>

      <section className="space-y-4">
        {requests.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">No maintenance requests found.</div> : requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{request.subject}</h2>
                <p className="mt-1 text-sm text-slate-600">{request.unit?.property.name} {request.unit ? `#${request.unit.unitNumber}` : ""} · Requested by {request.requester.name || request.requester.email}</p>
              </div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(request.status)}</span><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700">{label(request.priority)}</span></div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-slate-700">{request.description}</p>
            {request.accessNotes ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Access notes:</strong> {request.accessNotes}</p> : null}

            <form action={updateMaintenanceRequestStatus} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="id" value={request.id} />
              <select name="status" defaultValue={request.status} className="rounded-2xl border border-slate-300 px-4 py-3">
                {Object.values(MaintenanceRequestStatus).map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
              <select name="assignedToId" defaultValue={request.assignedTo?.id ?? ""} className="rounded-2xl border border-slate-300 px-4 py-3">
                <option value="">Unassigned</option>
                {staff.map((member) => <option key={member.id} value={member.id}>{member.name || member.email} ({label(member.role)})</option>)}
              </select>
              <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Update</button>
            </form>

            {request.messageThreads[0] ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <h3 className="font-black text-slate-950">Recent messages</h3>
                <div className="mt-3 space-y-3">
                  {request.messageThreads[0].messages.map((message) => <div key={message.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700"><p className="font-bold text-slate-950">{message.sender.name || message.sender.email}</p><p className="mt-1 whitespace-pre-wrap">{message.body}</p></div>)}
                </div>
                <form action={sendWorkflowMessage} className="mt-4">
                  <input type="hidden" name="threadId" value={request.messageThreads[0].id} />
                  <textarea name="body" required rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Reply to the requester..." />
                  <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send Message</button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
