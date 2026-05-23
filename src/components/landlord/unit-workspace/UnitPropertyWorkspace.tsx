import Link from "next/link";
import type { ReactNode } from "react";
import { MaintenancePriority, MessageThreadType } from "@prisma/client";
import { Banknote, ClipboardCheck, Clock3, FileText, Home, Inbox, KeyRound, Megaphone, MessageSquare, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { addLandlordUnitContact, assignLandlordUnitTenant, createLandlordMaintenanceRequest } from "@/app/landlord/actions";
import { sendWorkflowMessage } from "@/app/workflow-actions";
import { formatCurrency } from "@/lib/format";
import { agingBucket, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import type { LandlordUnitWorkspaceModel } from "@/lib/platform";
import type { WorkspaceResolvedModel } from "@/lib/workspace";
import { type UnitWorkspaceTabKey, unitWorkspaceTabs } from "@/components/landlord/unit-workspace/UnitWorkspaceTabs";

type Workspace = NonNullable<LandlordUnitWorkspaceModel>;
type WorkspaceEngine = WorkspaceResolvedModel;

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

const tabIcons: Record<UnitWorkspaceTabKey, LucideIcon> = {
  listing: Home,
  "leads-applications": Users,
  tenant: KeyRound,
  lease: FileText,
  ledger: Banknote,
  maintenance: Wrench,
  inspections: ClipboardCheck,
  documents: FileText,
  timeline: Clock3,
  "staff-contacts": Inbox
};

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

function Card({ id, title, eyebrow, action, focused, icon: Icon, children, className = "" }: { id?: string; title: string; eyebrow?: string; action?: ReactNode; focused?: boolean; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`rounded-3xl border bg-white p-4 shadow-sm ${focused ? "border-brand-300 ring-4 ring-brand-100" : "border-slate-200"} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {Icon ? <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-700"><Icon size={17} /></span> : null}
          <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
          <h2 className="truncate text-lg font-black text-slate-950">{title}</h2>
          </div>
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

function InfoRow({ label: rowLabel, value, multiline = false }: { label: string; value: ReactNode; multiline?: boolean }) {
  return (
    <div className={`${multiline ? "block" : "flex items-start justify-between gap-4"} border-b border-slate-100 py-2.5 last:border-b-0`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{rowLabel}</p>
      <div className={`${multiline ? "mt-1 text-left" : "max-w-[60%] text-right"} break-words text-sm font-bold leading-5 text-slate-900`}>{value}</div>
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

function EnginePill({ label: pillLabel, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">{pillLabel}</p>
      <p className="mt-0.5 truncate text-sm font-black text-slate-950">{value}</p>
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

function workflowCopy(tab: UnitWorkspaceTabKey, workspace: Workspace) {
  const { unit, activeLease, primaryApplication, openMaintenance } = workspace;
  const map: Record<UnitWorkspaceTabKey, { title: string; detail: string; primaryHref: string; primaryLabel: string; secondaryHref: string; secondaryLabel: string }> = {
    listing: {
      title: "Listing focus",
      detail: "Tune the public story, location details, photos, terms, and listing readiness for this unit.",
      primaryHref: `/landlord/rentals/${unit.id}/edit`,
      primaryLabel: "Edit listing",
      secondaryHref: `/marketplace/${unit.id}`,
      secondaryLabel: "View public listing"
    },
    "leads-applications": {
      title: "Leasing pipeline focus",
      detail: `${unit.leads.length} lead${unit.leads.length === 1 ? "" : "s"} and ${unit.applications.length} application${unit.applications.length === 1 ? "" : "s"} are tied to this unit.`,
      primaryHref: "/landlord/applications",
      primaryLabel: "Review applications",
      secondaryHref: "/landlord/leads",
      secondaryLabel: "Open leads"
    },
    tenant: {
      title: "Resident focus",
      detail: unit.tenantUserId ? "Manage the current tenant, message history, household context, and move-out readiness." : "This unit is open for tenant assignment once an applicant is approved.",
      primaryHref: primaryApplication ? `/landlord/applications/${primaryApplication.id}` : "/landlord/applications",
      primaryLabel: primaryApplication ? "View renter profile" : "Review applicants",
      secondaryHref: "/landlord/inbox",
      secondaryLabel: "Message"
    },
    lease: {
      title: "Lease focus",
      detail: activeLease ? `Current lease packet is ${label(activeLease.status)}.` : "Create a lease packet and send it for signature when the unit is ready.",
      primaryHref: activeLease ? `/landlord/leases/${activeLease.id}` : "/landlord/leases",
      primaryLabel: activeLease ? "View lease" : "Create lease",
      secondaryHref: "/landlord/documents",
      secondaryLabel: "Lease documents"
    },
    ledger: {
      title: "Financial focus",
      detail: `${formatCurrency(workspace.balance)} current unit balance with ${workspace.ledgerEntries.length} recent ledger transaction${workspace.ledgerEntries.length === 1 ? "" : "s"}.`,
      primaryHref: "/landlord/payments",
      primaryLabel: "Record payment",
      secondaryHref: "/landlord/ledger",
      secondaryLabel: "Open ledger"
    },
    maintenance: {
      title: "Maintenance focus",
      detail: `${openMaintenance.length} open work order${openMaintenance.length === 1 ? "" : "s"} need coordination for this unit.`,
      primaryHref: "/landlord/maintenance",
      primaryLabel: "Open board",
      secondaryHref: "/landlord/inbox",
      secondaryLabel: "Message renter"
    },
    inspections: {
      title: "Inspection focus",
      detail: `${workspace.activeInspections.length} active inspection${workspace.activeInspections.length === 1 ? "" : "s"} and ${workspace.inspections.length} total record${workspace.inspections.length === 1 ? "" : "s"} are connected.`,
      primaryHref: "/landlord/inspections",
      primaryLabel: "Schedule inspection",
      secondaryHref: "/landlord/documents",
      secondaryLabel: "Inspection files"
    },
    documents: {
      title: "Document focus",
      detail: `${workspace.documents.length} document${workspace.documents.length === 1 ? "" : "s"} are connected to the property, unit, application, or lease context.`,
      primaryHref: "/landlord/documents",
      primaryLabel: "Upload document",
      secondaryHref: "/landlord/leases",
      secondaryLabel: "Lease center"
    },
    timeline: {
      title: "Timeline focus",
      detail: "Review recent listing, leasing, payment, repair, inspection, document, and message activity in order.",
      primaryHref: tabHref(unit.id, "timeline"),
      primaryLabel: "Review activity",
      secondaryHref: "/landlord/inbox",
      secondaryLabel: "Open inbox"
    },
    "staff-contacts": {
      title: "Contacts focus",
      detail: "Manage internal notes, client contacts, renter communication, and assigned support relationships.",
      primaryHref: `/landlord/rentals/${unit.id}/edit`,
      primaryLabel: "Edit contacts",
      secondaryHref: "/landlord/inbox",
      secondaryLabel: "Message"
    }
  };
  return map[tab];
}

function focusOrder(tab: UnitWorkspaceTabKey, group: "listing" | "resident" | "financial" | "side") {
  const priorities: Record<UnitWorkspaceTabKey, Partial<Record<typeof group, string>>> = {
    listing: { listing: "xl:order-1", financial: "xl:order-3", resident: "xl:order-2", side: "xl:order-4" },
    "leads-applications": { resident: "xl:order-1", listing: "xl:order-2", side: "xl:order-3", financial: "xl:order-4" },
    tenant: { resident: "xl:order-1", side: "xl:order-2", financial: "xl:order-3", listing: "xl:order-4" },
    lease: { resident: "xl:order-1", financial: "xl:order-2", side: "xl:order-3", listing: "xl:order-4" },
    ledger: { financial: "xl:order-1", resident: "xl:order-2", side: "xl:order-3", listing: "xl:order-4" },
    maintenance: { financial: "xl:order-1", side: "xl:order-2", resident: "xl:order-3", listing: "xl:order-4" },
    inspections: { resident: "xl:order-1", side: "xl:order-2", financial: "xl:order-3", listing: "xl:order-4" },
    documents: { resident: "xl:order-1", side: "xl:order-2", listing: "xl:order-3", financial: "xl:order-4" },
    timeline: { side: "xl:order-1", resident: "xl:order-2", financial: "xl:order-3", listing: "xl:order-4" },
    "staff-contacts": { side: "xl:order-1", resident: "xl:order-2", listing: "xl:order-3", financial: "xl:order-4" }
  };
  return priorities[tab][group] ?? "";
}

export function UnitPropertyWorkspace({ workspace, activeTab, engine }: { workspace: Workspace; activeTab: UnitWorkspaceTabKey; engine: WorkspaceEngine }) {
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
  const activeWorkflow = workflowCopy(activeTab, workspace);
  const ActiveIcon = tabIcons[activeTab];
  const activeEngineCommands = engine.commands.slice(0, 4);
  const activeEngineWidgets = engine.widgets.slice(0, 5);
  const activeEnginePanels = engine.panels.slice(0, 4);

  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm shadow-slate-950/[0.03] backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
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
            <Badge tone={engine.canAccess ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}>{engine.canAccess ? "Engine scoped" : "Scope blocked"}</Badge>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/80">
          <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white"><ActiveIcon size={17} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">{activeWorkflow.title}</p>
              <p className="line-clamp-1 text-xs font-semibold text-slate-600">{activeWorkflow.detail}</p>
              <p className="line-clamp-1 text-[11px] font-bold text-brand-700">{engine.modeDefinition.label} mode - {engine.modeDefinition.primaryIntent}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={activeWorkflow.primaryHref} variant="primary">{activeWorkflow.primaryLabel}</ButtonLink>
              <ButtonLink href={activeWorkflow.secondaryHref}>{activeWorkflow.secondaryLabel}</ButtonLink>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1920px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[190px_minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_300px] 2xl:grid-cols-[220px_minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.9fr)_330px]">
        <aside className="xl:sticky xl:top-[132px] xl:h-[calc(100vh-148px)]">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-3 text-white shadow-sm">
            <p className="px-2 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Workspace focus</p>
            <nav className="flex gap-2 overflow-x-auto xl:block xl:space-y-1">
              {unitWorkspaceTabs.map((tab) => {
                const active = tab.key === activeTab;
                const Icon = tabIcons[tab.key];
                return (
                  <Link key={tab.key} href={tabHref(unit.id, tab.key)} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-black transition ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className="flex min-w-0 items-center gap-2"><Icon size={15} className="shrink-0" /><span className="truncate">{tab.label}</span></span>
                    {active ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className={`space-y-4 ${focusOrder(activeTab, "listing")}`}>
          <Card title="Feature photo" eyebrow="Listing media" icon={Home} focused={focusFor(activeTab, ["listing", "documents"])} action={<ButtonLink href={`/landlord/rentals/${unit.id}/edit`}>Upload</ButtonLink>}>
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

          <Card title="Property/listing summary" icon={Megaphone} focused={focusFor(activeTab, ["listing"])}>
            <InfoRow label="Headline" value={unit.marketingHeadline ?? unit.property.name} />
            <InfoRow label="Rent" value={formatCurrency(unit.rentAmount)} />
            <InfoRow label="Deposit" value={unit.deposit ? formatCurrency(unit.deposit) : "Not set"} />
            <InfoRow label="Available" value={dateLabel(unit.availableOn)} />
            <InfoRow label="Description" multiline value={<span className="line-clamp-4">{unit.description ?? "No public description yet."}</span>} />
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Edit listing</ButtonLink>
              <ButtonLink href={`/marketplace/${unit.id}`}>Public listing</ButtonLink>
            </div>
          </Card>

          <Card title="Listing and location details" icon={Home} focused={focusFor(activeTab, ["listing"])}>
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
            <InfoRow label="Nearby" multiline value={<span className="line-clamp-4">{unit.nearbyFeatures ?? "Not set"}</span>} />
          </Card>
        </section>

        <section className={`space-y-4 ${focusOrder(activeTab, "resident")}`}>
          <Card title="Tenant and applicant status" eyebrow="Resident record" icon={Users} focused={focusFor(activeTab, ["tenant", "leads-applications"])}>
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

          <Card title="Lease status" icon={FileText} focused={focusFor(activeTab, ["lease"])}>
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

          <Card title="Payment history and ledger" icon={Banknote} focused={focusFor(activeTab, ["ledger"])}>
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

          <Card title="Payment plans" icon={Banknote} focused={focusFor(activeTab, ["ledger"])}>
            {paymentPlans.length > 0 ? paymentPlans.slice(0, 3).map((plan) => (
              <FeedItem key={plan.id} title={plan.name} detail={`${label(plan.status)} - ${plan.installments.length} installments`} meta={dateLabel(plan.createdAt)} />
            )) : <EmptyMini title="No payment plans" detail="Payment plans for deposits, balances, or arrangements will appear here." href="/landlord/payments" action="Open payments" />}
          </Card>

          <Card title="Inspections and documents" icon={ClipboardCheck} focused={focusFor(activeTab, ["inspections", "documents"])}>
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

          <Card title="Rental timeline" icon={Clock3} focused={focusFor(activeTab, ["timeline"])}>
            <div className="space-y-2">
              {timelineItems.slice(0, 5).map((item) => <FeedItem key={`${item.title}-${item.sortAt.toISOString()}`} title={item.title} detail={item.detail} href={item.href} meta={shortDateTime(item.sortAt)} />)}
              {timelineItems.length === 0 ? <p className="text-sm leading-6 text-slate-600">Timeline activity appears as records are created.</p> : null}
            </div>
          </Card>
        </section>

        <section className={`space-y-4 ${focusOrder(activeTab, "financial")}`}>
          <Card title="Rent and move-in terms" eyebrow="Financial terms" icon={Banknote} focused={focusFor(activeTab, ["listing", "lease", "ledger"])}>
            <InfoRow label="Monthly rent" value={formatCurrency(unit.rentAmount)} />
            <InfoRow label="Deposit" value={unit.deposit ? formatCurrency(unit.deposit) : "Not set"} />
            <InfoRow label="Move-in estimate" value={formatCurrency(moveInCost)} />
            <InfoRow label="Available date" value={dateLabel(unit.availableOn)} />
            <InfoRow label="Rent due day" value={unit.rentDueDay ? `Day ${unit.rentDueDay}` : "Not set"} />
            <InfoRow label="Average utilities" value={unit.averageUtilityBill ? formatCurrency(unit.averageUtilityBill) : "Not set"} />
            <InfoRow label="Late fee policy" value={unit.lateFeePolicy ?? "Not set"} />
            <InfoRow label="Lease terms" multiline value={<span className="line-clamp-4">{unit.leaseTermsNote ?? "Not set"}</span>} />
            <InfoRow label="Move-in fees" multiline value={<span className="line-clamp-4">{unit.moveInFeesNote ?? "Not set"}</span>} />
            <div className="mt-3 flex flex-wrap gap-2"><ButtonLink href={`/landlord/rentals/${unit.id}/edit`} variant="primary">Edit terms</ButtonLink><ButtonLink href="/landlord/reports">Export</ButtonLink></div>
          </Card>

          <Card title="Repair and maintenance" eyebrow="Work order intake" icon={Wrench} focused={focusFor(activeTab, ["maintenance"])}>
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

        <aside className={`space-y-4 xl:sticky xl:top-[132px] xl:h-[calc(100vh-148px)] xl:overflow-y-auto ${focusOrder(activeTab, "side")}`}>
          <Card title="Workspace engine" eyebrow="Shared platform model" icon={ClipboardCheck}>
            <div className="grid grid-cols-2 gap-2">
              <EnginePill label="Mode" value={engine.modeDefinition.label} />
              <EnginePill label="Urgency" value={label(engine.context.urgency)} />
              <EnginePill label="Widgets" value={engine.widgets.length} />
              <EnginePill label="Commands" value={engine.commands.length} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{engine.modeDefinition.description}</p>
            {engine.deniedReason ? <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-800">{engine.deniedReason}</p> : null}
            <div className="mt-3 space-y-2">
              {activeEngineCommands.length > 0 ? (
                activeEngineCommands.map((command) => (
                  <div key={command.key} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-slate-950">{command.label}</p>
                      {command.auditRequired ? <Badge tone="bg-amber-50 text-amber-900 ring-amber-200">Audited</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{command.description}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">No engine commands are available for this mode and permission set.</p>
              )}
            </div>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Resolved widgets and panels</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Widgets</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeEngineWidgets.map((widget) => <Badge key={widget.key} tone="bg-blue-50 text-blue-800 ring-blue-200">{widget.label}</Badge>)}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Panels</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeEnginePanels.map((panel) => <Badge key={panel.key} tone="bg-slate-100 text-slate-700 ring-slate-200">{panel.label}</Badge>)}
                  </div>
                </div>
              </div>
            </details>
          </Card>

          <Card title="Workflow alerts" eyebrow="Next actions" icon={Megaphone}>
            <div className="space-y-2">
              {actionItems.slice(0, 5).map((item) => <FeedItem key={item.title} title={item.title} detail={item.detail} href={item.href.startsWith("#") ? tabHref(unit.id, item.href.includes("pipeline") ? "leads-applications" : item.href.includes("maintenance") ? "maintenance" : item.href.includes("inspections") ? "inspections" : item.href.includes("documents") ? "documents" : item.href.includes("ledger") ? "ledger" : "listing") : item.href} />)}
              {actionItems.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">No urgent workflow alerts right now.</p> : null}
            </div>
          </Card>

          <Card title="Client notes" icon={FileText} focused={focusFor(activeTab, ["staff-contacts"])}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{unit.clientNotes ?? "No client notes have been saved yet."}</p>
            <ButtonLink href={`/landlord/rentals/${unit.id}/edit`}>Edit notes</ButtonLink>
          </Card>

          <Card title="Message client" icon={MessageSquare}>
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

          <Card title="Recent messages" icon={Inbox}>
            <div className="space-y-2">
              {messageThreads.slice(0, 4).map((thread) => <FeedItem key={thread.id} title={thread.subject} detail={thread.messages[0] ? `${thread.messages[0].sender.name || thread.messages[0].sender.email}: ${thread.messages[0].body}` : label(thread.status)} href="/landlord/inbox" meta={thread.lastMessageAt ? shortDateTime(thread.lastMessageAt) : undefined} />)}
              {messageThreads.length === 0 ? <p className="text-sm leading-6 text-slate-600">No messages are connected to this unit yet.</p> : null}
            </div>
            <ButtonLink href="/landlord/inbox" variant="primary">Open inbox</ButtonLink>
          </Card>

          <Card title="Important contacts" icon={Users} focused={focusFor(activeTab, ["staff-contacts"])}>
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
