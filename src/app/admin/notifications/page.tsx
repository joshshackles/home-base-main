export const dynamic = "force-dynamic";

import Link from "next/link";
import { NotificationChannel, NotificationDeliveryStatus, NotificationPreferenceFrequency, NotificationTemplateKey, SignatureNotificationStatus, SignatureStatus, UserRole } from "@prisma/client";
import { Bell, Mail, Megaphone, Send, Settings, ShieldAlert } from "lucide-react";
import { expireOverdueSignatureRequests, queueSignatureReminder, requeueFailedSignatureNotifications, sendQueuedSignatureNotifications, sendSignatureNotificationNow } from "@/app/admin/actions";
import { processNotificationQueue, saveNotificationTemplate, sendAdminBroadcast, sendNotificationNow } from "@/app/notifications/actions";
import { prisma } from "@/lib/prisma";
import { emailProvider, emailQueueStats, queuedEmailBatchSize } from "@/lib/email";
import { emailProcessingDescription, emailProcessingModeLabel, isHobbyMode } from "@/lib/deployment-mode";
import { ensureDefaultNotificationTemplates, notificationLabel, notificationStats } from "@/lib/notifications";

function metric(label: string, value: number | string, help: string) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-500">{help}</p></div>;
}

function frequencyOptions() {
  return Object.values(NotificationPreferenceFrequency).map((option) => <option key={option} value={option}>{notificationLabel(option)}</option>);
}

export default async function AdminNotificationsPage() {
  await ensureDefaultNotificationTemplates();
  const [deliveries, templates, genericStats, signatureNotifications, pendingSignatures, expiringSoon, overdue, signatureQueueStats] = await Promise.all([
    prisma.notificationDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { recipient: { select: { name: true, email: true, role: true } } } }),
    prisma.notificationTemplate.findMany({ orderBy: [{ key: "asc" }, { channel: "asc" }] }),
    notificationStats(),
    prisma.signatureNotification.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { signatureRequest: { include: { leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } } } } } }),
    prisma.signatureRequest.findMany({ where: { status: SignatureStatus.PENDING }, orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }], take: 20, include: { leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } } } }),
    prisma.signatureRequest.count({ where: { status: SignatureStatus.PENDING, expiresAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), gte: new Date() } } }),
    prisma.signatureRequest.count({ where: { status: SignatureStatus.PENDING, expiresAt: { lt: new Date() } } }),
    emailQueueStats()
  ]);

  const provider = emailProvider();
  const batchSize = queuedEmailBatchSize();
  const hobbyMode = isHobbyMode();

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Admin</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Notifications Center</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Control in-app alerts, email templates, delivery logs, preferences, and lease signature notification queues from one operational surface.</p>
        </div>
        <form action={processNotificationQueue}><button className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700">Process queue</button></form>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        {metric("Generic queued", genericStats.queued, "App and email notifications waiting")}
        {metric("Generic failed", genericStats.failed, "Delivery failures needing review")}
        {metric("Generic sent", genericStats.sent, "Successfully delivered notifications")}
        {metric("Signature queued", signatureQueueStats.queued, "Lease e-sign notices waiting")}
        {metric("Signature failed", signatureQueueStats.failed, "Lease delivery failures")}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-brand-700" /><h2 className="text-xl font-black text-slate-950">Broadcast alert</h2></div>
          <form action={sendAdminBroadcast} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">Audience<select name="role" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="ALL">All active users</option>{Object.values(UserRole).map((role) => <option key={role} value={role}>{notificationLabel(role)}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-700">Action link<input name="actionHref" placeholder="/admin/operations" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
            <label className="md:col-span-2 text-sm font-bold text-slate-700">Title<input name="title" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
            <label className="md:col-span-2 text-sm font-bold text-slate-700">Message<textarea name="body" required rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
            <div className="md:col-span-2"><button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Send in-app broadcast</button></div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-200" /><h2 className="text-xl font-black">Delivery configuration</h2></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs uppercase text-blue-100">Provider</p><p className="font-black">{provider}</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs uppercase text-blue-100">Batch size</p><p className="font-black">{batchSize}</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs uppercase text-blue-100">Mode</p><p className="font-black">{emailProcessingModeLabel()}</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs uppercase text-blue-100">Vercel</p><p className="font-black">{hobbyMode ? "Hobby safe" : "Production"}</p></div>
          </div>
          <p className="mt-4 text-sm text-blue-100">{emailProcessingDescription()}</p>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-brand-700" /><h2 className="text-xl font-black text-slate-950">Template studio</h2></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {templates.map((template) => (
            <form key={template.id} action={saveNotificationTemplate} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <input type="hidden" name="id" value={template.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs font-black uppercase text-slate-500">Event<select name="key" defaultValue={template.key} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{Object.values(NotificationTemplateKey).map((key) => <option key={key} value={key}>{notificationLabel(key)}</option>)}</select></label>
                <label className="text-xs font-black uppercase text-slate-500">Channel<select name="channel" defaultValue={template.channel} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{Object.values(NotificationChannel).map((channel) => <option key={channel} value={channel}>{notificationLabel(channel)}</option>)}</select></label>
              </div>
              <input name="name" defaultValue={template.name} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
              <input name="subject" defaultValue={template.subject} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea name="body" defaultValue={template.body} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <div className="mt-2 flex items-center justify-between"><label className="text-xs font-bold text-slate-600"><input type="checkbox" name="isActive" value="true" defaultChecked={template.isActive} className="mr-2" />Active</label><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Save</button></div>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Bell className="h-5 w-5 text-brand-700" /><h2 className="text-xl font-black text-slate-950">Delivery log</h2></div><form action={processNotificationQueue}><button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Retry queued</button></form></div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Message</th><th className="px-3 py-2">Recipient</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="px-3 py-2"><p className="font-black text-slate-950">{delivery.title}</p><p className="text-xs text-slate-500">{notificationLabel(delivery.key)} · {delivery.createdAt.toLocaleString()}</p></td>
                  <td className="px-3 py-2 text-slate-700">{delivery.recipient?.name ?? delivery.recipientEmail ?? "Unassigned"}<p className="text-xs text-slate-500">{delivery.recipient?.email}</p></td>
                  <td className="px-3 py-2 text-slate-700">{notificationLabel(delivery.channel)}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{notificationLabel(delivery.status)}</span>{delivery.failureReason ? <p className="mt-1 text-xs text-red-600">{delivery.failureReason}</p> : null}</td>
                  <td className="px-3 py-2">{delivery.status !== NotificationDeliveryStatus.SENT && delivery.status !== NotificationDeliveryStatus.READ ? <form action={sendNotificationNow}><input type="hidden" name="id" value={delivery.id} /><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white"><Send className="mr-1 inline h-3 w-3" />Send</button></form> : delivery.actionHref ? <Link href={delivery.actionHref} className="text-xs font-black text-brand-700">Open</Link> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-700" /><h2 className="text-xl font-black text-slate-950">Lease signature queue</h2></div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {metric("Pending signatures", pendingSignatures.length, "Requests waiting on signers")}
          {metric("Expiring soon", expiringSoon, "Due within three days")}
          {metric("Overdue", overdue, "Expired or past due")}
          <div className="rounded-2xl border border-amber-200 bg-white p-4"><form action={sendQueuedSignatureNotifications}><button className="w-full rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Send signature queue</button></form><form action={requeueFailedSignatureNotifications} className="mt-2"><button className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Requeue failed</button></form><form action={expireOverdueSignatureRequests} className="mt-2"><button className="w-full rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">Expire overdue</button></form></div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {pendingSignatures.slice(0, 8).map((request) => (
            <div key={request.id} className="rounded-2xl border border-amber-200 bg-white p-3">
              <p className="font-black text-slate-950">{request.signerName} · {notificationLabel(request.role)}</p>
              <p className="text-xs text-slate-500">{request.leasePacket.application.unit.property.name} #{request.leasePacket.application.unit.unitNumber} · expires {request.expiresAt ? request.expiresAt.toLocaleDateString() : "not set"}</p>
              <form action={queueSignatureReminder} className="mt-2"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="type" value="REMINDER" /><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Queue reminder</button></form>
            </div>
          ))}
        </div>
        <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-slate-700">Recent signature notification history</summary><div className="mt-3 space-y-2">{signatureNotifications.map((notification) => <article key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="font-black text-slate-950">{notification.subject}</p><p className="text-xs text-slate-500">To {notification.recipientEmail} · {notificationLabel(notification.status)} · Attempts {notification.attemptCount}</p>{notification.status !== SignatureNotificationStatus.SENT ? <form action={sendSignatureNotificationNow} className="mt-2"><input type="hidden" name="id" value={notification.id} /><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Send now</button></form> : null}</article>)}</div></details>
      </section>
    </main>
  );
}
