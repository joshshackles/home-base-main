export const dynamic = "force-dynamic";

import Link from "next/link";
import { ApplicationStatus, DocumentRequestStatus, InspectionStatus, type Prisma } from "@prisma/client";
import { ClipboardCheck, FileWarning, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";
import { CommandCenterHeader, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

function formatDate(date: Date | null | undefined) {
  if (!date) return "No date set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CaseworkerWorkspacePage() {
  const { user } = await requireWorkspaceAccess("caseworker", "/caseworker");

  const assignedUnitScope: Prisma.UnitWhereInput = {
    caseworkerUserId: user.userId,
    property: { isArchived: false }
  };
  const applicationScope: Prisma.ApplicationWhereInput = { unit: assignedUnitScope };
  const activeApplicationStatuses = [ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW];
  const actionDocumentStatuses: DocumentRequestStatus[] = [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED];
  const activeInspectionStatuses = [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS, InspectionStatus.NEEDS_REINSPECTION, InspectionStatus.FAILED];

  const [
    assignedUnits,
    activeCases,
    missingDocuments,
    inspectionsNeedingWork,
    unreadThreads,
    recentCases,
    recentDocumentRequests,
    upcomingInspections
  ] = await Promise.all([
    prisma.unit.count({ where: assignedUnitScope }),
    prisma.application.count({ where: { ...applicationScope, status: { in: activeApplicationStatuses } } }),
    prisma.documentRequest.count({
      where: {
        application: applicationScope,
        status: { in: actionDocumentStatuses }
      }
    }),
    prisma.inspection.count({
      where: {
        unit: assignedUnitScope,
        status: { in: activeInspectionStatuses }
      }
    }),
    prisma.messageThread.count({
      where: {
        OR: [{ application: applicationScope }, { maintenanceRequest: { unit: assignedUnitScope } }],
        messages: { some: { senderId: { not: user.userId }, isInternal: false, readByStaffAt: null } }
      }
    }),
    prisma.application.findMany({
      where: applicationScope,
      include: {
        unit: { include: { property: true } },
        documentRequests: true,
        messageThreads: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.documentRequest.findMany({
      where: {
        application: applicationScope,
        status: { in: actionDocumentStatuses }
      },
      include: { application: { include: { unit: { include: { property: true } } } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 5
    }),
    prisma.inspection.findMany({
      where: {
        unit: assignedUnitScope,
        status: { in: activeInspectionStatuses }
      },
      include: { unit: { include: { property: true } }, application: true },
      orderBy: [{ scheduledFor: "asc" }, { updatedAt: "desc" }],
      take: 5
    })
  ]);

  return (
    <main className="space-y-5">
      <CommandCenterHeader
        eyebrow="Caseworker Workspace"
        title="Participant Case Queue"
        description="Triage assigned households, missing documents, RFTA-style packet work, inspections, subsidy touchpoints, and participant messages from one guided workspace."
        actionHref="#cases"
        actionLabel="Review cases"
        secondaryHref="#documents"
        secondaryLabel="Missing documents"
        icon={<UsersRound className="text-blue-700" size={32} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CommandCenterMetric label="Assigned units" value={assignedUnits} detail="Scoped to your casework" href="#cases" icon={<ShieldCheck size={20} />} tone="blue" />
        <CommandCenterMetric label="Active cases" value={activeCases} detail="Started, submitted, or review" href="#cases" icon={<UsersRound size={20} />} tone="slate" />
        <CommandCenterMetric label="Missing documents" value={missingDocuments} detail="Requested or needs correction" href="#documents" icon={<FileWarning size={20} />} tone={missingDocuments ? "amber" : "green"} />
        <CommandCenterMetric label="Inspection work" value={inspectionsNeedingWork} detail="Scheduled, failed, or reinspection" href="#inspections" icon={<ClipboardCheck size={20} />} tone={inspectionsNeedingWork ? "rose" : "green"} />
        <CommandCenterMetric label="Unread messages" value={unreadThreads} detail="Participant or workflow threads" href="#messages" icon={<MessageSquareText size={20} />} tone={unreadThreads ? "amber" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <CommandCenterPanel id="cases" title="Assigned Cases" detail="Program cases are shown through the applicant/unit records currently assigned to your caseworker queue." actionHref="/caseworker#cases" actionLabel="Open queue">
          {recentCases.length ? (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {recentCases.map((application) => {
                const missingCount = application.documentRequests.filter((request) => actionDocumentStatuses.includes(request.status)).length;
                const lastMessage = application.messageThreads.flatMap((thread) => thread.messages).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                return (
                  <div key={application.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{application.applicantName}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {application.unit.property.name} · Unit {application.unit.unitNumber} · {statusLabel(application.status)}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {missingCount ? `${missingCount} document item${missingCount === 1 ? "" : "s"} need attention` : "Document packet has no open correction requests"}
                        {lastMessage ? ` · Last message ${formatDate(lastMessage.createdAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/applications/${application.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
                        Review case
                      </Link>
                      <Link href="#messages" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-900 hover:bg-slate-50">
                        Message
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No assigned cases yet" detail="Assigned participant cases will appear here when a unit or application is connected to your caseworker profile." actionLabel="View referrals" href="#referrals" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="rfta" title="Guided RFTA & Packet Work" detail="Use this queue for packet gaps, landlord follow-up, and inspection readiness. Requirements stay configurable by program." badge="Workflow">
          <div className="space-y-3">
            <QueueItem title="Review missing packet items" detail={`${missingDocuments} document request${missingDocuments === 1 ? "" : "s"} need caseworker follow-up.`} tone={missingDocuments ? "amber" : "green"} />
            <QueueItem title="Prepare for inspection" detail={`${inspectionsNeedingWork} assigned inspection record${inspectionsNeedingWork === 1 ? "" : "s"} need scheduling, review, or correction tracking.`} tone={inspectionsNeedingWork ? "rose" : "green"} />
            <QueueItem title="Keep participant communication visible" detail={`${unreadThreads} unread thread${unreadThreads === 1 ? "" : "s"} are tied to your scoped cases.`} tone={unreadThreads ? "amber" : "slate"} />
          </div>
        </CommandCenterPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CommandCenterPanel id="documents" title="Missing Documents" detail="Document requests are grouped by participant and unit so caseworkers can request, review, or correct without hunting through files.">
          {recentDocumentRequests.length ? (
            <div className="space-y-3">
              {recentDocumentRequests.map((request) => (
                <QueueItem
                  key={request.id}
                  title={request.title}
                  detail={`${request.application.applicantName} · ${request.application.unit.property.name} Unit ${request.application.unit.unitNumber} · Due ${formatDate(request.dueDate)}`}
                  status={statusLabel(request.status)}
                  tone={request.status === DocumentRequestStatus.REJECTED ? "rose" : "amber"}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No missing documents" detail="When participants or landlords owe documents, those requests will appear here with due dates and correction status." actionLabel="Review cases" href="#cases" />
          )}
        </CommandCenterPanel>

        <CommandCenterPanel id="inspections" title="Inspection Queue" detail="Scheduled, failed, and reinspection work tied to your assigned units appears here.">
          {upcomingInspections.length ? (
            <div className="space-y-3">
              {upcomingInspections.map((inspection) => (
                <QueueItem
                  key={inspection.id}
                  title={`${inspection.unit.property.name} · Unit ${inspection.unit.unitNumber}`}
                  detail={`${inspection.application?.applicantName ?? "No applicant linked"} · ${formatDate(inspection.scheduledFor)} · ${inspection.resultSummary ?? "No result summary yet"}`}
                  status={statusLabel(inspection.status)}
                  tone={inspection.status === InspectionStatus.FAILED || inspection.status === InspectionStatus.NEEDS_REINSPECTION ? "rose" : "blue"}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No inspections need action" detail="Inspection scheduling, failed items, and correction follow-up will appear here when records are linked to assigned units." actionLabel="Review cases" href="#cases" />
          )}
        </CommandCenterPanel>
      </section>

      <CommandCenterSurface>
        <div id="messages" className="grid gap-4 p-4 lg:grid-cols-3">
          <QueueItem title="Messages" detail="Use the global inbox or case-linked threads to keep participant, landlord, and inspection conversations attached to the correct record." status={`${unreadThreads} unread`} tone={unreadThreads ? "amber" : "green"} />
          <QueueItem title="Subsidy status" detail="Subsidy/HAP summaries should remain role-scoped. Participants get plain-language status; staff get operational exceptions." status="Scoped view" tone="blue" />
          <QueueItem title="Referrals" detail="Referral and waitlist queues are intentionally linked from this workspace without replacing existing program workflows." status="Connected" tone="slate" />
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
