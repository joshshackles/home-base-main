export const dynamic = "force-dynamic";

import Link from "next/link";
import { SignatureNotificationStatus, SignatureStatus } from "@prisma/client";
import { expireOverdueSignatureRequests, queueSignatureReminder, requeueFailedSignatureNotifications, sendQueuedSignatureNotifications, sendSignatureNotificationNow } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";
import { emailProvider, emailQueueStats, queuedEmailBatchSize } from "@/lib/email";
import { emailProcessingDescription, emailProcessingModeLabel, isHobbyMode } from "@/lib/deployment-mode";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminNotificationsPage() {
  const [notifications, pendingSignatures, expiringSoon, overdue, queueStats] = await Promise.all([
    prisma.signatureNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { signatureRequest: { include: { leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } } } } }
    }),
    prisma.signatureRequest.findMany({
      where: { status: SignatureStatus.PENDING },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      include: { leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } } }
    }),
    prisma.signatureRequest.count({
      where: {
        status: SignatureStatus.PENDING,
        expiresAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), gte: new Date() }
      }
    }),
    prisma.signatureRequest.count({ where: { status: SignatureStatus.PENDING, expiresAt: { lt: new Date() } } }),
    emailQueueStats()
  ]);

  const queuedCount = queueStats.queued;
  const failedCount = queueStats.failed;
  const sentCount = queueStats.sent;
  const provider = emailProvider();
  const batchSize = queuedEmailBatchSize();
  const hobbyMode = isHobbyMode();

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Signature notifications"
        description={`Track and send signature notices, reminders, expiration warnings, and overdue signature requests. Current email provider: ${provider}.`}
        actionHref="/admin/leases"
        actionLabel="Back to leases"
      />


      <section className={`mb-6 rounded-3xl border p-5 shadow-sm ${hobbyMode ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">{emailProcessingModeLabel()}</p>
            <h2 className="mt-2 text-xl font-black">Email processing</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6">{emailProcessingDescription()}</p>
            <p className="mt-2 text-sm font-bold">Batch size: {batchSize} · Provider: {provider}</p>
          </div>
          <form action={sendQueuedSignatureNotifications}>
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Process Queue Now</button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Pending signatures</p><p className="mt-2 text-4xl font-black text-slate-950">{pendingSignatures.length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Expiring soon</p><p className="mt-2 text-4xl font-black text-slate-950">{expiringSoon}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Overdue</p><p className="mt-2 text-4xl font-black text-slate-950">{overdue}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">Queued notices</p><p className="mt-2 text-4xl font-black text-slate-950">{queuedCount}</p><p className="mt-1 text-xs font-bold text-slate-500">{sentCount} sent · {failedCount} failed · {queueStats.retrying} retrying later</p></div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Pending signature follow-up</h2>
            <p className="mt-2 text-sm text-slate-600">Queue reminders for individual requests or mark overdue requests as expired.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={sendQueuedSignatureNotifications}>
              <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">Send Queued Emails</button>
            </form>
            <form action={requeueFailedSignatureNotifications}>
              <button type="submit" className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white hover:bg-amber-700">Requeue Failed</button>
            </form>
            <form action={expireOverdueSignatureRequests}>
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Expire Overdue Requests</button>
            </form>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Signer</th><th className="px-4 py-3">Lease</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Reminders</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingSignatures.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No pending signatures.</td></tr> : pendingSignatures.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3"><p className="font-bold text-slate-950">{request.signerName}</p><p className="text-xs text-slate-500">{request.signerEmail} · {label(request.signerRole)}</p></td>
                  <td className="px-4 py-3"><Link href={`/admin/leases/${request.leasePacketId}`} className="font-bold text-brand-700 hover:text-brand-900">{request.leasePacket.application.unit.property.name} #{request.leasePacket.application.unit.unitNumber}</Link><p className="text-xs text-slate-500">{request.leasePacket.application.applicantName}</p></td>
                  <td className="px-4 py-3 text-slate-700">{request.expiresAt ? request.expiresAt.toLocaleDateString() : "Not set"}</td>
                  <td className="px-4 py-3 text-slate-700">{request.reminderCount}</td>
                  <td className="px-4 py-3"><form action={queueSignatureReminder}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="type" value="REMINDER" /><button type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700">Queue Reminder</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">Notification history</h2>
        <div className="mt-5 space-y-3">
          {notifications.length === 0 ? <p className="text-slate-600">No signature notifications have been queued yet.</p> : notifications.map((notification) => (
            <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{notification.subject}</p>
                  <p className="mt-1 text-sm text-slate-600">To {notification.recipientName ?? notification.recipientEmail} · {notification.recipientEmail}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label(notification.type)} · {label(notification.status)} · {notification.createdAt.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">Provider: {notification.provider ?? "not attempted"}{notification.providerMessageId ? ` · Message ID: ${notification.providerMessageId}` : ""}{notification.failureReason ? ` · Error: ${notification.failureReason}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">Attempts: {notification.attemptCount}{notification.nextAttemptAt ? ` · Next retry: ${notification.nextAttemptAt.toLocaleString()}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {notification.status !== SignatureNotificationStatus.SENT ? (
                    <form action={sendSignatureNotificationNow}>
                      <input type="hidden" name="id" value={notification.id} />
                      <button type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-700">Send Now</button>
                    </form>
                  ) : null}
                  <Link href={`/admin/leases/${notification.signatureRequest.leasePacketId}`} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Open Lease</Link>
                </div>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">{notification.body}</pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
