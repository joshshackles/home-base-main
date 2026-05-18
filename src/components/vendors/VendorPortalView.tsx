import { MaintenanceRequestStatus, VendorInvoiceStatus, VendorWorkLogStatus } from "@prisma/client";
import { addVendorWorkLog, createVendorInvoice } from "@/app/vendor-actions";
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

export function VendorPortalView({ data, active = "overview" }: { data: VendorPortalData; active?: "overview" | "jobs" | "invoices" }) {
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
        <MetricTile label="Invoices" value={data.metrics.invoiceCount} detail="Submitted + drafts" />
        <MetricTile label="Approved earnings" value={formatCurrency(data.metrics.approvedInvoiceAmount / 100)} detail="Approved or paid" tone="green" />
        <MetricTile label="Pending invoices" value={formatCurrency(data.metrics.pendingInvoiceAmount / 100)} detail="Draft/submitted" tone="amber" />
      </DataGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <SectionHeader title="Assigned jobs" detail="Update arrival, blocked, on-site, and completion states from the field." count={data.jobs.length} />
          <div className="mt-3 space-y-2">
            {data.jobs.length === 0 ? <EmptyState title="No assigned jobs" detail="When a landlord or admin assigns you to maintenance work, it will appear here." /> : data.jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{job.subject}</p>
                    <p className="text-xs text-slate-600">{rentalLabel(job.unit)} · requested by {job.requester.name || job.requester.email}</p>
                  </div>
                  <StatusBadge tone={job.status === MaintenanceRequestStatus.COMPLETED ? "green" : job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR ? "amber" : "blue"}>{formatVendorStatus(job.status)}</StatusBadge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-700">{job.description}</p>
                {job.accessNotes ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-900">Access: {job.accessNotes}</p> : null}
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
                    <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit">Add update</button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard>
          <SectionHeader title="Submit invoice" detail="Create a draft or send directly to the landlord for review." />
          <form action={createVendorInvoice} className="mt-3 grid gap-2">
            <select name="maintenanceRequestId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">General invoice</option>
              {data.jobs.map((job) => <option key={job.id} value={job.id}>{job.subject} · {rentalLabel(job.unit)}</option>)}
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
              {invoice.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-600">{invoice.description}</p> : null}
            </div>
          ))}
        </div>
      </AppCard>
    </main>
  );
}
