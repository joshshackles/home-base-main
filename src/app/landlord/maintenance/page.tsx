export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, MessageSquare, UserPlus, Wrench } from "lucide-react";
import { MaintenancePriority, MaintenanceRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { sendWorkflowMessage, updateMaintenanceRequestStatus } from "@/app/workflow-actions";
import { getLandlordMaintenanceCommandCenter, getMaintenanceNextAction, isOpenMaintenanceStatus, platformContext, slaDueAt } from "@/lib/platform";
import { EmptyState, ProductPageHeader, WorkflowStatusBadge, statusLabel } from "@/components/ui/system";

type SearchParams = {
  status?: string;
  priority?: string;
  q?: string;
};

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function filterHref(params: SearchParams, next: Partial<SearchParams>) {
  const search = new URLSearchParams();
  const merged = { ...params, ...next };
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/landlord/maintenance?${query}` : "/landlord/maintenance";
}

export default async function LandlordMaintenancePage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const user = await requireRole(["LANDLORD"], "/landlord/maintenance");
  const commandCenter = await getLandlordMaintenanceCommandCenter(platformContext(user, { source: "web" }), searchParams);
  const { requests, allRequests, staff, metrics, statusCounts, urgentPriorityCount, needsAttention } = commandCenter;
  const { selectedStatus, selectedPriority, query } = commandCenter.filters;

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <ProductPageHeader
        eyebrow="Maintenance"
        title="Work Order Command Center"
        description="Triage repair requests, assign the right person, monitor vendor activity, and keep tenant communication tied to each work order."
        actionHref="/landlord/vendors"
        actionLabel="Vendor Operations"
      />

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Open work" value={metrics.openCount} detail="Active requests" tone={metrics.openCount ? "slate" : "green"} />
        <Metric label="Unassigned" value={metrics.unassignedCount} detail="Needs owner" tone={metrics.unassignedCount ? "red" : "green"} />
        <Metric label="Waiting vendor" value={metrics.waitingVendorCount} detail="Follow-up queue" tone={metrics.waitingVendorCount ? "amber" : "green"} />
        <Metric label="SLA risk" value={metrics.slaRiskCount} detail="Past target" tone={metrics.slaRiskCount ? "red" : "green"} />
        <Metric label="Estimates" value={metrics.submittedEstimateCount} detail="Awaiting review" tone={metrics.submittedEstimateCount ? "amber" : "green"} />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Operational queues</h2>
              <p className="mt-1 text-sm text-slate-600">Use these views to move work from intake to assignment, vendor follow-up, and closeout.</p>
            </div>
            <Link href="/landlord/maintenance" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              Clear filters
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <QueueLink label="New intake" count={statusCounts.NEW} href={filterHref(searchParams, { status: MaintenanceRequestStatus.NEW })} active={selectedStatus === MaintenanceRequestStatus.NEW} />
            <QueueLink label="In progress" count={statusCounts.IN_PROGRESS} href={filterHref(searchParams, { status: MaintenanceRequestStatus.IN_PROGRESS })} active={selectedStatus === MaintenanceRequestStatus.IN_PROGRESS} />
            <QueueLink label="Waiting tenant" count={statusCounts.WAITING_ON_TENANT} href={filterHref(searchParams, { status: MaintenanceRequestStatus.WAITING_ON_TENANT })} active={selectedStatus === MaintenanceRequestStatus.WAITING_ON_TENANT} />
            <QueueLink label="Waiting vendor" count={statusCounts.WAITING_ON_VENDOR} href={filterHref(searchParams, { status: MaintenanceRequestStatus.WAITING_ON_VENDOR })} active={selectedStatus === MaintenanceRequestStatus.WAITING_ON_VENDOR} />
            <QueueLink label="Completed" count={statusCounts.COMPLETED} href={filterHref(searchParams, { status: MaintenanceRequestStatus.COMPLETED })} active={selectedStatus === MaintenanceRequestStatus.COMPLETED} />
            <QueueLink label="Urgent priority" count={urgentPriorityCount} href={filterHref(searchParams, { priority: MaintenancePriority.URGENT })} active={selectedPriority === MaintenancePriority.URGENT} />
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search issue, resident, property, or unit"
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
            {selectedStatus ? <input type="hidden" name="status" value={selectedStatus} /> : null}
            {selectedPriority ? <input type="hidden" name="priority" value={selectedPriority} /> : null}
            <button className="min-h-12 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800" type="submit">
              Search work orders
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-700" aria-hidden="true" />
            <div>
              <h2 className="font-black text-amber-950">Needs attention</h2>
              <p className="mt-1 text-sm text-amber-900">Work that needs assignment, vendor follow-up, estimate review, or SLA recovery.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {needsAttention.length ? needsAttention.map((request) => (
              <div key={request.id} className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-sm font-black text-slate-950">{request.subject}</p>
                <p className="mt-1 text-xs font-bold text-slate-600">{getMaintenanceNextAction(request)}</p>
              </div>
            )) : (
              <div className="rounded-2xl bg-white p-4 text-sm font-bold text-emerald-800">
                No urgent maintenance exceptions right now.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {requests.length === 0 ? (
          <EmptyState
            title={allRequests.length ? "No work orders match these filters" : "No maintenance requests yet"}
            detail={allRequests.length ? "Adjust the filters or search terms to see more work orders." : "Tenant repair requests and landlord-created work orders will appear here with assignment, status, vendor, and message context."}
            action={<Link href="/landlord/inventory" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Open inventory</Link>}
          />
        ) : requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <WorkflowStatusBadge status={request.status} />
                  <PriorityBadge priority={request.priority} />
                  {slaDueAt(request.createdAt, request.priority).getTime() < Date.now() && isOpenMaintenanceStatus(request.status) ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase text-rose-700">SLA risk</span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950">{request.subject}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {request.unit?.property.name ?? "Unassigned property"} {request.unit ? `#${request.unit.unitNumber}` : ""} - Requested by {request.requester.name || request.requester.email}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3 text-sm font-black text-brand-800">
                {getMaintenanceNextAction(request)}
              </div>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-slate-700">{request.description}</p>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} label="Target response" value={slaDueAt(request.createdAt, request.priority).toLocaleDateString()} />
              <InfoTile icon={<Wrench className="h-4 w-4" aria-hidden="true" />} label="Field updates" value={`${request.vendorWorkLogs.length}`} />
              <InfoTile icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} label="Estimates/invoices" value={`${request.vendorInvoices.length}`} />
              <InfoTile icon={<UserPlus className="h-4 w-4" aria-hidden="true" />} label="Owner" value={request.assignedTo?.name || request.assignedTo?.email || "Unassigned"} />
            </div>

            {request.unit ? (
              <Link href={`/landlord/units/${request.unit.id}/workspace`} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-brand-700 hover:text-brand-900">
                Open unit workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}

            {request.accessNotes ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Access notes:</strong> {request.accessNotes}</p> : null}

            <form action={updateMaintenanceRequestStatus} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="id" value={request.id} />
              <label className="text-sm font-black text-slate-700">
                Status
                <select name="status" defaultValue={request.status} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  {Object.values(MaintenanceRequestStatus).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </label>
              <label className="text-sm font-black text-slate-700">
                Assigned owner
                <select name="assignedToId" defaultValue={request.assignedTo?.id ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="">Unassigned</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name || member.email} ({label(member.role)})</option>)}
                </select>
              </label>
              <button className="min-h-12 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:self-end" type="submit">Update Work Order</button>
            </form>

            {request.vendorInvoices.length ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <h3 className="font-black text-emerald-950">Estimates and invoices</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {request.vendorInvoices.map((invoice) => <Link key={invoice.id} href="/landlord/vendors" className="rounded-xl bg-white p-3 text-sm hover:bg-emerald-100"><strong>{invoice.title}</strong><br />{statusLabel(invoice.status)} - ${(invoice.amount / 100).toFixed(2)}</Link>)}
                </div>
              </div>
            ) : null}

            {request.messageThreads[0] ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <h3 className="font-black text-slate-950">Recent messages</h3>
                </div>
                <div className="mt-3 space-y-3">
                  {request.messageThreads[0].messages.map((message) => <div key={message.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700"><p className="font-bold text-slate-950">{message.sender.name || message.sender.email}</p><p className="mt-1 whitespace-pre-wrap">{message.body}</p></div>)}
                </div>
                <form action={sendWorkflowMessage} className="mt-4">
                  <input type="hidden" name="threadId" value={request.messageThreads[0].id} />
                  <label className="sr-only" htmlFor={`reply-${request.id}`}>Reply to the requester</label>
                  <textarea id={`reply-${request.id}`} name="body" required rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3" placeholder="Reply to the requester..." />
                  <button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send Maintenance Reply</button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "red" | "amber" | "green" | "slate" }) {
  const toneClass = tone === "red" ? "bg-rose-50 text-rose-900" : tone === "amber" ? "bg-amber-50 text-amber-900" : tone === "green" ? "bg-emerald-50 text-emerald-900" : "bg-white text-slate-900";
  return (
    <div className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{detail}</p>
    </div>
  );
}

function QueueLink({ label, count, href, active }: { label: string; count: number; href: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black transition ${active ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}>
      <span>{label}</span>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs shadow-sm">{count}</span>
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const classes =
    priority === MaintenancePriority.URGENT
      ? "bg-rose-100 text-rose-700"
      : priority === MaintenancePriority.HIGH
        ? "bg-amber-100 text-amber-700"
        : priority === MaintenancePriority.LOW
          ? "bg-slate-100 text-slate-600"
          : "bg-brand-50 text-brand-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${classes}`}>{label(priority)}</span>;
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 truncate font-black text-slate-950">{value}</p>
    </div>
  );
}
