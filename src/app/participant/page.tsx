export const dynamic = "force-dynamic";

import Link from "next/link";
import { ApplicationStatus, DocumentCategory, DocumentRequestStatus, InspectionStatus, LeasePacketStatus, SignatureStatus } from "@prisma/client";
import { ClipboardCheck, FileText, Home, MessageSquareText, Search, ShieldCheck, WalletCards } from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null | undefined) {
  if (!date) return "Not set yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "Not set yet";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ParticipantWorkspacePage() {
  const user = await requireUser("/participant");

  const applicationWhere = {
    OR: [
      { applicantUserId: user.userId },
      { applicantEmail: user.email },
      { unit: { tenantUserId: user.userId } }
    ]
  };

  const [applications, tenantUnits, unreadThreads] = await Promise.all([
    prisma.application.findMany({
      where: applicationWhere,
      include: {
        applicationDetail: true,
        unit: { include: { property: true } },
        documentRequests: true,
        inspections: true,
        leasePackets: { include: { signatureRequests: true }, orderBy: { createdAt: "desc" } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.unit.findMany({
      where: { tenantUserId: user.userId, property: { isArchived: false } },
      include: { property: true, currentApplication: { include: { applicationDetail: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.messageThread.count({
      where: {
        OR: [
          { application: applicationWhere },
          { maintenanceRequest: { unit: { tenantUserId: user.userId } } }
        ],
        messages: { some: { senderId: { not: user.userId }, isInternal: false, readByApplicantAt: null } }
      }
    })
  ]);

  const packetCategories: DocumentCategory[] = [DocumentCategory.RFTA, DocumentCategory.UTILITY_ALLOWANCE, DocumentCategory.LANDLORD_DOCUMENT];
  const openDocumentStatuses: DocumentRequestStatus[] = [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED];
  const programApplications = applications.filter((application) =>
    Boolean(application.applicationDetail?.voucherProgram || application.applicationDetail?.voucherAgency || application.unit.voucherFriendly || application.documentRequests.some((request) => packetCategories.includes(request.category)))
  );
  const primaryApplication = programApplications[0] ?? applications[0] ?? null;
  const primaryUnit = tenantUnits[0] ?? primaryApplication?.unit ?? null;
  const openDocuments = applications.flatMap((application) => application.documentRequests).filter((request) => openDocumentStatuses.includes(request.status));
  const rftaItems = applications.flatMap((application) => application.documentRequests).filter((request) => request.category === DocumentCategory.RFTA || request.category === DocumentCategory.LANDLORD_DOCUMENT);
  const inspections = applications.flatMap((application) => application.inspections).sort((a, b) => (b.scheduledFor ?? b.createdAt).getTime() - (a.scheduledFor ?? a.createdAt).getTime());
  const leasePackets = applications.flatMap((application) => application.leasePackets);
  const pendingSignatures = leasePackets.flatMap((packet) => packet.signatureRequests).filter((signature) => signature.signerEmail === user.email && signature.status === SignatureStatus.PENDING).length;
  const hasProgramConnection = programApplications.length > 0 || Boolean(primaryUnit?.voucherFriendly || tenantUnits[0]?.currentApplication?.applicationDetail?.voucherProgram);
  const latestInspection = inspections[0];
  const latestLeasePacket = leasePackets[0];

  return (
    <main className="space-y-5">
      <CommandCenterHeader
        eyebrow="Participant Workspace"
        title="Your Program Status"
        description="Track your paperwork, RFTA-style packet progress, inspection, lease tasks, rent portion, and caseworker messages in plain language."
        actionHref="/applicant/documents"
        actionLabel="Upload paperwork"
        secondaryHref="/marketplace"
        secondaryLabel="Find a home"
        icon={<ShieldCheck className="text-blue-700" size={32} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CommandCenterMetric label="Program cases" value={programApplications.length} detail={hasProgramConnection ? "Connected to assistance workflow" : "No program case connected"} href="#program-status" icon={<ShieldCheck size={20} />} tone={hasProgramConnection ? "blue" : "slate"} />
        <CommandCenterMetric label="Paperwork needed" value={openDocuments.length} detail="Requested or needs correction" href="#paperwork" icon={<FileText size={20} />} tone={openDocuments.length ? "amber" : "green"} />
        <CommandCenterMetric label="RFTA items" value={rftaItems.length} detail="Landlord/program packet items" href="#rfta" icon={<ClipboardCheck size={20} />} tone={rftaItems.length ? "blue" : "slate"} />
        <CommandCenterMetric label="Signatures" value={pendingSignatures} detail="Waiting on your signature" href="#lease" icon={<FileText size={20} />} tone={pendingSignatures ? "amber" : "green"} />
        <CommandCenterMetric label="Messages" value={unreadThreads} detail="Unread case or application threads" href="#messages" icon={<MessageSquareText size={20} />} tone={unreadThreads ? "amber" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <CommandCenterPanel id="program-status" title="What Happens Next" detail="Milestones use participant-facing language. Internal subsidy accounting, staff notes, and landlord packet internals are not shown here.">
          <div className="grid gap-3 md:grid-cols-2">
            <Milestone title="Program or voucher status" detail={hasProgramConnection ? `${primaryApplication?.applicationDetail?.voucherProgram ?? primaryApplication?.applicationDetail?.voucherAgency ?? "Program assistance"} is connected to your housing search.` : "No voucher or program case is connected yet. You can still search homes and complete your profile."} status={hasProgramConnection ? "In progress" : "Not connected"} tone={hasProgramConnection ? "blue" : "slate"} />
            <Milestone title="Find or choose a unit" detail={primaryUnit ? `${primaryUnit.property.name} · Unit ${primaryUnit.unitNumber}` : "Choose a home from the marketplace or continue an existing application."} status={primaryUnit ? "Selected" : "Next step"} tone={primaryUnit ? "green" : "amber"} />
            <Milestone title="Your inspection" detail={latestInspection ? `${label(latestInspection.status)} · ${formatDate(latestInspection.scheduledFor ?? latestInspection.completedAt)}` : "Inspection details will appear here when scheduled."} status={latestInspection ? label(latestInspection.status) : "Not scheduled"} tone={latestInspection?.status === InspectionStatus.FAILED || latestInspection?.status === InspectionStatus.NEEDS_REINSPECTION ? "rose" : latestInspection ? "blue" : "slate"} />
            <Milestone title="Lease and signatures" detail={latestLeasePacket ? `${label(latestLeasePacket.status)} · ${pendingSignatures ? "Your signature is needed." : "No participant signature is currently waiting."}` : "Lease tasks appear after approval or move-in preparation."} status={latestLeasePacket ? label(latestLeasePacket.status) : "Not started"} tone={pendingSignatures ? "amber" : latestLeasePacket?.status === LeasePacketStatus.COMPLETED ? "green" : "slate"} />
          </div>
        </CommandCenterPanel>

        <CommandCenterPanel id="rent-portion" title="Your Rent Portion" detail="This section summarizes renter-safe rent information. It does not expose internal HAP ledgers or staff-only subsidy notes.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard title="Listed rent" value={formatCurrency(primaryUnit?.rentAmount)} detail={primaryUnit ? `${primaryUnit.bedrooms} bed · ${primaryUnit.bathrooms} bath` : "No unit selected"} />
            <InfoCard title="Deposit" value={formatCurrency(primaryUnit?.deposit)} detail="Shown when listed by the landlord" />
            <InfoCard title="Available date" value={formatDate(primaryUnit?.availableOn)} detail="Subject to landlord/program review" />
            <InfoCard title="Assistance status" value={hasProgramConnection ? "Connected" : "Not connected"} detail="General status only" />
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CommandCenterPanel id="paperwork" title="Your Paperwork" detail="Requested documents and correction items are shown with clear next steps.">
          {openDocuments.length ? (
            <div className="space-y-3">
              {openDocuments.slice(0, 6).map((request) => (
                <Milestone key={request.id} title={request.title} detail={request.instructions ?? `Due ${formatDate(request.dueDate)}`} status={label(request.status)} tone={request.status === DocumentRequestStatus.REJECTED ? "rose" : "amber"} />
              ))}
            </div>
          ) : (
            <EmptyState title="No paperwork is waiting on you" detail="When documents are requested or need correction, they will appear here with upload links." actionLabel="Open documents" href="/applicant/documents" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="rfta" title="RFTA Packet" detail="Packet steps are shown as configurable program milestones, not universal PHA requirements.">
          {rftaItems.length ? (
            <div className="space-y-3">
              {rftaItems.slice(0, 6).map((request) => (
                <Milestone key={request.id} title={request.title} detail={request.instructions ?? "Program or landlord packet item"} status={label(request.status)} tone={request.status === DocumentRequestStatus.ACCEPTED ? "green" : "blue"} />
              ))}
            </div>
          ) : (
            <EmptyState title="No RFTA packet items yet" detail="If a landlord or program staff member requests packet items, they will appear here with a plain-language status." actionLabel="Search homes" href="/marketplace" />
          )}
        </CommandCenterPanel>
      </section>

      <CommandCenterSurface>
        <div id="messages" className="grid gap-4 p-4 lg:grid-cols-3">
          <Milestone title="Messages from your caseworker" detail={`${unreadThreads} unread message thread${unreadThreads === 1 ? "" : "s"} need attention.`} status={unreadThreads ? "Reply needed" : "Clear"} tone={unreadThreads ? "amber" : "green"} />
          <Milestone title="Application progress" detail={primaryApplication ? `${primaryApplication.applicantName} · ${label(primaryApplication.status)}` : "Start an application when you find a home that fits."} status={primaryApplication ? label(primaryApplication.status) : "No application"} tone={primaryApplication?.status === ApplicationStatus.APPROVED ? "green" : primaryApplication ? "blue" : "slate"} />
          <Milestone title="Find homes" detail="Voucher-friendly listings can be marked in the marketplace when landlords provide that information." status="Search" tone="blue" />
        </div>
      </CommandCenterSurface>
    </main>
  );
}

function InfoCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function Milestone({ title, detail, status, tone }: { title: string; detail: string; status: string; tone: "slate" | "blue" | "green" | "amber" | "rose" }) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700"
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${classes}`}>{status}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, detail, actionLabel, href }: { title: string; detail: string; actionLabel: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
      <Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
        {actionLabel}
      </Link>
    </div>
  );
}
