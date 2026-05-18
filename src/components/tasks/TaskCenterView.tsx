import Link from "next/link";
import { TaskItemPriority, TaskItemStatus, TaskItemType, UserRole } from "@prisma/client";
import { assignTaskItem, createTaskItem, updateTaskStatus } from "@/app/tasks-actions";
import { isTaskOverdue, taskStatusLabel } from "@/lib/tasks";

type TaskCenter = Awaited<ReturnType<typeof import("@/lib/tasks").getTaskCenter>>;

type Option = { id: string; label: string };

type Props = {
  title: string;
  description: string;
  basePath: "admin" | "landlord" | "applicant";
  center: TaskCenter;
  searchParams?: Record<string, string | string[] | undefined>;
  canCreate?: boolean;
  users?: Option[];
  properties?: Option[];
  units?: Option[];
  applications?: Option[];
  maintenanceRequests?: Option[];
  leasePackets?: Option[];
  documents?: Option[];
};

function getParam(searchParams: Props["searchParams"], key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date?: Date | string | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function statusClass(status: TaskItemStatus, overdue: boolean) {
  if (overdue) return "bg-red-50 text-red-800 ring-red-200";
  if (status === TaskItemStatus.DONE) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === TaskItemStatus.BLOCKED) return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === TaskItemStatus.IN_PROGRESS) return "bg-blue-50 text-blue-800 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function priorityClass(priority: TaskItemPriority) {
  if (priority === TaskItemPriority.URGENT) return "bg-red-600 text-white";
  if (priority === TaskItemPriority.HIGH) return "bg-amber-500 text-white";
  if (priority === TaskItemPriority.LOW) return "bg-slate-100 text-slate-600";
  return "bg-blue-50 text-blue-700";
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

function OptionSelect({ name, labelText, options, defaultValue = "" }: { name: string; labelText: string; options: Option[]; defaultValue?: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      {labelText}
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
        <option value="">None</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function TaskCenterView({ title, description, basePath, center, searchParams, canCreate = false, users = [], properties = [], units = [], applications = [], maintenanceRequests = [], leasePackets = [], documents = [] }: Props) {
  const status = getParam(searchParams, "status");
  const priority = getParam(searchParams, "priority");
  const type = getParam(searchParams, "type");
  const q = getParam(searchParams, "q");
  const owner = getParam(searchParams, "owner");

  return (
    <main className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">Task/work order command center</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:min-w-[620px]">
            {[
              ["Open", center.metrics.open],
              ["Overdue", center.metrics.overdue],
              ["Due soon", center.metrics.dueSoon],
              ["Mine", center.metrics.mine],
              ["Blocked", center.metrics.blocked],
              ["Done", center.metrics.done]
            ].map(([labelText, value]) => (
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
          <form className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1.5fr_repeat(4,1fr)_auto]" action={`/${basePath}/tasks`}>
            <input name="q" defaultValue={q} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search tasks, rentals, people..." />
            <FilterSelect name="status" labelText="Status" values={Object.values(TaskItemStatus)} current={status} />
            <FilterSelect name="priority" labelText="Priority" values={Object.values(TaskItemPriority)} current={priority} />
            <FilterSelect name="type" labelText="Type" values={Object.values(TaskItemType)} current={type} />
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Owner
              <select name="owner" defaultValue={owner || "all"} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900">
                <option value="all">All</option>
                <option value="mine">Assigned to me</option>
              </select>
            </label>
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white md:self-end">Filter</button>
          </form>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.3fr_0.75fr_0.7fr_0.75fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 max-lg:hidden">
              <span>Task</span><span>Context</span><span>Owner</span><span>Due</span><span>Actions</span>
            </div>
            {center.tasks.length === 0 ? (
              <div className="p-8 text-center"><p className="text-lg font-black text-slate-950">No tasks match this view.</p><p className="mt-1 text-sm text-slate-600">Clear filters or create a new operational task.</p></div>
            ) : center.tasks.map((task) => {
              const overdue = isTaskOverdue(task.dueAt, task.status);
              const context = task.unit ? `${task.unit.property.name} #${task.unit.unitNumber}` : task.property?.name || task.application?.applicantName || task.maintenanceRequest?.subject || task.leasePacket?.template.name || task.document?.title || "General operations";
              return (
                <div key={task.id} className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 lg:grid-cols-[1.3fr_0.75fr_0.7fr_0.75fr_0.9fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${priorityClass(task.priority)}`}>{task.priority}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ${statusClass(task.status, overdue)}`}>{overdue ? "OVERDUE" : taskStatusLabel(task.status)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{label(task.type)}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-950">{task.title}</p>
                    {task.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{task.description}</p> : null}
                  </div>
                  <div className="text-xs font-bold text-slate-700">{context}</div>
                  <div className="text-xs text-slate-600"><span className="font-bold text-slate-900">{task.assignedTo?.name || task.assignedTo?.email || "Unassigned"}</span><br />Created by {task.createdBy?.name || task.createdBy?.email || "System"}</div>
                  <div className="text-xs font-bold text-slate-700">{formatDate(task.dueAt)}</div>
                  <div className="flex flex-col gap-2">
                    <form action={updateTaskStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={task.id} />
                      <select name="status" defaultValue={task.status} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold">
                        {Object.values(TaskItemStatus).map((value) => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}
                      </select>
                      <button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">Save</button>
                    </form>
                    {basePath !== "applicant" ? <form action={assignTaskItem} className="flex gap-2"><input type="hidden" name="id" value={task.id} /><select name="assignedToId" defaultValue={task.assignedTo?.id ?? ""} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select><button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Assign</button></form> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          {canCreate ? (
            <form action={createTaskItem} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-black text-slate-950">Create task</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Create a work order, leasing follow-up, document chase, collections task, or general operational assignment.</p>
              <div className="mt-4 space-y-3">
                <input name="title" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Task title" required />
                <textarea name="description" className="min-h-20 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Instructions, context, requirements" />
                <div className="grid grid-cols-2 gap-2">
                  <FilterSelect name="type" labelText="Type" values={Object.values(TaskItemType)} current="GENERAL" />
                  <FilterSelect name="priority" labelText="Priority" values={Object.values(TaskItemPriority)} current="NORMAL" />
                </div>
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Due date<input name="dueAt" type="date" className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900" /></label>
                <OptionSelect name="assignedToId" labelText="Assign to" options={users} />
                <OptionSelect name="propertyId" labelText="Property group" options={properties} />
                <OptionSelect name="unitId" labelText="Rental" options={units} />
                <OptionSelect name="applicationId" labelText="Application" options={applications} />
                <OptionSelect name="maintenanceRequestId" labelText="Maintenance" options={maintenanceRequests} />
                <OptionSelect name="leasePacketId" labelText="Lease" options={leasePackets} />
                <OptionSelect name="documentId" labelText="Document" options={documents} />
                <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Create task</button>
              </div>
            </form>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
            <p className="text-lg font-black">Task system best practices</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-300">
              <li>Use urgent only for blocked move-ins, safety, payments, and time-sensitive resident issues.</li>
              <li>Attach every task to a rental, application, document, lease, or repair when possible.</li>
              <li>Use blocked/waiting states instead of leaving stale tasks open.</li>
            </ul>
            <Link href={`/${basePath}`} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950">Back to dashboard</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
