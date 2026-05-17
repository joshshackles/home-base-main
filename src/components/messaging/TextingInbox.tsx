import { MessageCircle, Plus, SendHorizonal } from "lucide-react";
import { MessageThreadType } from "@prisma/client";
import { sendWorkflowMessage } from "@/app/workflow-actions";

type Sender = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type Message = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  sender: Sender;
};

type Thread = {
  id: string;
  subject: string;
  type: string;
  status: string;
  createdAt: Date;
  lastMessageAt: Date | null;
  createdBy: Sender;
  application: { unit: { unitNumber: string; property: { name: string } } } | null;
  maintenanceRequest: { subject: string } | null;
  messages: Message[];
};

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function senderLabel(sender: Sender) {
  return sender.name || sender.email;
}

function threadContext(thread: Thread) {
  if (thread.application) return `${thread.application.unit.property.name} #${thread.application.unit.unitNumber}`;
  if (thread.maintenanceRequest) return thread.maintenanceRequest.subject;
  return label(thread.type);
}

export function TextingInbox({ currentUserId, threads, allowInternalNotes }: { currentUserId: string; threads: Thread[]; allowInternalNotes?: boolean }) {
  const activeThread = threads[0] ?? null;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-950">Messages</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">Text-style conversations connected to applications, leases, maintenance, and account work.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">{threads.length} threads</div>
      </div>

      <section className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-4">
            <form action={sendWorkflowMessage} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Plus size={18} /></span>
                <h2 className="font-black text-slate-950">New thread</h2>
              </div>
              <select name="type" defaultValue={MessageThreadType.GENERAL} className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900">
                {Object.values(MessageThreadType).map((type) => <option key={type} value={type}>{label(type)}</option>)}
              </select>
              <input name="subject" required className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subject" />
              <textarea name="body" required rows={3} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6" placeholder="Start typing..." />
              {allowInternalNotes ? <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isInternal" value="true" /> Internal note</label> : null}
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700" type="submit"><SendHorizonal size={16} /> Send</button>
            </form>
          </div>

          <div className="max-h-[660px] overflow-y-auto p-3">
            {threads.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">No messages yet.</div>
            ) : threads.map((thread, index) => {
              const latest = thread.messages.at(-1);
              return (
                <a key={thread.id} href={`#thread-${thread.id}`} className={`block rounded-2xl p-4 transition ${index === 0 ? "bg-slate-950 text-white" : "bg-white text-slate-800 hover:bg-brand-50"} mb-2 ring-1 ring-slate-200`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{thread.subject}</p>
                      <p className={`mt-1 text-xs font-bold uppercase ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>{threadContext(thread)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${index === 0 ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}>{thread.messages.length}</span>
                  </div>
                  <p className={`mt-3 line-clamp-2 text-sm leading-6 ${index === 0 ? "text-slate-300" : "text-slate-600"}`}>{latest ? latest.body : "No messages in this thread yet."}</p>
                </a>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[640px] bg-slate-100">
          {activeThread ? (
            <div id={`thread-${activeThread.id}`} className="flex min-h-[640px] flex-col">
              <header className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-brand-700">{label(activeThread.status)}</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{activeThread.subject}</h2>
                    <p className="mt-1 text-sm text-slate-600">{threadContext(activeThread)} - started by {senderLabel(activeThread.createdBy)}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><MessageCircle size={21} /></span>
                </div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
                {activeThread.messages.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">No messages in this thread yet.</p> : activeThread.messages.map((message) => {
                  const isMine = message.sender.id === currentUserId;
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${message.isInternal ? "bg-amber-100 text-amber-950" : isMine ? "bg-brand-600 text-white" : "bg-white text-slate-900"}`}>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase opacity-75">
                          <span>{senderLabel(message.sender)}</span>
                          {message.isInternal ? <span>Internal</span> : null}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        <p className="mt-2 text-right text-[11px] font-bold opacity-70">{message.createdAt.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form action={sendWorkflowMessage} className="border-t border-slate-200 bg-white p-4">
                <input type="hidden" name="threadId" value={activeThread.id} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <textarea name="body" required rows={2} className="min-h-14 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6" placeholder="Message..." />
                  <div className="flex shrink-0 flex-col gap-2">
                    {allowInternalNotes ? <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isInternal" value="true" /> Internal</label> : null}
                    <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800" type="submit"><SendHorizonal size={16} /> Reply</button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[640px] items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto text-slate-400" size={48} />
                <h2 className="mt-4 text-2xl font-black text-slate-950">No conversation selected</h2>
                <p className="mt-2 max-w-md text-slate-600">Start a new thread and it will appear here as a text-style conversation.</p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
