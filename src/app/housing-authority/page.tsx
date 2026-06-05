export const dynamic = "force-dynamic";

import Link from "next/link";
import { ApplicationStatus, DocumentCategory, DocumentRequestStatus, InspectionStatus, type Prisma } from "@prisma/client";
import { ClipboardCheck, FileStack, Landmark, Scale, ShieldAlert, UsersRound } from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/role-capabilities.server";

function formatDate(date: Date | null | undefined) {
  if (!date) return "No date set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function HousingAuthorityWorkspacePage() {
  await requireCapability("admin.workflows", "/housing-authority");

  const programApplicationScope: Prisma.ApplicationWhereInput = {
    OR: [
      { applicationDetail: { is: { voucherProgram: { not: null } } } },
      { applicationDetail: { is: { voucherAgency: { not: null } } } },
      { documentRequests: { some: { category: { in: [DocumentCategory.RFTA, DocumentCategory.UTILITY_ALLOWANCE, DocumentCategory.LANDLORD_DOCUMENT] } } } },
      { unit: { voucherFriendly: true } }
    ]
  };
  const activeStatuses = [ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW];
  const actionDocumentStatuses: DocumentRequestStatus[] = [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED, DocumentRequestStatus.SUBMITTED];
  const packetCategories: DocumentCategory[] = [DocumentCategory.RFTA, DocumentCategory.LANDLORD_DOCUMENT, DocumentCategory.UTILITY_ALLOWANCE];
  const activeInspectionStatuses = [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS, InspectionStatus.NEEDS_REINSPECTION, InspectionStatus.FAILED];

  const [
    programCases,
    pendingRfta,
    missingDocuments,
    inspectionQueue,
    affordabilityRequests,
    recentCases,
    rftaRequests,
    inspectionRecords
  ] = await Promise.all([
    prisma.application.count({ where: programApplicationScope }),
    prisma.documentRequest.count({
      where: {
        application: programApplicationScope,
        category: DocumentCategory.RFTA,
        status: { in: actionDocumentStatuses }
      }
    }),
    prisma.documentRequest.count({
      where: {
        application: programApplicationScope,
        status: { in: [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED] }
      }
    }),
    prisma.inspection.count({
      where: {
        application: programApplicationScope,
        status: { in: activeInspectionStatuses }
      }
    }),
    prisma.documentRequest.count({
      where: {
        application: programApplicationScope,
        category: DocumentCategory.UTILITY_ALLOWANCE,
        status: { in: actionDocumentStatuses }
      }
    }),
    prisma.application.findMany({
      where: { ...programApplicationScope, status: { in: activeStatuses } },
      include: {
        applicationDetail: true,
        unit: { include: { property: true } },
        documentRequests: true
      },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.documentRequest.findMany({
      where: {
        application: programApplicationScope,
        category: { in: [DocumentCategory.RFTA, DocumentCategory.LANDLORD_DOCUMENT, DocumentCategory.UTILITY_ALLOWANCE] },
        status: { in: actionDocumentStatuses }
      },
      include: { application: { include: { applicationDetail: true, unit: { include: { property: true } } } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 6
    }),
    prisma.inspection.findMany({
      where: {
        application: programApplicationScope,
        status: { in: activeInspectionStatuses }
      },
      include: { application: true, unit: { include: { property: true } } },
      orderBy: [{ scheduledFor: "asc" }, { updatedAt: "desc" }],
      take: 6
    })
  ]);

  return (
    <main className="space-y-5">
      <CommandCenterHeader
        eyebrow="Program Admin Workspace"
        title="Housing Authority Operations"
        description="A distinct program portal for RFTA review, inspections, subsidy milestones, documents, payment-standard readiness, and program-case exceptions."
        actionHref="#rfta"
        actionLabel="Review RFTAs"
        secondaryHref="#payment-standards"
        secondaryLabel="Payment standards"
        icon={<Landmark className="text-blue-700" size={32} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CommandCenterMetric label="Program cases" value={programCases} detail="Voucher or program-linked records" href="#cases" icon={<UsersRound size={20} />} tone="blue" />
        <CommandCenterMetric label="Pending RFTAs" value={pendingRfta} detail="Packet records needing review" href="#rfta" icon={<FileStack size={20} />} tone={pendingRfta ? "amber" : "green"} />
        <CommandCenterMetric label="Inspections" value={inspectionQueue} detail="Scheduled, failed, or correction" href="#inspections" icon={<ClipboardCheck size={20} />} tone={inspectionQueue ? "rose" : "green"} />
        <CommandCenterMetric label="Missing docs" value={missingDocuments} detail="Requested or rejected items" href="#documents" icon={<ShieldAlert size={20} />} tone={missingDocuments ? "amber" : "green"} />
        <CommandCenterMetric label="Affordability items" value={affordabilityRequests} detail="Utility allowance/payment review" href="#affordability" icon={<Scale size={20} />} tone={affordabilityRequests ? "blue" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <CommandCenterPanel id="cases" title="Program Case Queue" detail="Program-linked records are grouped here without mixing housing-authority work into the normal landlord or admin dashboard." actionHref="#reports" actionLabel="View reports">
          {recentCases.length ? (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {recentCases.map((application) => {
                const packetItems = application.documentRequests.filter((request) => packetCategories.includes(request.category)).length;
                return (
                  <div key={application.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{application.applicantName}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {application.applicationDetail?.voucherProgram ?? application.applicationDetail?.voucherAgency ?? "Program-linked case"} · {application.unit.property.name} Unit {application.unit.unitNumber}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {statusLabel(application.status)} · {packetItems} packet item{packetItems === 1 ? "" : "s"} linked
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/applications/${application.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
                        Open case
                      </Link>
                      <Link href="#rfta" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-900 hover:bg-slate-50">
                        Packet review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No program cases yet" detail="Voucher-friendly units, RFTA packet requests, utility allowance items, and voucher application details will populate this program queue." actionLabel="Review RFTAs" href="#rfta" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="payment-standards" title="Payment Standards & Utility Allowances" detail="This workspace keeps payment standards, utility allowances, and affordability review visible without fetching live HUD/FMR data." badge="Manual/imported">
          <div className="grid gap-3 sm:grid-cols-2">
            <QueueItem title="Payment standards" detail="Schedules should be managed as manually entered or imported records before live provider integrations are introduced." status="Setup" tone="blue" />
            <QueueItem title="Utility allowances" detail={`${affordabilityRequests} allowance-linked document item${affordabilityRequests === 1 ? "" : "s"} are currently tied to program cases.`} status="Linked" tone={affordabilityRequests ? "amber" : "slate"} />
            <QueueItem title="Affordability review" detail="Contract rent, allowance, gross rent, and payment standard results should be shown as saved review snapshots." status="Audit-ready" tone="green" />
            <QueueItem title="Program rules" detail="Packet and affordability requirements remain configurable; this page does not hardcode one PHA requirement set." status="Configurable" tone="slate" />
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CommandCenterPanel id="rfta" title="RFTA & Packet Review" detail="RFTA, landlord documents, and utility allowance items are separated from generic document uploads so packet work is easier to triage.">
          {rftaRequests.length ? (
            <div className="space-y-3">
              {rftaRequests.map((request) => (
                <QueueItem
                  key={request.id}
                  title={request.title}
                  detail={`${request.application.applicantName} · ${request.application.unit.property.name} Unit ${request.application.unit.unitNumber} · Due ${formatDate(request.dueDate)}`}
                  status={`${statusLabel(request.category)} · ${statusLabel(request.status)}`}
                  tone={request.status === DocumentRequestStatus.REJECTED ? "rose" : "amber"}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No packet items need review" detail="RFTA requests, landlord packet documents, and utility allowance items will appear here when they need program action." actionLabel="Open cases" href="#cases" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="inspections" title="Inspection Operations" detail="Program inspection records are grouped with status, scheduled date, unit, and related participant.">
          {inspectionRecords.length ? (
            <div className="space-y-3">
              {inspectionRecords.map((inspection) => (
                <QueueItem
                  key={inspection.id}
                  title={`${inspection.unit.property.name} · Unit ${inspection.unit.unitNumber}`}
                  detail={`${inspection.application?.applicantName ?? "No applicant linked"} · ${formatDate(inspection.scheduledFor)} · ${inspection.resultSummary ?? "No inspection summary yet"}`}
                  status={statusLabel(inspection.status)}
                  tone={inspection.status === InspectionStatus.FAILED || inspection.status === InspectionStatus.NEEDS_REINSPECTION ? "rose" : "blue"}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No inspections need action" detail="Scheduled inspections, failed inspection corrections, and reinspection work will appear here." actionLabel="Review cases" href="#cases" />
          )}
        </CommandCenterPanel>
      </section>

      <CommandCenterSurface>
        <div className="grid gap-4 p-4 lg:grid-cols-4">
          <QueueItem title="HAP/Subsidy" detail="Operational staff can review expected/received/held subsidy summaries when records are linked; participants only see plain-language assistance status." status="Role-scoped" tone="blue" />
          <QueueItem title="Documents" detail={`${missingDocuments} document item${missingDocuments === 1 ? "" : "s"} are currently open or need correction across program cases.`} status="Tracked" tone={missingDocuments ? "amber" : "green"} />
          <QueueItem title="Reports" detail="Program reporting should drill into cases, RFTAs, inspections, documents, and affordability snapshots without exposing landlord-only notes." status="Admin" tone="slate" />
          <QueueItem title="Messages" detail="Caseworker and program conversations remain attached to their related application, unit, maintenance, or inspection record." status="Contextual" tone="green" />
        </div>
      </CommandCenterSurface>
    </main>
  );
}

function QueueItem({ title, detail, status, tone = "slate" }: { title: string; detail: string; status?: string; tone?: "slate" | "blue" | "green" | "amber" | "rose" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100"
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
        {status ? <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${toneClass}`}>{status}</span> : null}
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
