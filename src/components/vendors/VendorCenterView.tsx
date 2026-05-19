import Link from "next/link";
import { MaintenanceRequestStatus, VendorInvoiceStatus, VendorWorkLogStatus } from "@prisma/client";
import { assignVendorToMaintenance, approveVendorInvoiceForPayout, createVendorProfile, inviteExternalVendor, updateVendorInvoiceStatus } from "@/app/vendor-actions";
import { AppCard, CompactTable, DataGrid, EmptyState, MetricTile, SectionHeader, StatusBadge } from "@/components/ui/system";
import { formatCurrency } from "@/lib/format";
import { formatVendorStatus } from "@/lib/vendors";
import type { getOwnerVendorCenter } from "@/lib/vendors";

type VendorCenterData = Awaited<ReturnType<typeof getOwnerVendorCenter>>;

function rentalLabel(unit?: { unitNumber: string; property: { name: string } } | null) {
  return unit ? `${unit.property.name} #${unit.unitNumber}` : "Portfolio-wide";
}

function toneForInvoice(status: VendorInvoiceStatus) {
  if (status === VendorInvoiceStatus.PAID || status === VendorInvoiceStatus.APPROVED) return "green" as const;
  if (status === VendorInvoiceStatus.SUBMITTED) return "amber" as const;
  if (status === VendorInvoiceStatus.REJECTED || status === VendorInvoiceStatus.CANCELLED) return "red" as const;
  return "slate" as const;
}

export function VendorCenterView({ data, scope }: { data: VendorCenterData; scope: "admin" | "landlord" }) {
  const baseHref = scope === "admin" ? "/admin" : "/landlord";
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Vendor Portal</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Vendor operations</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Invite preferred vendors, assign repair work, review invoices, and prepare payouts without leaving the maintenance workflow.</p>
        </div>
        <Link href={`${baseHref}/maintenance`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">Maintenance queue</Link>
      </div>

      <DataGrid>
        <MetricTile label="Active vendors" value={data.metrics.vendorCount} detail="Preferred + connected" />
        <MetricTile label="Open vendor jobs" value={data.metrics.openJobs} detail="Maintenance assignments" tone={data.metrics.openJobs ? "amber" : "green"} />
        <MetricTile label="Submitted invoices" value={data.metrics.submittedInvoices} detail="Awaiting review" tone={data.metrics.submittedInvoices ? "amber" : "green"} />
        <MetricTile label="Pending payout exposure" value={formatCurrency(data.metrics.pendingPayoutAmount / 100)} detail={`${formatCurrency(data.metrics.unpaidInvoiceAmount / 100)} unpaid invoices`} tone="green" />
      </DataGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <AppCard>
          <SectionHeader title="Enable vendor access" detail="Connect an existing user as a vendor and optionally scope them to one rental." />
          <form action={createVendorProfile} className="mt-3 grid gap-2">
            <select name="vendorUserId" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select user account</option>
              {data.vendorUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} · {user.vendorProfile?.companyName ?? formatVendorStatus(user.role)}</option>)}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="companyName" required placeholder="Company name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="trade" required placeholder="Trade, e.g. Plumbing" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="phone" placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="Dispatch email" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="unitId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All rentals</option>
                {data.units.map((unit) => <option key={unit.id} value={unit.id}>{rentalLabel(unit)}</option>)}
              </select>
              <input name="hourlyRate" inputMode="decimal" placeholder="Hourly rate" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="licenseNumber" placeholder="License #" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="insuranceExpiresAt" type="date" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <textarea name="notes" rows={3} placeholder="Insurance, dispatch instructions, coverage notes..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isPreferred" value="yes" /> Preferred vendor</label>
            <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700" type="submit">Save vendor</button>
          </form>
        </AppCard>

        <AppCard>
          <SectionHeader title="Invite a new vendor" detail="Add a vendor even if they do not have an account yet. They receive a secure email invite and become a vendor automatically after signup." />
          <form action={inviteExternalVendor} className="mt-3 grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="companyName" required placeholder="Company name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="contactName" placeholder="Contact name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="email" type="email" required placeholder="Invite email" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="trade" required placeholder="Trade, e.g. HVAC" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="phone" placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <select name="unitId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All rentals</option>
                {data.units.map((unit) => <option key={unit.id} value={unit.id}>{rentalLabel(unit)}</option>)}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="licenseNumber" placeholder="License #" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="insuranceExpiresAt" type="date" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <input name="hourlyRate" inputMode="decimal" placeholder="Hourly rate" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <textarea name="notes" rows={3} placeholder="Invite note, service area, insurance requirements, dispatch instructions..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isPreferred" value="yes" /> Preferred vendor</label>
            <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700" type="submit">Send vendor invite</button>
          </form>
        </AppCard>

        <AppCard>
          <SectionHeader title="Vendor directory" detail="Active and pending vendors, trades, insurance, invite status, and work history." count={data.profiles.length + data.invitations.length} />
          {data.invitations.length ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Pending invitations</p>
              {data.invitations.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-950">{invite.companyName}</p>
                      <p className="text-xs font-semibold text-slate-600">{invite.trade} · {invite.contactName || invite.email}</p>
                    </div>
                    <StatusBadge tone={invite.status === "PENDING" ? "amber" : invite.status === "ACCEPTED" ? "green" : "slate"}>{formatVendorStatus(invite.status)}</StatusBadge>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
                    <span>{invite.email}</span>
                    <span>{rentalLabel(invite.unit)}</span>
                    <span>Expires {invite.expiresAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {data.profiles.length === 0 ? <EmptyState title="No vendors connected" detail="Enable a user as a vendor to start routing repair work and invoices through the portal." /> : data.profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{profile.companyName}</p>
                    <p className="text-xs font-semibold text-slate-600">{profile.trade} · {profile.user.name || profile.user.email}</p>
                  </div>
                  <div className="flex gap-1">{profile.isPreferred ? <StatusBadge tone="green">Preferred</StatusBadge> : null}<StatusBadge>{profile.isActive ? "Active" : "Inactive"}</StatusBadge></div>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
                  <span>{rentalLabel(profile.unit)}</span>
                  <span>{profile._count.workLogs} updates</span>
                  <span>{profile._count.invoices} invoices</span>
                </div>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AppCard>
          <SectionHeader title="Assignable maintenance jobs" detail="Route work to connected vendors and monitor active repairs." />
          <div className="mt-3 space-y-2">
            {data.jobs.length === 0 ? <EmptyState title="No maintenance jobs" detail="Vendor-ready work orders appear here when maintenance requests are created." /> : data.jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{job.subject}</p>
                    <p className="text-xs text-slate-600">{rentalLabel(job.unit)} · {formatVendorStatus(job.priority)} priority</p>
                  </div>
                  <StatusBadge tone={job.status === MaintenanceRequestStatus.COMPLETED ? "green" : job.status === MaintenanceRequestStatus.WAITING_ON_VENDOR ? "amber" : "blue"}>{formatVendorStatus(job.status)}</StatusBadge>
                </div>
                <form action={assignVendorToMaintenance} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="maintenanceRequestId" value={job.id} />
                  <select name="vendorUserId" defaultValue={job.assignedTo?.id ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {data.vendorUsers.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.vendorProfile?.companyName ?? vendor.name ?? vendor.email} · {vendor.email}</option>)}
                  </select>
                  <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800" type="submit">Assign</button>
                </form>
                {job.vendorWorkLogs.length ? <p className="mt-2 text-xs text-slate-500">Latest: {job.vendorWorkLogs[0].title}</p> : null}
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard>
          <SectionHeader title="Invoice review" detail="Approve, reject, or convert vendor invoices into payout records." count={data.invoices.length} />
          <div className="mt-3 space-y-2">
            {data.invoices.length === 0 ? <EmptyState title="No vendor invoices" detail="Submitted vendor invoices will appear here for review and payout preparation." /> : data.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{invoice.title}</p>
                    <p className="text-xs text-slate-600">{invoice.vendor.name || invoice.vendor.email} · {rentalLabel(invoice.unit)}</p>
                  </div>
                  <p className="font-black text-slate-950">{formatCurrency(invoice.amount / 100)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge tone={toneForInvoice(invoice.status)}>{formatVendorStatus(invoice.status)}</StatusBadge>{invoice.maintenanceRequest ? <span className="text-xs text-slate-500">{invoice.maintenanceRequest.subject}</span> : null}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <form action={updateVendorInvoiceStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={invoice.id} />
                    <select name="status" defaultValue={invoice.status} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-2 py-2 text-xs">
                      {Object.values(VendorInvoiceStatus).map((status) => <option key={status} value={status}>{formatVendorStatus(status)}</option>)}
                    </select>
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black" type="submit">Update</button>
                  </form>
                  <form action={approveVendorInvoiceForPayout}>
                    <input type="hidden" name="id" value={invoice.id} />
                    <button className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700" type="submit">Prepare payout</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      <AppCard className="mt-4">
        <SectionHeader title="Recent payouts" detail="Vendor payouts prepared from approved work and invoices." />
        <div className="mt-3">
          <CompactTable>
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">Rental</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.payouts.map((payout) => <tr key={payout.id}><td className="px-3 py-2 font-bold text-slate-900">{payout.vendor?.name || payout.vendor?.email || "Vendor"}</td><td className="px-3 py-2 text-slate-600">{rentalLabel(payout.unit)}</td><td className="px-3 py-2 text-slate-600">{payout.description}</td><td className="px-3 py-2"><StatusBadge>{formatVendorStatus(payout.status)}</StatusBadge></td><td className="px-3 py-2 text-right font-black">{formatCurrency(payout.amount / 100)}</td></tr>)}
              {data.payouts.length === 0 ? <tr><td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>No vendor payouts yet.</td></tr> : null}
            </tbody>
          </CompactTable>
        </div>
      </AppCard>
    </main>
  );
}

export { VendorWorkLogStatus };
