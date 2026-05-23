import { MaintenanceRequestStatus, VendorInvoiceStatus, VendorWorkLogStatus } from "@prisma/client";
import { acceptVendorMaintenanceJob, addVendorWorkLog, createVendorEstimate, createVendorInvoice, uploadVendorMaintenancePhoto } from "@/app/vendor-actions";
import { AppCard, DataGrid, EmptyState, MetricTile, SectionHeader, StatusBadge, SystemTabs } from "@/components/ui/system";
import { formatCurrency } from "@/lib/format";
import { formatVendorStatus } from "@/lib/vendors";
import type { getVendorPortal } from "@/lib/vendors";

type VendorPortalData = Awaited<ReturnType<typeof getVendorPortal>>;

function rentalLabel(unit?: { unitNumber: string; property: { name: string } } | null) {
  return unit ? `${unit.property.name} #${unit.unitNumber}` : "Portfolio-wide";
}

function invoiceTone(status: VendorInvoiceStatus) {
  if (status === VendorInvoiceStatus.PAID || status === VendorInvoiceStatus.APPROVED) return "green" as const;
  if (status === VendorInvoiceStatus.REJECTED || status === VendorInvoiceStatus.CANCELLED) return "red" as const;
  if (status === VendorInvoiceStatus.SUBMITTED) return "amber" as const;
  return "slate" as const;
}

function slaDueAt(createdAt: Date, priority: string) {
  const hours = priority === "URGENT" ? 24 : priority === "HIGH" ? 48 : priority === "LOW" ? 168 : 96;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

function isOpenStatus(status: MaintenanceRequestStatus) {
  return status !== MaintenanceRequestStatus.COMPLETED && status !== MaintenanceRequestStatus.CANCELLED;
}

export function VendorPortalView({ data, active = "overview" }: { data: VendorPortalData; active?: "overview" | "jobs" | "invoices" }) {
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Vendor workspace</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Jobs, invoices, and payouts</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">See assigned repair work, add field updates, submit invoices, and track payout status.</p>
        </div>
        <SystemTabs tabs={[{ href: "/vendor", label: "Overview", active: active === "overview" }, { href: "/vendor/jobs", label: "Jobs", active: active === "jobs" }, { href: "/vendor/invoices", label: "Invoices", active: active === "invoices" }]} />
      </div>

      <DataGrid>
        <MetricTile label="Open jobs" value={data.metrics.openJobs} detail="Assigned maintenance" tone={data.metrics.openJobs ? "amber" : "green"} />
        <MetricTile label="Awaiting acceptance" value={data.metrics.waitingAcceptance} detail="Assigned vendor jobs" tone={data.metrics.waitingAcceptance ? "amber" : "green"} />
        <MetricTile label="SLA risk" value={data.metrics.slaBreaches} detail="Past target response" tone={data.metrics.slaBreaches ? "red" : "green"} />
        <MetricTile label="Invoices" value={data.metrics.invoiceCount} detail="Submitted + drafts" />
        <MetricTile label="Approved earnings" value={formatCurrency(data.metrics.approvedInvoiceAmount / 100)} detail="Approved or paid" tone="green" />
        <MetricTile label="Payout eligible" value={data.metrics.payoutEligibleInvoices} detail="Approved invoices" tone="green" />
      </DataGrid>

      <AppCard className="mt-4">
        <SectionHeader title="Mobile field mode" detail="Fast actions for phones: accept, photo proof, estimate, status update, invoice, and payout visibility." count={data.jobs.filter((job) => isOpenStatus(job.status)).length} />
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">Accept assigned job</div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-800">Upload field photos</div>
          <div className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Submit estimate</div>
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Complete and invoice</div>
        </div>
      </AppCard>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <SectionHeader title="Assigned jobs" detail="Update arrival, blocked, on-site, and completion states from the field." count={data.jobs.length} />
          <div className="mt-3 space-y-2">
            {data.jobs.length === 0 ? <EmptyState title="No assigned jobs" detail="You are clear for now. Assigned repair jobs are listed here with access notes, status updates, photos, estimates, and invoices." /> : data.jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{job.subject}</p>
                    <p className="text-xs text-slate-600">{rentalLabel(job.unit)} / requested by {job.requester.name || job.requester.email}</p>
                  </div>
                  <StatusBadge tone={job.status === MaintenanceRequestStatus.COMPLETED ? "green" : job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR ? "amber" : "blue"}>{formatVendorStatus(job.status)}</StatusBadge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-700">{job.description}</p>
                <div className="mt-2 grid gap-2 text-xs font-bold sm:grid-cols-3">
                  <span className="rounded-xl bg-slate-50 p-2 text-slate-700">SLA due {slaDueAt(job.createdAt, job.priority).toLocaleDateString()}</span>
                  <span className="rounded-xl bg-slate-50 p-2 text-slate-700">{job.vendorWorkLogs.length} field updates</span>
                  <span className="rounded-xl bg-slate-50 p-2 text-slate-700">{job.vendorInvoices.length} estimates/invoices</span>
                </div>
                {job.accessNotes ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-900">Access: {job.accessNotes}</p> : null}
                {job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR ? (
                  <form action={acceptVendorMaintenanceJob} className="mt-3 grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-2 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="maintenanceRequestId" value={job.id} />
                    <input name="notes" placeholder="Acceptance note, ETA, or first availability" className="rounded-xl border border-blue-200 px-3 py-2 text-sm" />
                    <button className="min-h-11 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit">Accept job</button>
                  </form>
                ) : null}
                <form action={addVendorWorkLog} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-2">
                  <input type="hidden" name="maintenanceRequestId" value={job.id} />
                  <div className="grid gap-2 sm:grid-cols-[0.7fr_1fr]">
                    <select name="status" defaultValue={VendorWorkLogStatus.NOTE} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      {Object.values(VendorWorkLogStatus).map((status) => <option key={status} value={status}>{formatVendorStatus(status)}</option>)}
                    </select>
                    <input name="title" placeholder="Update title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <textarea name="notes" rows={2} placeholder="Work performed, blockers, parts needed..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input name="laborMinutes" inputMode="numeric" placeholder="Labor minutes" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input name="materialsCost" inputMode="decimal" placeholder="Materials $" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <button className="min-h-11 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit">Add update</button>
                  </div>
                </form>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  <form action={uploadVendorMaintenancePhoto} encType="multipart/form-data" className="grid gap-2 rounded-xl bg-slate-50 p-2">
                    <input type="hidden" name="maintenanceRequestId" value={job.id} />
                    <input name="title" placeholder="Photo title, e.g. Before repair" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input name="photo" type="file" accept="image/*" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    <textarea name="notes" rows={2} placeholder="Photo notes, room, condition, before/after" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800" type="submit">Upload photo</button>
                  </form>
                  <form action={createVendorEstimate} className="grid gap-2 rounded-xl bg-amber-50 p-2">
                    <input type="hidden" name="maintenanceRequestId" value={job.id} />
                    <input name="title" placeholder="Estimate title" className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
                    <input name="amount" required inputMode="decimal" placeholder="Estimate amount" className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
                    <textarea name="description" rows={2} placeholder="Scope, parts, labor assumptions" className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
                    <button className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-black text-white hover:bg-amber-700" type="submit">Submit estimate</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard>
          <SectionHeader title="Submit invoice" detail="Create a draft or send directly to the landlord for review." />
          <form action={createVendorInvoice} className="mt-3 grid gap-2">
            <select name="maintenanceRequestId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">General invoice</option>
              {data.jobs.map((job) => <option key={job.id} value={job.id}>{job.subject} / {rentalLabel(job.unit)}</option>)}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="invoiceNumber" placeholder="Invoice #" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="amount" required inputMode="decimal" placeholder="Amount" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <input name="title" required placeholder="Invoice title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <textarea name="description" rows={4} placeholder="Labor, materials, service notes..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            {data.profiles[0]?.owner.id ? <input type="hidden" name="ownerUserId" value={data.profiles[0].owner.id} /> : null}
            {data.profiles[0]?.id ? <input type="hidden" name="vendorProfileId" value={data.profiles[0].id} /> : null}
            <button name="submitNow" value="yes" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700" type="submit">Submit invoice</button>
          </form>
        </AppCard>
      </div>

      <AppCard className="mt-4">
        <SectionHeader title="Invoice history" detail="Track review, approval, payment, and payout status." count={data.invoices.length} />
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.invoices.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No invoices yet" detail="Submit your first invoice from the form above." /></div> : data.invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-950">{invoice.title}</p>
                  <p className="text-xs text-slate-600">{invoice.owner.name || invoice.owner.email}</p>
                </div>
                <p className="font-black text-slate-950">{formatCurrency(invoice.amount / 100)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2"><StatusBadge tone={invoiceTone(invoice.status)}>{formatVendorStatus(invoice.status)}</StatusBadge>{invoice.maintenanceRequest ? <span className="text-xs text-slate-500">{invoice.maintenanceRequest.subject}</span> : null}</div>
              {invoice.status === VendorInvoiceStatus.APPROVED && !invoice.vendorPayoutId ? <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-black text-emerald-800">Payout eligible after landlord payout preparation.</p> : null}
              {invoice.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-600">{invoice.description}</p> : null}
            </div>
          ))}
        </div>
      </AppCard>

      <AppCard className="mt-4">
        <SectionHeader title="Photo updates" detail="Recent uploaded field proof and before/after documentation." count={data.photos.length} />
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {data.photos.length === 0 ? <div className="md:col-span-2 xl:col-span-4"><EmptyState title="No field photos yet" detail="Upload photos from an assigned job to document before, during, or after repair work." /></div> : data.photos.map((photo) => (
            <a key={photo.id} href={`/api/documents/${photo.id}`} className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
              <p className="font-black text-slate-950">{photo.title}</p>
              <p className="mt-1 text-xs text-slate-600">{rentalLabel(photo.unit)} - {photo.createdAt.toLocaleDateString()}</p>
              {photo.notes ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{photo.notes}</p> : null}
            </a>
          ))}
        </div>
      </AppCard>
    </main>
  );
}
