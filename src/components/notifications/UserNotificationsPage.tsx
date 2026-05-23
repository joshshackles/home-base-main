import Link from "next/link";
import { NotificationDeliveryStatus, NotificationPreferenceFrequency, NotificationTemplateKey } from "@prisma/client";
import { Bell, CheckCheck, ExternalLink, SlidersHorizontal, Trash2 } from "lucide-react";
import { dismissNotification, markAllNotificationsRead, markNotificationRead, openNotification, saveNotificationPreferences } from "@/app/notifications/actions";
import { prisma } from "@/lib/prisma";
import { ensureDefaultNotificationPreferences, notificationLabel, notificationStats } from "@/lib/notifications";

function frequencyOptions() {
  return Object.values(NotificationPreferenceFrequency).map((option) => <option key={option} value={option}>{notificationLabel(option)}</option>);
}

function badge(status: string) {
  const tone = status === "FAILED" ? "bg-red-50 text-red-700 ring-red-100" : status === "READ" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-blue-50 text-blue-700 ring-blue-100";
  return <span className={`rounded-full px-2 py-1 text-[11px] font-black ring-1 ${tone}`}>{notificationLabel(status)}</span>;
}

export async function UserNotificationsPage({ userId, title, description }: { userId: string; title: string; description: string }) {
  await ensureDefaultNotificationPreferences(userId);
  const [deliveries, preferences, stats] = await Promise.all([
    prisma.notificationDelivery.findMany({ where: { recipientUserId: userId, status: { not: NotificationDeliveryStatus.DISMISSED } }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 100 }),
    prisma.notificationPreference.findMany({ where: { userId }, orderBy: { key: "asc" } }),
    notificationStats(userId)
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Notifications Center</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <form action={markAllNotificationsRead}><button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white"><CheckCheck className="h-4 w-4" /> Mark all read</button></form>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{stats.unread}</p><p className="text-xs font-black uppercase text-slate-500">Unread</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{stats.queued}</p><p className="text-xs font-black uppercase text-slate-500">Queued</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{stats.sent}</p><p className="text-xs font-black uppercase text-slate-500">Delivered</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{stats.failed}</p><p className="text-xs font-black uppercase text-slate-500">Failed</p></div>
        </div>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-brand-700" /><h2 className="text-xl font-black text-slate-950">Recent alerts</h2></div>
          <div className="mt-4 space-y-3">
            {deliveries.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">No active notifications yet. Important application, lease, payment, maintenance, and system alerts are listed here when they need your attention.</div> : deliveries.map((delivery) => (
              <article key={delivery.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{delivery.title}</p>{badge(delivery.status)}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{delivery.body}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">{notificationLabel(delivery.key)} / {delivery.createdAt.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {delivery.actionHref ? <form action={openNotification}><input type="hidden" name="id" value={delivery.id} /><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white"><ExternalLink className="mr-1 inline h-3 w-3" />Open</button></form> : null}
                    {delivery.status !== NotificationDeliveryStatus.READ ? <form action={markNotificationRead}><input type="hidden" name="id" value={delivery.id} /><button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Read</button></form> : null}
                    <form action={dismissNotification}><input type="hidden" name="id" value={delivery.id} /><button title="Dismiss" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"><Trash2 className="h-3 w-3" /></button></form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-brand-700" /><h2 className="text-xl font-black text-slate-950">Preferences</h2></div>
          <p className="mt-1 text-sm text-slate-600">Choose how HomeBase notifies you about operational events.</p>
          <form action={saveNotificationPreferences} className="mt-4 space-y-3">
            {Object.values(NotificationTemplateKey).map((key) => {
              const pref = preferences.find((item) => item.key === key);
              return <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-black text-slate-950">{notificationLabel(key)}</p><div className="mt-2 grid grid-cols-3 gap-2"><label className="text-xs font-bold text-slate-500">In-app<select name={`${key}:inApp`} defaultValue={pref?.inAppFrequency ?? "INSTANT"} className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-xs">{frequencyOptions()}</select></label><label className="text-xs font-bold text-slate-500">Email<select name={`${key}:email`} defaultValue={pref?.emailFrequency ?? "INSTANT"} className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-xs">{frequencyOptions()}</select></label><label className="text-xs font-bold text-slate-500">SMS<select name={`${key}:sms`} defaultValue={pref?.smsFrequency ?? "DISABLED"} className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-xs">{frequencyOptions()}</select></label></div></div>;
            })}
            <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white">Save preferences</button>
          </form>
        </div>
      </section>
    </main>
  );
}
