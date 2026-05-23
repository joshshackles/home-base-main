import Link from "next/link";
import type { ReactNode } from "react";
import { MaintenancePriority, MessageThreadType } from "@prisma/client";
import { addLandlordUnitContact, assignLandlordUnitTenant, createLandlordMaintenanceRequest } from "@/app/landlord/actions";
import { sendWorkflowMessage } from "@/app/workflow-actions";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import type { LandlordUnitWorkspaceModel } from "@/lib/platform";
import { type UnitWorkspaceTabKey, unitWorkspaceTabs } from "@/components/landlord/unit-workspace/UnitWorkspaceTabs";

type Workspace = NonNullable<LandlordUnitWorkspaceModel>;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not set";
}

function shortDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString(undefined, { month: "short", day: "numeric", minute: "2-digit" }) : "Not scheduled";
}

function userOptionLabel(user: { name: string | null; email: string }) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

function tabHref(unitId: string, tab: UnitWorkspaceTabKey) {
  return `/landlord/units/${unitId}?tab=${tab}`;
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("active") || normalized.includes("approved") || normalized.includes("posted") || normalized.includes("completed") || normalized.includes("passed")) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (normalized.includes("denied") || normalized.includes("failed") || normalized.includes("cancelled") || normalized.includes("void")) return "bg-rose-50 text-rose-800 ring-rose-200";
  if (normalized.includes("new") || normalized.includes("draft") || normalized.includes("review") || normalized.includes("pending") || normalized.includes("scheduled")) return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${tone ?? statusTone(String(children))}`}>{children}</span>;
}

function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const styles = variant === "primary"
    ? "bg-brand-600 text-white hover:bg-brand-700"
    : variant === "danger"
      ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  return <Link href={href} className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black ${styles}`}>{children}</Link>;
}

function Card({ id, title, eyebrow, action, focused, children, className = "" }: { id?: string; title: string; eyebrow?: string; action?: ReactNode; focused?: boolean; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`rounded-3xl border bg-white p-4 shadow-sm ${focused ? "border-brand-300 ring-4 ring-brand-100" : "border-slate-200"} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
          <h2 className="truncate text-lg font-black text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyMini({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
      <ButtonLink href={href} variant="primary">{action}</ButtonLink>
    </div>
  );
}

function InfoRow({ label: rowLabel, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{rowLabel}</p>
      <div className="max-w-[60%] text-right text-sm font-bold leading-5 text-slate-900">{value}</div>
    </div>
  );
}

function CompactMetric({ label: metricLabel, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{metricLabel}</p>
      <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}

function FeedItem({ title, detail, href, meta }: { title: string; detail: string; href?: string; meta?: string }) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 line-clamp-1 text-sm font-black text-slate-950">{title}</p>
        {meta ? <p className="shrink-0 text-[11px] font-bold uppercase text-slate-500">{meta}</p> : null}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function focusFor(tab: UnitWorkspaceTabKey, targets: UnitWorkspaceTabKey[]) {
  return targets.includes(tab);
}

export function UnitPropertyWorkspace({ workspace, activeTab }: { workspace: Workspace; activeTab: UnitWorkspaceTabKey }) {
  const {
    unit,
    featuredPhoto,
    listingHealthScore,
    primaryApplication,
    tenantName,
    activeLease,
    leasePackets,
    ledgerEntries,
    paymentPlans,
    maintenanceRequests,
    inspections,
    documents,
    timelineItems,
    messageThreads,
    tenants,
    actionItems,
    openMaintenance,
    activeInspections,
    balance
  } = workspace;
  const pendingApplications = unit.applications.filter((application) => ["STARTED", "SUBMITTED", "UNDER_REVIEW"].includes(application.status));
  const approvedApplications = unit.applications.filter((application) => application.status === "APPROVED");
  const deniedApplications = unit.applications.filter((application) => application.status === "DENIED");
  const moveInCost = unit.rentAmount + (unit.deposit ?? 0);

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/landlord/inventory" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-50">Back to Inventory</Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Property workspace</p>
            <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">{unit.property.name} #{unit.unitNumber}</h1>
            <p className="truncate text-sm font-semibold text-slate-600">{unit.property.addressLine}, {unit.property.city}, {unit.property.state} {unit.property.zip}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{label(unit.status)}</Badge>
            <Badge>{label(unit.marketingStatus)}</Badge>
            <Badge tone="bg-blue-50 text-blue-800 ring-blue-200">{listingHealthScore}% listing health</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1920px] gap-4 px-4 py-4 sm:px-6 2xl:grid-cols-[220px_minmax(280px,0.95fr)_minmax(360px,1.15fr)_minmax(320px,0.9fr)_330px]">
        <aside className="2xl:sticky 2xl:top-[88px] 2xl:h-[calc(100vh-104px)]">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-3 text-white shadow-sm">
            <p className="px-2 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Workspace focus</p>
            <nav className="flex gap-2 overflow-x-auto 2xl:block 2xl:space-y-1">
              {unitWorkspaceTabs.map((tab) => {
                const active = tab.key === activeTab;
                return (
                  <Link key={tab.key} href={tabHref(unit.id, tab.key)} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-black transition ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span>{tab.label}</span>
                    {active ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="space-y-4">
          <Card title="Feature photo" eyebrow="Listing media" focused={focusFor(activeTab, ["listing", "documents"])} action={<ButtonLink href={`/landlord/rentals/${unit.id}/edit`}>Upload</ButtonLink>}>
            <div className="overflow-hidden rounded-3xl bg-slate-100">
              {featuredPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/unit-photos/${featuredPhoto.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-brand-700 text-xs font-black uppercase tracking-[0.2em] text-white/80">Add photo</div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CompactMetric label="Photos" value={unit.photos.length} />
              <CompactMetric label="Beds" value={unit.bedrooms} />
              <CompactMetric label="Baths" value={unit.bathrooms} />
            </div>
          </Card>

          <Card title="Property/listing summary" focused={focusFor(activeTab, ["listing"])}>
            <InfoRow label="Headline" value={unit.marketingHeadline ?? unit.property.name} />
            <InfoRow label="Rent" value={formatCurrency(unit.rentAmount)} />
            <InfoRow label="Deposit" value={unit.deposit ? formatCurrency(unit.deposit) : "Not set"} />
            <InfoRow label="Available" value={dateLabel(unit.availableOn)} />
            <InfoRow label="Description" value={<span className="line-clamp-3">{unit.description ?? "No public description yet."}</span>} />
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Edit listing</ButtonLink>
              <ButtonLink href={`/marketplace/${unit.id}`}>Public listing</ButtonLink>
            </div>
          </Card>

          <Card title="Listing and location details" focused={focusFor(activeTab, ["listing"])}>
            <InfoRow label="School district" value={unit.schoolDistrict ?? "Not set"} />
            <InfoRow label="Neighborhood" value={unit.neighborhood ?? "Not set"} />
            <InfoRow label="Year built" value={unit.yearBuilt ?? "Not set"} />
            <InfoRow label="Roof age" value={unit.roofAgeYears ? `${unit.roofAgeYears} years` : "Not set"} />
            <InfoRow label="Parking" value={unit.parkingInfo ?? "Not set"} />
            <InfoRow label="Laundry" value={unit.laundryInfo ?? "Not set"} />
            <InfoRow label="Appliances" value={unit.appliancesIncluded ?? "Not set"} />
            <InfoRow label="Flooring" value={unit.flooringInfo ?? "Not set"} />
            <InfoRow label="Yard/outdoor" value={unit.yardInfo ?? "Not set"} />
            <InfoRow label="Smoking" value={unit.smokingPolicy ?? "Not set"} />
            <InfoRow label="Nearby" value={<span className="line-clamp-3">{unit.nearbyFeatures ?? "Not set"}</span>} />
          </Card>
        </section>

        <section className="space-y-4">
          <Card title="Tenant and applicant status" eyebrow="Resident record" focused={focusFor(activeTab, ["tenant", "leads-applications"])}>
            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-black uppercase tracking-wide text-blue-200">{unit.tenantUserId ? "Current tenant" : "Current applicant"}</p>
              <h2 className="mt-1 text-2xl font-black">{tenantName}</h2>
              <p className="mt-1 text-sm text-slate-300">{unit.tenantUser?.email ?? primaryApplication?.applicantEmail ?? "No connected renter yet"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href="/landlord/inbox">Message</ButtonLink>
                {primaryApplication ? <ButtonLink href={`/landlord/applications/${primaryApplication.id}`}>Review profile</ButtonLink> : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CompactMetric label="Leads" value={unit.leads.length} />
              <CompactMetric label="Pending apps" value={pendingApplications.length} />
              <CompactMetric label="Approved" value={approvedApplications.length} />
              <CompactMetric label="Denied" value={deniedApplications.length} />
            </div>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Assign tenant</summary>
              <form action={assignLandlordUnitTenant} className="mt-3 grid gap-2">
                <input type="hidden" name="unitId" value={unit.id} />
                <select name="tenantUserId" defaultValue={unit.tenantUserId ?? ""} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Choose existing tenant</option>
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{userOptionLabel(tenant)}</option>)}
                </select>
                <input name="tenantEmail" type="email" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="or new tenant email" />
                <button type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white hover:bg-brand-700">Assign tenant</button>
              </form>
            </details>
          </Card>

          <Card title="Lease status" focused={focusFor(activeTab, ["lease"])}>
            {activeLease ? (
              <>
                <InfoRow label="Status" value={<Badge>{label(activeLease.status)}</Badge>} />
                <InfoRow label="Term" value={`${dateLabel(activeLease.leaseStartDate)} - ${dateLabel(activeLease.leaseEndDate)}`} />
                <InfoRow label="Monthly rent" value={formatCurrency(activeLease.monthlyRent)} />
                <InfoRow label="Deposit" value={activeLease.securityDeposit ? formatCurrency(activeLease.securityDeposit) : "Not set"} />
                <InfoRow label="Signatures" value={activeLease.completedAt ? "Completed" : activeLease.sentForSignatureAt ? "Sent" : "Not sent"} />
                <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href={`/landlord/leases/${activeLease.id}`} variant="primary">View lease</ButtonLink><ButtonLink href="/landlord/documents">Documents</ButtonLink></div>
              </>
            ) : (
              <EmptyMini title="No active lease" detail="Create a lease from an approved application and send it for signature." href="/landlord/leases" action="Create lease" />
            )}
          </Card>

          <Card title="Payment history and ledger" focused={focusFor(activeTab, ["ledger"])}>
            <div className="grid grid-cols-2 gap-2">
              <CompactMetric label="Balance" value={formatCurrency(balance)} />
              <CompactMetric label="Transactions" value={ledgerEntries.length} />
            </div>
            <div className="mt-3 space-y-2">
              {ledgerEntries.slice(0, 5).map((entry) => (
                <FeedItem key={entry.id} title={`${ledgerTypeLabel(entry.type)} - ${formatCurrency(entry.amount)}`} detail={`${entry.description} - ${ledgerStatusLabel(entry.status)} - ${agingBucket(entry.dueDate)}`} href="/landlord/ledger" meta={dateLabel(entry.postedAt)} />
              ))}
              {ledgerEntries.length === 0 ? <EmptyMini title="No ledger activity" detail="Charges, payments, credits, refunds, and adjustments will appear here." href="/landlord/ledger" action="Open ledger" /> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href="/landlord/ledger" variant="primary">Ledger</ButtonLink><ButtonLink href="/landlord/payments">Record payment</ButtonLink></div>
          </Card>

          <Card title="Payment plans" focused={focusFor(activeTab, ["ledger"])}>
            {paymentPlans.length > 0 ? paymentPlans.slice(0, 3).map((plan) => (
              <FeedItem key={plan.id} title={plan.name} detail={`${label(plan.status)} - ${plan.installments.length} installments`} meta={dateLabel(plan.createdAt)} />
            )) : <EmptyMini title="No payment plans" detail="Payment plans for deposits, balances, or arrangements will appear here." href="/landlord/payments" action="Open payments" />}
          </Card>

          <Card title="Inspections and documents" focused={focusFor(activeTab, ["inspections", "documents"])}>
            <div className="grid grid-cols-2 gap-2">
              <CompactMetric label="Active inspections" value={activeInspections.length} />
              <CompactMetric label="Documents" value={documents.length} />
            </div>
            <div className="mt-3 space-y-2">
              {inspections.slice(0, 2).map((inspection) => <FeedItem key={inspection.id} title={`Inspection: ${label(inspection.status)}`} detail={`${shortDateTime(inspection.scheduledFor)} - ${inspection.inspectorName || inspection.assignedTo?.name || "Unassigned"}`} href={`/landlord/inspections/${inspection.id}`} />)}
              {documents.slice(0, 3).map((document) => <FeedItem key={document.id} title={document.title} detail={`${label(document.category)} - ${label(document.status)}`} href={`/api/documents/${document.id}`} meta={dateLabel(document.createdAt)} />)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href="/landlord/inspections">Inspections</ButtonLink><ButtonLink href="/landlord/documents">Documents</ButtonLink></div>
          </Card>

          <Card title="Rental timeline" focused={focusFor(activeTab, ["timeline"])}>
            <div className="space-y-2">
              {timelineItems.slice(0, 5).map((item) => <FeedItem key={`${item.title}-${item.sortAt.toISOString()}`} title={item.title} detail={item.detail} href={item.href} meta={shortDateTime(item.sortAt)} />)}
              {timelineItems.length === 0 ? <p className="text-sm leading-6 text-slate-600">Timeline activity appears as records are created.</p> : null}
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <Card title="Rent and move-in terms" eyebrow="Financial terms" focused={focusFor(activeTab, ["listing", "lease", "ledger"])}>
            <InfoRow label="Monthly rent" value={formatCurrency(unit.rentAmount)} />
            <InfoRow label="Deposit" value={unit.deposit ? formatCurrency(unit.deposit) : "Not set"} />
            <InfoRow label="Move-in estimate" value={formatCurrency(moveInCost)} />
            <InfoRow label="Available date" value={dateLabel(unit.availableOn)} />
            <InfoRow label="Rent due day" value={unit.rentDueDay ? `Day ${unit.rentDueDay}` : "Not set"} />
            <InfoRow label="Average utilities" value={unit.averageUtilityBill ? formatCurrency(unit.averageUtilityBill) : "Not set"} />
            <InfoRow label="Late fee policy" value={unit.lateFeePolicy ?? "Not set"} />
            <InfoRow label="Lease terms" value={<span className="line-clamp-3">{unit.leaseTermsNote ?? "Not set"}</span>} />
            <InfoRow label="Move-in fees" value={<span className="line-clamp-3">{unit.moveInFeesNote ?? "Not set"}</span>} />
            <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Edit terms</ButtonLink><ButtonLink href="/landlord/reports">Export</ButtonLink></div>
          </Card>

          <Card title="Repair and maintenance" eyebrow="Work order intake" focused={focusFor(activeTab, ["maintenance"])}>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <CompactMetric label="Open" value={openMaintenance.length} />
              <CompactMetric label="All repairs" value={maintenanceRequests.length} />
            </div>
            <form action={createLandlordMaintenanceRequest} className="grid gap-2">
              <input type="hidden" name="unitId" value={unit.id} />
              <input type="hidden" name="applicationId" value={primaryApplication?.id ?? ""} />
              <input name="subject" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Repair subject" />
              <select name="priority" defaultValue={MaintenancePriority.NORMAL} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {Object.values(MaintenancePriority).map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
              </select>
              <textarea name="description" required rows={4} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Description" />
              <textarea name="accessNotes" rows={2} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Access notes" />
              <button className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white hover:bg-brand-700" type="submit">Submit repair</button>
            </form>
            <div className="mt-3 space-y-2">
              {maintenanceRequests.slice(0, 3).map((request) => <FeedItem key={request.id} title={request.subject} detail={`${label(request.status)} - ${label(request.priority)} - assigned to ${request.assignedTo?.name ?? request.assignedTo?.email ?? "Unassigned"}`} href="/landlord/maintenance" />)}
            </div>
          </Card>
        </section>

        <aside className="space-y-4 2xl:sticky 2xl:top-[88px] 2xl:h-[calc(100vh-104px)] 2xl:overflow-y-auto">
          <Card title="Workflow alerts" eyebrow="Next actions">
            <div className="space-y-2">
              {actionItems.slice(0, 5).map((item) => <FeedItem key={item.title} title={item.title} detail={item.detail} href={item.href.startsWith("#") ? tabHref(unit.id, item.href.includes("pipeline") ? "leads-applications" : item.href.includes("maintenance") ? "maintenance" : item.href.includes("inspections") ? "inspections" : item.href.includes("documents") ? "documents" : item.href.includes("ledger") ? "ledger" : "listing") : item.href} />)}
              {actionItems.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">No urgent workflow alerts right now.</p> : null}
            </div>
          </Card>

          <Card title="Client notes" focused={focusFor(activeTab, ["staff-contacts"])}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{unit.clientNotes ?? "No client notes have been saved yet."}</p>
            <ButtonLink href={`/landlord/rentals/${unit.id}/edit`}>Edit notes</ButtonLink>
          </Card>

          <Card title="Message client">
            {primaryApplication ? (
              <form action={sendWorkflowMessage} className="grid gap-2">
                <input type="hidden" name="applicationId" value={primaryApplication.id} />
                <input type="hidden" name="type" value={MessageThreadType.GENERAL} />
                <input name="subject" required defaultValue={`Message about ${unit.property.name} #${unit.unitNumber}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <textarea name="body" required rows={4} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Write a message..." />
                <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800" type="submit">Send message</button>
              </form>
            ) : <p className="text-sm leading-6 text-slate-600">Link a current application before messaging from this unit.</p>}
          </Card>

          <Card title="Recent messages">
            <div className="space-y-2">
              {messageThreads.slice(0, 4).map((thread) => <FeedItem key={thread.id} title={thread.subject} detail={thread.messages[0] ? `${thread.messages[0].sender.name || thread.messages[0].sender.email}: ${thread.messages[0].body}` : label(thread.status)} href="/landlord/inbox" meta={thread.lastMessageAt ? shortDateTime(thread.lastMessageAt) : undefined} />)}
              {messageThreads.length === 0 ? <p className="text-sm leading-6 text-slate-600">No messages are connected to this unit yet.</p> : null}
            </div>
            <ButtonLink href="/landlord/inbox" variant="primary">Open inbox</ButtonLink>
          </Card>

          <Card title="Important contacts" focused={focusFor(activeTab, ["staff-contacts"])}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{unit.importantContacts ?? "No important contacts have been saved yet."}</p>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Add contact</summary>
              <form action={addLandlordUnitContact} className="mt-3 grid gap-2">
                <input type="hidden" name="unitId" value={unit.id} />
                <input name="name" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Name" />
                <input name="role" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Role" />
                <input name="email" type="email" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Email" />
                <input name="phone" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Phone" />
                <textarea name="note" rows={2} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Notes" />
                <button className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white hover:bg-brand-700" type="submit">Add</button>
              </form>
            </details>
          </Card>
        </aside>
      </div>
    </main>
  );
}
