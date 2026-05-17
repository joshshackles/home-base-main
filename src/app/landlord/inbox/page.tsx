import { MessageThreadType, UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWorkflowMessage } from "@/app/workflow-actions";

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

export default async function LandlordInboxPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/inbox");
  const where = { OR: [{ maintenanceRequest: { unit: { property: { ownerId: user.userId } } } }, { application: { unit: { property: { ownerId: user.userId } } } }, { createdById: user.userId }] };
  const threads = await prisma.messageThread.findMany({
    where,
    include: {
      createdBy: { select: { name: true, email: true, role: true } },
      application: { include: { unit: { include: { property: true } } } },
      maintenanceRequest: { include: { unit: { include: { property: true } } } },
      messages: { include: { sender: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } }
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Inbox</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Workflow messages</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">Messages stay connected to applications, leases, and maintenance requests so staff and applicants can see the full history.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Threads</p><p className="text-4xl font-black text-slate-950">{threads.length}</p></div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form action={sendWorkflowMessage} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">New message</h2>
          <label className="mt-5 block text-sm font-bold text-slate-700">Type</label>
          <select name="type" defaultValue={MessageThreadType.GENERAL} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
            {Object.values(MessageThreadType).map((type) => <option key={type} value={type}>{label(type)}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold text-slate-700">Subject</label>
          <input name="subject" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Question about my application" />
          <label className="mt-4 block text-sm font-bold text-slate-700">Message</label>
          <textarea name="body" required rows={5} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isInternal" value="true" /> Internal staff note</label>
          <button className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Send Message</button>
        </form>

        <div className="space-y-4">
          {threads.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">No messages yet.</div> : threads.map((thread) => (
            <article key={thread.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{thread.subject}</h2>
                  <p className="mt-1 text-sm text-slate-600">{label(thread.type)} · {label(thread.status)} · Started by {thread.createdBy.name || thread.createdBy.email}</p>
                  {thread.application ? <p className="mt-1 text-xs font-bold uppercase text-slate-500">Application: {thread.application.unit.property.name} #{thread.application.unit.unitNumber}</p> : null}
                  {thread.maintenanceRequest ? <p className="mt-1 text-xs font-bold uppercase text-slate-500">Maintenance: {thread.maintenanceRequest.subject}</p> : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{thread.messages.length} messages</span>
              </div>
              <div className="mt-5 space-y-3">
                {thread.messages.map((message) => (
                  <div key={message.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-slate-950">{message.sender.name || message.sender.email}</p>{message.isInternal ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-800">Internal</span> : null}</div>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">{message.body}</p>
                  </div>
                ))}
              </div>
              <form action={sendWorkflowMessage} className="mt-5 border-t border-slate-100 pt-5">
                <input type="hidden" name="threadId" value={thread.id} />
                <textarea name="body" required rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Reply..." />
                <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isInternal" value="true" /> Internal staff note</label>
                <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Reply</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
