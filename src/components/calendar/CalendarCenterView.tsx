import Link from "next/link";
import { ScheduleEventStatus, ScheduleEventType, ScheduleEventVisibility } from "@prisma/client";
import { assignScheduleEvent, createEventFromTask, createScheduleEvent, updateScheduleEventStatus } from "@/app/calendar-actions";
import { scheduleStatusLabel, scheduleTypeLabel } from "@/lib/calendar";

type CalendarCenter = Awaited<ReturnType<typeof import("@/lib/calendar").getCalendarCenter>>;
type Option = { id: string; label: string };

type Props = {
  title: string;
  description: string;
  basePath: "admin" | "landlord" | "applicant" | "tenant";
  center: CalendarCenter;
  searchParams?: Record<string, string | string[] | undefined>;
  canCreate?: boolean;
  users?: Option[];
  properties?: Option[];
  units?: Option[];
  tasks?: Option[];
};

function getParam(searchParams: Props["searchParams"], key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(date?: Date | string | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

function duration(start: Date | string, end: Date | string) {
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function statusClass(status: ScheduleEventStatus, isPast: boolean) {
  if (status === ScheduleEventStatus.CANCELLED || status === ScheduleEventStatus.NO_SHOW) return "bg-red-50 text-red-800 ring-red-200";
  if (status === ScheduleEventStatus.COMPLETED) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === ScheduleEventStatus.IN_PROGRESS) return "bg-blue-50 text-blue-800 ring-blue-200";
  if (isPast) return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === ScheduleEventStatus.CONFIRMED) return "bg-brand-50 text-brand-700 ring-brand-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

const financialScheduleTypes: ScheduleEventType[] = [ScheduleEventType.RENT_DUE, ScheduleEventType.PAYMENT];
const operationsScheduleTypes: ScheduleEventType[] = [ScheduleEventType.MAINTENANCE, ScheduleEventType.INSPECTION];
const leasingScheduleTypes: ScheduleEventType[] = [ScheduleEventType.MOVE_IN, ScheduleEventType.MOVE_OUT, ScheduleEventType.LEASE_SIGNING];
const inactiveScheduleStatuses: ScheduleEventStatus[] = [ScheduleEventStatus.COMPLETED, ScheduleEventStatus.CANCELLED, ScheduleEventStatus.NO_SHOW];

function typeClass(type: ScheduleEventType) {
  if (financialScheduleTypes.includes(type)) return "bg-emerald-600 text-white";
  if (operationsScheduleTypes.includes(type)) return "bg-amber-500 text-white";
  if (leasingScheduleTypes.includes(type)) return "bg-blue-600 text-white";
  return "bg-slate-900 text-white";
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

function OptionSelect({ name, labelText, options, defaultValue = "", emptyLabel = "None", multiple = false }: { name: string; labelText: string; options: Option[]; defaultValue?: string; emptyLabel?: string; multiple?: boolean }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      {labelText}
      <select name={name} defaultValue={multiple ? undefined : defaultValue} multiple={multiple} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
        {!multiple ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function CalendarCenterView({ title, description, basePath, center, searchParams, canCreate = false, users = [], properties = [], units = [], tasks = [] }: Props) {
  const status = getParam(searchParams, "status");
  const type = getParam(searchParams, "type");
  const q = getParam(searchParams, "q");
  const range = getParam(searchParams, "range") || "upcoming";
  const owner = getParam(searchParams, "owner") || "all";

  return (
    <main className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">Calendar / scheduling command center</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:min-w-[620px]">
            {[["Today", center.metrics.today], ["7 days", center.metrics.upcoming], ["Past due", center.metrics.overdue], ["Mine", center.metrics.mine], ["Tours", center.metrics.tours], ["Ops", center.metrics.maintenance]].map(([labelText, value]) => (
              <div key={String(labelText)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{labelText}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <form className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1.5fr_repeat(4,1fr)_auto]" action={`/${basePath}/calendar`}>
            <input name="q" defaultValue={q} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search schedules, rentals, people..." />
            <FilterSelect name="status" labelText="Status" values={Object.values(ScheduleEventStatus)} current={status} />
            <FilterSelect name="type" labelText="Type" values={Object.values(ScheduleEventType)} current={type} />
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Range
              <select name="range" defaultValue={range} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
                <option value="upcoming">Upcoming</option><option value="today">Today</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option><option value="all">All</option>
              </select>
            </label>
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Owner
              <select name="owner" defaultValue={owner} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
                <option value="all">All</option><option value="mine">Assigned to me</option>
              </select>
            </label>
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white md:self-end">Filter</button>
          </form>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.25fr_0.9fr_0.75fr_0.8fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 max-lg:hidden">
              <span>Event</span><span>When</span><span>Context</span><span>People</span><span>Actions</span>
            </div>
            {center.events.length === 0 ? (
              <div className="p-8 text-center"><p className="text-lg font-black text-slate-950">No events match this schedule.</p><p className="mt-1 text-sm text-slate-600">Clear filters or create a new tour, inspection, move-in, renewal, or maintenance window.</p></div>
            ) : center.events.map((event) => {
              const isPast = new Date(event.endsAt) < new Date() && !inactiveScheduleStatuses.includes(event.status);
              const context = event.unit ? `${event.unit.property.name} #${event.unit.unitNumber}` : event.property?.name || event.taskItem?.title || "General schedule";
              return (
                <div key={event.id} className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 lg:grid-cols-[1.25fr_0.9fr_0.75fr_0.8fr_0.9fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${typeClass(event.type)}`}>{scheduleTypeLabel(event.type)}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ${statusClass(event.status, isPast)}`}>{isPast ? "Needs update" : scheduleStatusLabel(event.status)}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-950">{event.title}</p>
                    {event.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{event.description}</p> : null}
                    {event.location || event.meetingUrl ? <p className="mt-1 text-xs font-bold text-slate-500">{event.location}{event.location && event.meetingUrl ? " · " : ""}{event.meetingUrl ? "Virtual link attached" : ""}</p> : null}
                  </div>
                  <div className="text-xs font-bold text-slate-700">{formatTime(event.startsAt)}<br /><span className="text-slate-500">{duration(event.startsAt, event.endsAt)}</span></div>
                  <div className="text-xs font-bold text-slate-700">{context}</div>
                  <div className="text-xs text-slate-600"><span className="font-bold text-slate-900">{event.assignedTo?.name || event.assignedTo?.email || "Unassigned"}</span><br />{event.participants.length} participant{event.participants.length === 1 ? "" : "s"}</div>
                  <div className="flex flex-col gap-2">
                    <form action={updateScheduleEventStatus} className="flex gap-2"><input type="hidden" name="id" value={event.id} /><select name="status" defaultValue={event.status} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold">{Object.values(ScheduleEventStatus).map((value) => <option key={value} value={value}>{scheduleStatusLabel(value)}</option>)}</select><button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Save</button></form>
                    {basePath !== "applicant" ? <form action={assignScheduleEvent} className="flex gap-2"><input type="hidden" name="id" value={event.id} /><select name="assignedToId" defaultValue={event.assignedTo?.id ?? ""} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select><button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Assign</button></form> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          {canCreate ? (
            <form action={createScheduleEvent} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-black text-slate-950">Create event</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Schedule tours, inspections, maintenance windows, move-ins, renewals, rent reminders, and operational follow-up.</p>
              <div className="mt-4 space-y-3">
                <input name="title" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Event title" required />
                <textarea name="description" className="min-h-20 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Instructions, access notes, reminder details" />
                <div className="grid grid-cols-2 gap-2"><FilterSelect name="type" labelText="Type" values={Object.values(ScheduleEventType)} current="GENERAL" /><FilterSelect name="status" labelText="Status" values={Object.values(ScheduleEventStatus)} current="SCHEDULED" /></div>
                <FilterSelect name="visibility" labelText="Visibility" values={Object.values(ScheduleEventVisibility)} current="PARTICIPANTS" />
                <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Starts<input name="startsAt" type="datetime-local" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" required /></label><label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Ends<input name="endsAt" type="datetime-local" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" required /></label></div>
                <input name="location" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Location or access instructions" />
                <input name="meetingUrl" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Virtual meeting link" />
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Reminder minutes<input name="reminderMinutes" type="number" min="0" max="10080" defaultValue="60" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" /></label>
                <OptionSelect name="assignedToId" labelText="Owner" options={users} />
                <OptionSelect name="participantIds" labelText="Participants" options={users} multiple />
                <OptionSelect name="unitId" labelText="Applies to" options={units} emptyLabel="Portfolio-wide" />
                <OptionSelect name="taskItemId" labelText="Linked task" options={tasks} />
                <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Create event</button>
              </div>
            </form>
          ) : null}

          {canCreate && tasks.length > 0 ? (
            <form action={createEventFromTask} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-base font-black text-slate-950">Schedule a task</p>
              <div className="mt-3 space-y-3"><OptionSelect name="taskItemId" labelText="Task" options={tasks} /><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Starts<input name="startsAt" type="datetime-local" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" required /></label><label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Ends<input name="endsAt" type="datetime-local" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" required /></label></div><button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Add task to calendar</button></div>
            </form>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
            <p className="text-lg font-black">Scheduling best practices</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-300"><li>Attach every event to a rental, task, or property group when possible.</li><li>Use confirmed for events the participant has acknowledged.</li><li>Keep move-ins, inspections, lease signings, payment deadlines, and maintenance windows visible in one place.</li></ul>
            <Link href={`/${basePath}`} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950">Back to workspace</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
