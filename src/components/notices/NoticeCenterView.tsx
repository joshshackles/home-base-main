import Link from "next/link";
import { FormalNoticeAudience, FormalNoticeStatus, FormalNoticeType, NotificationChannel } from "@prisma/client";
import { createFormalNotice, updateFormalNoticeStatus } from "@/app/notices-actions";
import { isNoticeOverdue, noticeStatusLabel, noticeTypeLabel } from "@/lib/notices";

type NoticeCenter = Awaited<ReturnType<typeof import("@/lib/notices").getNoticeCenter>>;
type Option = { id: string; label: string };

type Props = {
  title: string;
  description: string;
  basePath: "admin" | "landlord" | "applicant" | "tenant";
  center: NoticeCenter;
  searchParams?: Record<string, string | string[] | undefined>;
  canCreate?: boolean;
  users?: Option[];
  properties?: Option[];
  units?: Option[];
  applications?: Option[];
  leasePackets?: Option[];
};

function getParam(searchParams: Props["searchParams"], key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(date?: Date | string | null) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function badgeClass(status: FormalNoticeStatus, overdue: boolean) {
  if (overdue) return "bg-red-50 text-red-800 ring-red-200";
  if (status === FormalNoticeStatus.SENT) return "bg-blue-50 text-blue-800 ring-blue-200";
  if (status === FormalNoticeStatus.ACKNOWLEDGED) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === FormalNoticeStatus.CANCELLED || status === FormalNoticeStatus.EXPIRED) return "bg-slate-100 text-slate-600 ring-slate-200";
  if (status === FormalNoticeStatus.READY) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-50 text-slate-800 ring-slate-200";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function FilterSelect({ name, labelText, values, current }: { name: string; labelText: string; values: string[]; current: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      {labelText}
      <select name={name} defaultValue={current || "ALL"} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
        <option value="ALL">All</option>
        {values.map((value) => <option key={value} value={value}>{label(value)}</option>)}
      </select>
    </label>
  );
}

function OptionSelect({ name, labelText, options, defaultValue = "", emptyLabel = "None" }: { name: string; labelText: string; options: Option[]; defaultValue?: string; emptyLabel?: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      {labelText}
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function contextLabel(notice: NoticeCenter["notices"][number]) {
  if (notice.unit) return `${notice.unit.property.name} #${notice.unit.unitNumber}`;
  if (notice.property) return `${notice.property.name} · ${notice.property.city}, ${notice.property.state}`;
  if (notice.application) return `${notice.application.applicantName} · ${notice.application.status}`;
  if (notice.leasePacket) return `${notice.leasePacket.template.name} · ${notice.leasePacket.status}`;
  return "General notice";
}

function recipientLabel(notice: NoticeCenter["notices"][number]) {
  return notice.recipientUser?.name || notice.recipientName || notice.recipientUser?.email || notice.recipientEmail || notice.audience;
}

export function NoticeCenterView({ title, description, basePath, center, searchParams, canCreate = false, users = [], properties = [], units = [], applications = [], leasePackets = [] }: Props) {
  const q = getParam(searchParams, "q");
  const status = getParam(searchParams, "status");
  const type = getParam(searchParams, "type");
  const audience = getParam(searchParams, "audience");
  const scope = getParam(searchParams, "scope");

  return (
    <main className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">Formal notices module</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:min-w-[640px]">
            {[
              ["Draft", center.metrics.draft],
              ["Ready", center.metrics.ready],
              ["Sent", center.metrics.sent],
              ["Ack", center.metrics.acknowledged],
              ["Overdue", center.metrics.overdue],
              ["Expiring", center.metrics.expiringSoon]
            ].map(([labelText, value]) => (
              <div key={String(labelText)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{labelText}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <form className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1.5fr_repeat(4,1fr)_auto]" action={`/${basePath}/notices`}>
            <input name="q" defaultValue={q} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search notices, rentals, recipients..." />
            <FilterSelect name="status" labelText="Status" values={Object.values(FormalNoticeStatus)} current={status} />
            <FilterSelect name="type" labelText="Type" values={Object.values(FormalNoticeType)} current={type} />
            <FilterSelect name="audience" labelText="Audience" values={Object.values(FormalNoticeAudience)} current={audience} />
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Scope
              <select name="scope" defaultValue={scope || "all"} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
                <option value="all">All</option>
                <option value="mine">Mine</option>
              </select>
            </label>
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white md:self-end">Filter</button>
          </form>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.3fr_0.75fr_0.75fr_0.7fr_0.85fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 max-lg:hidden">
              <span>Notice</span><span>Recipient</span><span>Context</span><span>Dates</span><span>Actions</span>
            </div>
            {center.notices.length === 0 ? (
              <div className="p-8 text-center"><p className="text-lg font-black text-slate-950">No notices match this view.</p><p className="mt-1 text-sm text-slate-600">Clear filters or create a formal rent, entry, policy, renewal, or move-out notice.</p></div>
            ) : center.notices.map((notice) => {
              const overdue = isNoticeOverdue(notice.dueAt, notice.status);
              return (
                <div key={notice.id} className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 lg:grid-cols-[1.3fr_0.75fr_0.75fr_0.7fr_0.85fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ${badgeClass(notice.status, overdue)}`}>{overdue ? "OVERDUE" : noticeStatusLabel(notice.status)}</span>
                      <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand-700">{noticeTypeLabel(notice.type)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{notice.audience}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-950">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notice.body}</p>
                  </div>
                  <div className="text-xs text-slate-600"><span className="font-black text-slate-900">{recipientLabel(notice)}</span><br />{notice.recipientEmail || notice.recipientUser?.email || "No email on file"}</div>
                  <div className="text-xs font-bold text-slate-700">{contextLabel(notice)}</div>
                  <div className="text-xs font-bold text-slate-700">Due {formatDate(notice.dueAt)}<br />Sent {formatDate(notice.sentAt)}</div>
                  <div className="flex flex-col gap-2">
                    <form action={updateFormalNoticeStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={notice.id} />
                      <select name="status" defaultValue={notice.status} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold">
                        {(basePath === "applicant" || basePath === "tenant" ? [FormalNoticeStatus.ACKNOWLEDGED] : Object.values(FormalNoticeStatus)).map((value) => <option key={value} value={value}>{noticeStatusLabel(value)}</option>)}
                      </select>
                      <button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Save</button>
                    </form>
                    <Link href={`/${basePath}/notices?notice=${notice.id}`} className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-700">Open</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          {canCreate ? (
            <form action={createFormalNotice} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-black text-slate-950">Create formal notice</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Create rent reminders, late notices, entry notices, lease renewal/non-renewal notices, policy notices, and move-out communications.</p>
              <div className="mt-4 space-y-3">
                <input name="title" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Notice title" required />
                <textarea name="body" className="min-h-32 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Notice body, required action, dates, legal language, and next steps" required />
                <div className="grid grid-cols-2 gap-2">
                  <FilterSelect name="type" labelText="Type" values={Object.values(FormalNoticeType)} current="GENERAL" />
                  <FilterSelect name="audience" labelText="Audience" values={Object.values(FormalNoticeAudience)} current="TENANT" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Priority<select name="priority" defaultValue="2" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal"><option value="1">Low</option><option value="2">Normal</option><option value="3">High</option><option value="4">Urgent</option><option value="5">Critical</option></select></label>
                  <FilterSelect name="deliveryChannel" labelText="Channel" values={Object.values(NotificationChannel)} current="IN_APP" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Due date<input name="dueAt" type="date" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal" /></label>
                  <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Effective date<input name="effectiveAt" type="date" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal" /></label>
                </div>
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Expires<input name="expiresAt" type="date" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal" /></label>
                <OptionSelect name="recipientUserId" labelText="Recipient user" options={users} />
                <div className="grid grid-cols-2 gap-2"><input name="recipientName" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Recipient name" /><input name="recipientEmail" type="email" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Recipient email" /></div>
                <OptionSelect name="unitId" labelText="Applies to" options={units} emptyLabel="Portfolio-wide" />
                <OptionSelect name="applicationId" labelText="Application" options={applications} />
                <OptionSelect name="leasePacketId" labelText="Lease packet" options={leasePackets} />
                <div className="grid grid-cols-2 gap-2"><button name="sendNow" value="no" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-900">Save draft</button><button name="sendNow" value="yes" className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Send notice</button></div>
              </div>
            </form>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
            <p className="text-lg font-black">Notice best practices</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-300">
              <li>Attach every formal notice to the relevant rental, lease, application, or property group.</li>
              <li>Use due and expiration dates so dashboards can surface time-sensitive notices.</li>
              <li>Keep legal notice language consistent with local requirements before relying on it in production.</li>
            </ul>
            <Link href={`/${basePath}`} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950">Back to dashboard</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
