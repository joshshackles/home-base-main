import Link from "next/link";
import type { ReactNode } from "react";
import { MaintenancePriority, MessageThreadType } from "@prisma/client";
import { addLandlordUnitContact, assignLandlordUnitStaff, assignLandlordUnitTenant, createLandlordMaintenanceRequest } from "@/app/landlord/actions";
import { sendWorkflowMessage } from "@/app/workflow-actions";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import type { LandlordUnitWorkspaceModel } from "@/lib/platform";
import type { UnitWorkspaceTabKey } from "@/components/landlord/unit-workspace/UnitWorkspaceTabs";

type Workspace = NonNullable<LandlordUnitWorkspaceModel>;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not set";
}

function shortDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not scheduled";
}

function userOptionLabel(user: { name: string | null; email: string }) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("active") || normalized.includes("paid") || normalized.includes("completed") || normalized.includes("passed")) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (normalized.includes("denied") || normalized.includes("failed") || normalized.includes("cancelled") || normalized.includes("overdue")) return "bg-rose-50 text-rose-800 ring-rose-200";
  if (normalized.includes("pending") || normalized.includes("draft") || normalized.includes("review") || normalized.includes("new")) return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${tone ?? statusTone(String(children))}`}>{children}</span>;
}

function ActionLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const styles = variant === "primary"
    ? "bg-brand-600 text-white hover:bg-brand-700"
    : variant === "danger"
      ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  return <Link href={href} className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black ${styles}`}>{children}</Link>;
}

function WorkspacePanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ title, detail, actionHref, actionLabel }: { title: string; detail: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{detail}</p>
      <ActionLink href={actionHref} variant="primary">{actionLabel}</ActionLink>
    </div>
  );
}

function Metric({ label: metricLabel, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{metricLabel}</p>
      <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function Info({ label: infoLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{infoLabel}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TimelineRow({ title, detail, href, tone = "default" }: { title: string; detail: string; href?: string; tone?: "default" | "urgent" | "success" }) {
  const dotTone = tone === "urgent" ? "bg-rose-500" : tone === "success" ? "bg-emerald-500" : "bg-brand-600";
  const content = (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotTone}`} />
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">{detail}</span>
      </span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function WorkspaceTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4 align-top">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 bg-white p-3 lg:hidden">
        {rows.map((row, index) => (
          <div key={index} className="rounded-2xl bg-slate-50 p-4">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="py-1">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{headers[cellIndex]}</p>
                <div className="mt-1 text-sm text-slate-900">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UnitWorkspaceTabContent({ workspace, activeTab }: { workspace: Workspace; activeTab: UnitWorkspaceTabKey }) {
  if (activeTab === "leads-applications") return <LeadsApplicationsWorkspaceTab workspace={workspace} />;
  if (activeTab === "tenant") return <TenantWorkspaceTab workspace={workspace} />;
  if (activeTab === "lease") return <LeaseWorkspaceTab workspace={workspace} />;
  if (activeTab === "ledger") return <LedgerWorkspaceTab workspace={workspace} />;
  if (activeTab === "maintenance") return <MaintenanceWorkspaceTab workspace={workspace} />;
  if (activeTab === "inspections") return <InspectionsWorkspaceTab workspace={workspace} />;
  if (activeTab === "documents") return <DocumentsWorkspaceTab workspace={workspace} />;
  if (activeTab === "timeline") return <TimelineWorkspaceTab workspace={workspace} />;
  if (activeTab === "staff-contacts") return <StaffContactsWorkspaceTab workspace={workspace} />;
  return <ListingWorkspaceTab workspace={workspace} />;
}

function ListingWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { unit, listingHealthItems, listingHealthScore } = workspace;
  return (
    <div className="space-y-6">
      <WorkspacePanel
        title="Listing workspace"
        description="Manage the public rental story for this unit: visibility, pricing, readiness, photos, policies, and marketplace preview."
        action={<div className="flex flex-wrap gap-2"><ActionLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Edit listing</ActionLink><ActionLink href={`/marketplace/${unit.id}`}>View public listing</ActionLink></div>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Listing status" value={label(unit.marketingStatus)} detail={unit.marketingStatus === "ACTIVE" ? "Visible in public marketplace when public rules allow it." : "Not actively marketed."} />
          <Metric label="Readiness" value={`${listingHealthScore}%`} detail="Photos, terms, pricing, location, contacts, and public readiness." />
          <Metric label="Rent / deposit" value={`${formatCurrency(unit.rentAmount)} / ${unit.deposit ? formatCurrency(unit.deposit) : "Not set"}`} detail="Public rent and move-in deposit context." />
          <Metric label="Available" value={dateLabel(unit.availableOn)} detail={`${unit.bedrooms} bd / ${unit.bathrooms} ba${unit.squareFeet ? ` / ${unit.squareFeet} sqft` : ""}`} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listingHealthItems.map((item) => (
            <div key={item.label} className={`rounded-2xl p-4 ${item.complete ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
              <p className="text-xs font-black uppercase tracking-wide">{item.complete ? "Ready" : "Needs work"}</p>
              <h3 className="mt-1 text-lg font-black">{item.label}</h3>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6">{item.detail}</p>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <WorkspacePanel title="Public listing preview" description="These are the renter-facing details most likely to appear on marketplace, syndication, or mobile listing views.">
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Headline" value={unit.marketingHeadline ?? unit.property.name} />
            <Info label="Description" value={unit.description ?? "No public description has been written yet."} />
            <Info label="Amenities and highlights" value={unit.marketingHighlights ?? "No highlights set."} />
            <Info label="Utilities" value={unit.utilitiesNote ?? "Utilities have not been summarized."} />
            <Info label="Pet policy" value={unit.petPolicy ?? "Pet policy not set."} />
            <Info label="Parking" value={unit.parkingInfo ?? "Parking details not set."} />
            <Info label="Laundry" value={unit.laundryInfo ?? "Laundry details not set."} />
            <Info label="Appliances" value={unit.appliancesIncluded ?? "Appliances not listed."} />
            <Info label="Voucher friendly" value={unit.voucherFriendly ? "Yes" : "Not marked"} />
            <Info label="Accessibility" value={unit.accessibility ?? "Accessibility features not listed."} />
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Photos and media" description="Keep enough photos to support marketplace confidence and future syndication.">
          <div className="grid gap-3 sm:grid-cols-2">
            {unit.photos.slice(0, 6).map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/unit-photos/${photo.id}`} alt={photo.title ?? `${unit.property.name} ${unit.unitNumber}`} className="aspect-[4/3] w-full object-cover" />
                <p className="p-3 text-xs font-black uppercase text-slate-600">{photo.isFeatured ? "Featured" : photo.title ?? photo.originalName}</p>
              </div>
            ))}
          </div>
          {unit.photos.length === 0 ? <EmptyState title="Add listing photos" detail="Photos make the listing feel real and support future marketplace and syndication quality scoring." actionHref={`/landlord/rentals/${unit.id}/edit`} actionLabel="Add photos" /> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Manage photos</ActionLink>
            <ActionLink href={`/landlord/rentals/${unit.id}/edit`}>Duplicate listing</ActionLink>
            <ActionLink href={`/landlord/rentals/${unit.id}/edit`}>{unit.marketingStatus === "ACTIVE" ? "Pause listing" : "Publish listing"}</ActionLink>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}

function LeadsApplicationsWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { unit } = workspace;
  const pending = unit.applications.filter((application) => ["STARTED", "SUBMITTED", "UNDER_REVIEW"].includes(application.status));
  const approved = unit.applications.filter((application) => application.status === "APPROVED");
  const denied = unit.applications.filter((application) => application.status === "DENIED");
  const rows = unit.applications.map((application) => [
    <div key="applicant"><p className="font-black text-slate-950">{application.applicantName}</p><p className="text-sm text-slate-600">{application.applicantEmail}</p></div>,
    <Badge key="status">{label(application.status)}</Badge>,
    dateLabel(application.createdAt),
    application.notes[0]?.note ?? application.summary ?? "No recent note",
    <div key="actions" className="flex flex-wrap gap-2"><ActionLink href={`/landlord/applications/${application.id}`} variant="primary">Review</ActionLink><ActionLink href="/landlord/inbox">Message</ActionLink></div>
  ]);
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Leads & applications" description="Track every prospect and application decision for this specific unit.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Leads" value={unit.leads.length} detail="Prospects tied to this unit" />
          <Metric label="Active applications" value={pending.length} detail="Started, submitted, or under review" />
          <Metric label="Approved" value={approved.length} detail="Ready for lease or tenant handoff" />
          <Metric label="Denied" value={denied.length} detail="Closed decision records" />
          <Metric label="Document gaps" value={workspace.missingDocumentRequests} detail="Requested or rejected documents" />
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Applicant activity" action={<ActionLink href="/landlord/applications" variant="primary">Open pipeline</ActionLink>}>
        {rows.length > 0 ? <WorkspaceTable headers={["Applicant", "Status", "Submitted", "Last activity", "Actions"]} rows={rows} /> : <EmptyState title="No applications yet" detail="Applications for this unit will appear here with decision status, document gaps, and message actions." actionHref="/landlord/leads" actionLabel="Review leads" />}
      </WorkspacePanel>

      <WorkspacePanel title="Recent leads">
        <div className="grid gap-3 md:grid-cols-2">
          {unit.leads.map((lead) => (
            <Link key={lead.id} href={`/landlord/leads/${lead.id}`} className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-black text-slate-950">{lead.name}</p><p className="text-sm text-slate-600">{lead.email}{lead.phone ? ` - ${lead.phone}` : ""}</p></div>
                <Badge>{label(lead.status)}</Badge>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{lead.message ?? "No inquiry message was included."}</p>
            </Link>
          ))}
        </div>
        {unit.leads.length === 0 ? <EmptyState title="No leads are attached yet" detail="Public inquiries, tour requests, and saved lead records for this unit will appear here." actionHref={`/marketplace/${unit.id}`} actionLabel="View public listing" /> : null}
      </WorkspacePanel>
    </div>
  );
}

function TenantWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { unit, primaryApplication, tenantName } = workspace;
  if (!unit.tenantUserId && !primaryApplication) {
    return <EmptyState title="This unit is vacant" detail="Assign a tenant after approval, or approve an applicant from the applications pipeline when the rental is ready." actionHref="/landlord/applications" actionLabel="Review applicants" />;
  }
  return (
    <WorkspacePanel title="Tenant workspace" description="Current resident, household context, balance, lease status, and tenant actions for this unit.">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-brand-200">Current resident</p>
          <h3 className="mt-2 text-3xl font-black">{tenantName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{unit.tenantUser?.email ?? primaryApplication?.applicantEmail ?? "No email on file"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href="/landlord/inbox">Message tenant</ActionLink>
            {primaryApplication ? <ActionLink href={`/landlord/applications/${primaryApplication.id}`}>View profile</ActionLink> : null}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Move-in date" value={dateLabel(primaryApplication?.createdAt)} />
          <Info label="Contact phone" value={primaryApplication?.applicantPhone ?? "No phone on file"} />
          <Info label="Balance summary" value={formatCurrency(workspace.balance)} />
          <Info label="Lease status" value={workspace.activeLease ? label(workspace.activeLease.status) : "No active lease"} />
          <Info label="Household members" value="Household records appear here when connected to the application profile." />
          <Info label="Tenant history" value={`${workspace.tenantHistory.length} prior application or tenant record${workspace.tenantHistory.length === 1 ? "" : "s"}`} />
        </div>
      </div>
      <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer font-black text-slate-950">Assign or change tenant</summary>
        <form action={assignLandlordUnitTenant} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="unitId" value={unit.id} />
          <select name="tenantUserId" defaultValue={unit.tenantUserId ?? ""} className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
            <option value="">No tenant assigned</option>
            {workspace.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{userOptionLabel(tenant)}</option>)}
          </select>
          <button className="rounded-2xl bg-brand-600 px-5 py-3 font-black text-white hover:bg-brand-700" type="submit">Save tenant</button>
        </form>
      </details>
    </WorkspacePanel>
  );
}

function LeaseWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { activeLease, leasePackets, unit } = workspace;
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Lease workspace" description="Create, review, sign, renew, and track lease packets for this unit." action={<ActionLink href="/landlord/leases" variant="primary">Create lease</ActionLink>}>
        {activeLease ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Active packet" value={label(activeLease.status)} detail={activeLease.template.name} />
            <Metric label="Lease term" value={`${dateLabel(activeLease.leaseStartDate)} - ${dateLabel(activeLease.leaseEndDate)}`} detail="Start and end dates" />
            <Metric label="Rent" value={formatCurrency(activeLease.monthlyRent)} detail={`Deposit: ${activeLease.securityDeposit ? formatCurrency(activeLease.securityDeposit) : "Not set"}`} />
            <Metric label="Signature state" value={activeLease.completedAt ? "Completed" : activeLease.sentForSignatureAt ? "Sent" : "Not sent"} detail={`Updated ${dateLabel(activeLease.updatedAt)}`} />
          </div>
        ) : (
          <EmptyState title="No lease has been created" detail="Create a lease packet after an applicant is approved, then send it for signature and store the final PDF here." actionHref="/landlord/leases" actionLabel="Create lease" />
        )}
      </WorkspacePanel>
      <WorkspacePanel title="Lease packets">
        {leasePackets.length > 0 ? (
          <div className="grid gap-3">
            {leasePackets.map((packet) => (
              <div key={packet.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                <div><p className="font-black text-slate-950">{packet.template.name}</p><p className="text-sm text-slate-600">{packet.application.applicantName} - {formatCurrency(packet.monthlyRent)}/mo - {dateLabel(packet.updatedAt)}</p></div>
                <div className="flex flex-wrap gap-2"><Badge>{label(packet.status)}</Badge><ActionLink href={`/landlord/leases/${packet.id}`} variant="primary">View lease</ActionLink><ActionLink href="/landlord/documents">Download PDF</ActionLink></div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionLink href="/landlord/leases" variant="primary">Send for signature</ActionLink>
          <ActionLink href="/landlord/leases">Renew lease</ActionLink>
          <ActionLink href={`/landlord/rentals/${unit.id}/edit`} variant="danger">Start termination</ActionLink>
        </div>
      </WorkspacePanel>
    </div>
  );
}

function LedgerWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const rows = workspace.ledgerEntries.map((entry) => [
    dateLabel(entry.dueDate ?? entry.postedAt),
    <div key="description"><p className="font-black text-slate-950">{ledgerTypeLabel(entry.type)}</p><p className="text-sm text-slate-600">{entry.description}</p></div>,
    <Badge key="status">{ledgerStatusLabel(entry.status)}</Badge>,
    agingBucket(entry.dueDate),
    <p key="amount" className="font-black text-slate-950">{formatCurrency(entry.amount)}</p>
  ]);
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Ledger workspace" description="Unit-level rent, deposit, charges, payments, credits, late fees, and transaction history.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Current balance" value={formatCurrency(workspace.balance)} detail="Charges minus payments and credits" />
          <Metric label="Monthly rent" value={formatCurrency(workspace.unit.rentAmount)} detail="Current unit rent" />
          <Metric label="Deposits" value={workspace.unit.deposit ? formatCurrency(workspace.unit.deposit) : "Not set"} detail="Security deposit on listing" />
          <Metric label="Payments / credits" value={workspace.payments.length} detail="Recent posted payment records" />
          <Metric label="Charges" value={workspace.charges.length} detail="Rent, fees, deposits, and adjustments" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><ActionLink href="/landlord/ledger" variant="primary">Add charge</ActionLink><ActionLink href="/landlord/payments">Record payment</ActionLink><ActionLink href="/landlord/ledger">Issue credit</ActionLink><ActionLink href="/landlord/reports">Export ledger</ActionLink></div>
      </WorkspacePanel>
      <WorkspacePanel title="Recent transactions">
        {rows.length > 0 ? <WorkspaceTable headers={["Date", "Transaction", "Status", "Aging", "Amount"]} rows={rows} /> : <EmptyState title="No ledger activity yet" detail="Charges, payments, credits, refunds, and adjustments for this unit will appear here." actionHref="/landlord/ledger" actionLabel="Open ledger" />}
      </WorkspacePanel>
    </div>
  );
}

function MaintenanceWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { unit, primaryApplication } = workspace;
  const rows = workspace.maintenanceRequests.map((request) => [
    <div key="request"><p className="font-black text-slate-950">{request.subject}</p><p className="text-sm text-slate-600">{request.description}</p></div>,
    <Badge key="priority">{label(request.priority)}</Badge>,
    <Badge key="status">{label(request.status)}</Badge>,
    request.requester.name ?? request.requester.email,
    request.assignedTo?.name ?? request.assignedTo?.email ?? "Unassigned",
    <div key="actions" className="flex flex-wrap gap-2"><ActionLink href="/landlord/maintenance" variant="primary">Open</ActionLink><ActionLink href="/landlord/inbox">Message</ActionLink></div>
  ]);
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Maintenance workspace" description="Open repair requests, vendor assignment, tenant messages, access notes, and completion work for this unit.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Open requests" value={workspace.openMaintenance.length} detail="Not completed or cancelled" />
          <Metric label="All requests" value={workspace.maintenanceRequests.length} detail="Full unit maintenance history" />
          <Metric label="Assigned staff" value={unit.maintenanceUser?.name ?? unit.maintenanceUser?.email ?? "Unassigned"} detail="Primary maintenance contact" />
        </div>
      </WorkspacePanel>
      <WorkspacePanel title="Create maintenance request">
        <form action={createLandlordMaintenanceRequest} className="grid gap-3 rounded-2xl bg-slate-50 p-4">
          <input type="hidden" name="unitId" value={unit.id} />
          <input type="hidden" name="applicationId" value={primaryApplication?.id ?? ""} />
          <input name="subject" required className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Repair subject" />
          <select name="priority" defaultValue={MaintenancePriority.NORMAL} className="rounded-2xl border border-slate-300 px-4 py-3">
            {Object.values(MaintenancePriority).map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
          </select>
          <textarea name="description" required rows={4} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Describe the repair or maintenance need." />
          <textarea name="accessNotes" rows={2} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Access notes, vendor notes, or entry details." />
          <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Submit repair</button>
        </form>
      </WorkspacePanel>
      <WorkspacePanel title="Work order list">
        {rows.length > 0 ? <WorkspaceTable headers={["Request", "Priority", "Status", "Submitted by", "Assigned", "Actions"]} rows={rows} /> : <EmptyState title="No maintenance requests" detail="Tenant requests, landlord-created work orders, vendor activity, and completion history will appear here." actionHref="/landlord/maintenance" actionLabel="Open maintenance board" />}
      </WorkspacePanel>
    </div>
  );
}

function InspectionsWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const rows = workspace.inspections.map((inspection) => [
    <div key="type"><p className="font-black text-slate-950">{inspection.resultSummary ?? "Unit inspection"}</p><p className="text-sm text-slate-600">{inspection.notes ?? "No notes recorded"}</p></div>,
    <Badge key="status">{label(inspection.status)}</Badge>,
    shortDateTime(inspection.scheduledFor),
    inspection.inspectorName || inspection.assignedTo?.name || inspection.assignedTo?.email || "Unassigned",
    `${inspection.checklistItems.length} checklist items`,
    <ActionLink key="action" href={`/landlord/inspections/${inspection.id}`} variant="primary">View</ActionLink>
  ]);
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Inspection workspace" description="Schedule, review, document, and follow up on inspections for this unit." action={<ActionLink href="/landlord/inspections" variant="primary">Schedule inspection</ActionLink>}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Active inspections" value={workspace.activeInspections.length} detail="Scheduled, in-progress, or needs reinspection" />
          <Metric label="Completed records" value={workspace.inspections.filter((inspection) => ["PASSED", "FAILED", "COMPLETED"].includes(inspection.status)).length} detail="Completed inspection history" />
          <Metric label="Next inspection" value={shortDateTime(workspace.activeInspections[0]?.scheduledFor)} detail="Nearest active inspection" />
        </div>
      </WorkspacePanel>
      <WorkspacePanel title="Inspection records">
        {rows.length > 0 ? <WorkspaceTable headers={["Inspection", "Status", "Scheduled", "Inspector", "Evidence", "Action"]} rows={rows} /> : <EmptyState title="No inspections connected" detail="Move-in, move-out, annual, failed-inspection follow-up, and owner inspections will appear here." actionHref="/landlord/inspections" actionLabel="Schedule inspection" />}
      </WorkspacePanel>
    </div>
  );
}

function DocumentsWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const rows = workspace.documents.map((document) => [
    <div key="doc"><p className="font-black text-slate-950">{document.title}</p><p className="text-sm text-slate-600">{document.originalName}</p></div>,
    <Badge key="type">{label(document.category)}</Badge>,
    <Badge key="status">{label(document.status)}</Badge>,
    dateLabel(document.createdAt),
    document.application?.applicantName ?? document.leasePacket?.template.name ?? "Unit file",
    <div key="actions" className="flex flex-wrap gap-2"><ActionLink href={`/api/documents/${document.id}`} variant="primary">Preview</ActionLink><ActionLink href={`/api/documents/${document.id}`}>Download</ActionLink></div>
  ]);
  return (
    <WorkspacePanel title="Documents workspace" description="Unit-connected leases, applications, reports, notices, invoices, tenant files, photos, and maintenance attachments." action={<ActionLink href="/landlord/documents" variant="primary">Upload document</ActionLink>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "Lease", "Application", "Inspection", "Tenant", "Maintenance", "Other"].map((filter) => <Badge key={filter} tone="bg-white text-slate-700 ring-slate-200">{filter}</Badge>)}
      </div>
      {workspace.missingDocumentRequests > 0 ? <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{workspace.missingDocumentRequests} requested application document{workspace.missingDocumentRequests === 1 ? "" : "s"} still need attention.</p> : null}
      {rows.length > 0 ? <WorkspaceTable headers={["Document", "Type", "Status", "Uploaded", "Related record", "Actions"]} rows={rows} /> : <EmptyState title="No documents connected" detail="Shared leases, inspection reports, notices, invoices, tenant files, and unit records will appear here." actionHref="/landlord/documents" actionLabel="Upload document" />}
    </WorkspacePanel>
  );
}

function TimelineWorkspaceTab({ workspace }: { workspace: Workspace }) {
  return (
    <WorkspacePanel title="Unit timeline" description="A chronological record of listing changes, applications, leases, payments, maintenance, inspections, documents, messages, and operational actions.">
      <div className="space-y-3">
        {workspace.timelineItems.map((item) => (
          <div key={`${item.title}-${item.sortAt.toISOString()}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[160px_1fr]">
            <p className="text-sm font-black text-slate-500">{shortDateTime(item.sortAt)}</p>
            <TimelineRow title={item.title} detail={item.detail} href={item.href} tone={item.tone} />
          </div>
        ))}
        {workspace.timelineItems.length === 0 ? <EmptyState title="No activity yet" detail="Listing changes, messages, document uploads, payments, inspections, lease events, and status changes will build the unit history here." actionHref={`/landlord/rentals/${workspace.unit.id}/edit`} actionLabel="Update unit" /> : null}
      </div>
    </WorkspacePanel>
  );
}

function StaffContactsWorkspaceTab({ workspace }: { workspace: Workspace }) {
  const { unit } = workspace;
  const contactRows = [
    unit.propertyManager ? ["Property manager", unit.propertyManager.name ?? unit.propertyManager.email, unit.propertyManager.email, "Active"] : null,
    unit.maintenanceUser ? ["Maintenance contact", unit.maintenanceUser.name ?? unit.maintenanceUser.email, unit.maintenanceUser.email, "Active"] : null,
    unit.caseworker ? ["Case manager", unit.caseworker.name ?? unit.caseworker.email, unit.caseworker.email, "Active"] : null,
    ...unit.profileConnections.map((connection) => [label(connection.assignedRole), connection.target.name ?? connection.target.email, connection.target.email, label(connection.status)])
  ].filter((row): row is string[] => Boolean(row));
  return (
    <div className="space-y-6">
      <WorkspacePanel title="Staff & contacts" description="People connected to this unit, including managers, vendors, inspectors, case managers, emergency contacts, and shared profile connections.">
        {contactRows.length > 0 ? (
          <WorkspaceTable headers={["Role", "Name", "Email", "Status", "Actions"]} rows={contactRows.map((row) => [...row, <div key="actions" className="flex flex-wrap gap-2"><ActionLink href="/landlord/inbox">Message</ActionLink><ActionLink href={`/landlord/rentals/${unit.id}/edit`}>Edit</ActionLink></div>])} />
        ) : (
          <EmptyState title="No staff contacts assigned" detail="Add property managers, maintenance contacts, vendors, case managers, or emergency contacts so the unit has clear ownership." actionHref={`/landlord/rentals/${unit.id}/edit`} actionLabel="Add contact" />
        )}
      </WorkspacePanel>
      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspacePanel title="Add contact">
          <form action={addLandlordUnitContact} className="grid gap-3">
            <input type="hidden" name="unitId" value={unit.id} />
            <input name="name" required className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Contact name" />
            <input name="role" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Role or relationship" />
            <input name="email" type="email" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="email@example.com" />
            <input name="phone" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Phone" />
            <textarea name="note" rows={3} className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Notes" />
            <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Add contact</button>
          </form>
        </WorkspacePanel>
        <WorkspacePanel title="Assigned support">
          <form action={assignLandlordUnitStaff} className="grid gap-3">
            <input type="hidden" name="unitId" value={unit.id} />
            <label className="block"><span className="text-sm font-bold text-slate-700">Property manager</span><select name="propertyManagerUserId" defaultValue={unit.propertyManagerUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No property manager</option>{workspace.propertyManagerOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}</select></label>
            <label className="block"><span className="text-sm font-bold text-slate-700">Maintenance contact</span><select name="maintenanceUserId" defaultValue={unit.maintenanceUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No maintenance contact</option>{workspace.maintenanceOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}</select></label>
            <label className="block"><span className="text-sm font-bold text-slate-700">Caseworker</span><select name="caseworkerUserId" defaultValue={unit.caseworkerUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">No caseworker</option>{workspace.caseworkerOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}</select></label>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Save assignments</button>
          </form>
        </WorkspacePanel>
      </div>
      <WorkspacePanel title="Message connected renter">
        {workspace.primaryApplication ? (
          <form action={sendWorkflowMessage} className="grid gap-3">
            <input type="hidden" name="applicationId" value={workspace.primaryApplication.id} />
            <input type="hidden" name="type" value={MessageThreadType.GENERAL} />
            <input name="subject" required defaultValue={`Message about ${unit.property.name} #${unit.unitNumber}`} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <textarea name="body" required rows={5} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Write a message..." />
            <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send message</button>
          </form>
        ) : <p className="text-slate-600">Link a current application before messaging a tenant from this unit.</p>}
      </WorkspacePanel>
    </div>
  );
}
