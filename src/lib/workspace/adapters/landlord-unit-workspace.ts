import type { AccountAccessType } from "@prisma/client";
import type { PlatformActor } from "@/lib/platform/types";
import type { LandlordUnitWorkspaceModel } from "@/lib/platform/unit-workspace";
import { bindWorkspaceCommandsToActions } from "@/lib/workspace/action-bindings";
import { createWorkspaceEvent } from "@/lib/workspace/event-registry";
import { buildOperationalCanvasModel } from "@/lib/workspace/operational-canvas";
import { resolveWorkspaceContext } from "@/lib/workspace/context-resolver";
import type { WorkspaceBoundCommandAction } from "@/lib/workspace/action-bindings";
import type { WorkspaceOperationalCanvasModel } from "@/lib/workspace/operational-canvas";
import type { WorkspaceCommand, WorkspaceEvent, WorkspaceMode, WorkspaceResolvedModel } from "@/lib/workspace/types";

export type LandlordUnitWorkspaceTabKey =
  | "listing"
  | "leads-applications"
  | "tenant"
  | "lease"
  | "ledger"
  | "maintenance"
  | "inspections"
  | "documents"
  | "timeline"
  | "staff-contacts";

type UnitWorkspace = NonNullable<LandlordUnitWorkspaceModel>;

export type LandlordUnitWorkspaceEngineModel = WorkspaceResolvedModel & {
  commandActions: WorkspaceBoundCommandAction[];
  operationalCanvas: WorkspaceOperationalCanvasModel;
};

export function landlordUnitWorkspaceTabToMode(tab: LandlordUnitWorkspaceTabKey): WorkspaceMode {
  const modeByTab: Record<LandlordUnitWorkspaceTabKey, WorkspaceMode> = {
    listing: "leasing",
    "leads-applications": "leasing",
    tenant: "resident",
    lease: "resident",
    ledger: "financial",
    maintenance: "maintenance",
    inspections: "inspection",
    documents: "documents",
    timeline: "overview",
    "staff-contacts": "communication"
  };

  return modeByTab[tab];
}

export function resolveLandlordUnitWorkspaceEngine(input: {
  actor: PlatformActor;
  workspace: UnitWorkspace;
  activeTab: LandlordUnitWorkspaceTabKey;
  approvedAccessTypes?: AccountAccessType[];
}): LandlordUnitWorkspaceEngineModel {
  const engine = resolveWorkspaceContext({
    actor: input.actor,
    approvedAccessTypes: input.approvedAccessTypes,
    entity: { type: "unit", id: input.workspace.unit.id },
    requestedMode: landlordUnitWorkspaceTabToMode(input.activeTab),
    surface: "web",
    device: "desktop",
    audience: "landlord",
    includeSensitiveActivity: true,
    activityLimit: 8,
    events: buildLandlordUnitWorkspaceEvents(input.workspace)
  });

  return {
    ...engine,
    operationalCanvas: buildOperationalCanvasModel({ workspace: engine }),
    commandActions: bindWorkspaceCommandsToActions({
      commands: engine.commands,
      entity: engine.context.entity,
      mode: engine.context.resolvedMode,
      context: engine.context,
      canAccess: engine.canAccess,
      routeForCommand: ({ command }) => getLandlordUnitWorkspaceCommandHref(input.workspace, command),
      limit: 6
    })
  };
}

export function getLandlordUnitWorkspaceCommandHref(workspace: UnitWorkspace, command: WorkspaceCommand): string | undefined {
  const unitId = workspace.unit.id;
  const latestLead = workspace.unit.leads[0]?.id;
  const latestApplication = workspace.unit.applications[0]?.id;
  const latestLease = workspace.leasePackets[0]?.id;
  const latestMaintenance = workspace.maintenanceRequests[0]?.id;
  const latestInspection = workspace.inspections[0]?.id;
  const latestDocument = workspace.documents[0]?.id;
  const latestMessageThread = workspace.messageThreads[0]?.id;

  const hrefByCommand: Record<string, string | undefined> = {
    "unit.editListing": `/landlord/units/${unitId}/edit?section=listing`,
    "unit.reviewApplication": latestApplication ? `/landlord/applications/${latestApplication}` : `/landlord/units/${unitId}?tab=leads-applications`,
    "unit.messageResident": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : `/landlord/units/${unitId}?tab=staff-contacts`,
    "unit.recordPayment": `/landlord/units/${unitId}?tab=ledger`,
    "unit.createWorkOrder": `/landlord/units/${unitId}?tab=maintenance`,
    "unit.scheduleInspection": `/landlord/units/${unitId}?tab=inspections`,
    "unit.uploadDocument": `/landlord/units/${unitId}?tab=documents`,
    "lead.reply": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : latestLead ? `/landlord/leads/${latestLead}` : `/landlord/units/${unitId}?tab=leads-applications`,
    "lead.scheduleTour": latestLead ? `/landlord/leads/${latestLead}?action=schedule-tour` : `/landlord/units/${unitId}?tab=leads-applications`,
    "lead.inviteToApply": latestLead ? `/landlord/leads/${latestLead}?action=invite-to-apply` : `/landlord/units/${unitId}?tab=leads-applications`,
    "application.approve": latestApplication ? `/landlord/applications/${latestApplication}` : `/landlord/units/${unitId}?tab=leads-applications`,
    "application.requestUpdate": latestApplication ? `/landlord/applications/${latestApplication}` : `/landlord/units/${unitId}?tab=leads-applications`,
    "application.deny": latestApplication ? `/landlord/applications/${latestApplication}` : `/landlord/units/${unitId}?tab=leads-applications`,
    "lease.sendForSignature": latestLease ? `/landlord/leases/${latestLease}` : `/landlord/units/${unitId}?tab=lease`,
    "lease.downloadPdf": latestLease ? `/landlord/leases/${latestLease}` : `/landlord/units/${unitId}?tab=lease`,
    "ledger.recordPayment": `/landlord/units/${unitId}?tab=ledger`,
    "ledger.addCharge": `/landlord/units/${unitId}?tab=ledger`,
    "ledger.issueCredit": `/landlord/units/${unitId}?tab=ledger`,
    "ledger.export": `/landlord/units/${unitId}?tab=ledger`,
    "maintenance.assign": latestMaintenance ? `/landlord/maintenance?request=${latestMaintenance}` : `/landlord/units/${unitId}?tab=maintenance`,
    "maintenance.messageTenant": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : `/landlord/units/${unitId}?tab=maintenance`,
    "maintenance.createWorkOrder": latestMaintenance ? `/landlord/maintenance?request=${latestMaintenance}` : `/landlord/units/${unitId}?tab=maintenance`,
    "maintenance.close": latestMaintenance ? `/landlord/maintenance?request=${latestMaintenance}` : `/landlord/units/${unitId}?tab=maintenance`,
    "inspection.recordResults": latestInspection ? `/landlord/inspections/${latestInspection}` : `/landlord/units/${unitId}?tab=inspections`,
    "inspection.scheduleReinspection": latestInspection ? `/landlord/inspections/${latestInspection}` : `/landlord/units/${unitId}?tab=inspections`,
    "inspection.uploadReport": latestInspection ? `/landlord/inspections/${latestInspection}` : `/landlord/units/${unitId}?tab=inspections`,
    "document.download": latestDocument ? `/landlord/documents?document=${latestDocument}` : `/landlord/units/${unitId}?tab=documents`,
    "document.share": latestDocument ? `/landlord/documents?document=${latestDocument}` : `/landlord/units/${unitId}?tab=documents`,
    "document.revoke": latestDocument ? `/landlord/documents?document=${latestDocument}` : `/landlord/units/${unitId}?tab=documents`,
    "message.reply": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : `/landlord/units/${unitId}?tab=staff-contacts`,
    "message.assign": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : `/landlord/units/${unitId}?tab=staff-contacts`,
    "message.markResolved": latestMessageThread ? `/landlord/inbox?thread=${latestMessageThread}` : `/landlord/units/${unitId}?tab=staff-contacts`
  };

  return hrefByCommand[command.key];
}

export function buildLandlordUnitWorkspaceEvents(workspace: UnitWorkspace): WorkspaceEvent[] {
  const unitRef = { type: "unit" as const, id: workspace.unit.id };
  const events: WorkspaceEvent[] = [];

  events.push(createWorkspaceEvent({
    type: workspace.unit.marketingStatus === "ACTIVE" ? "listing.published" : "listing.updated",
    entity: unitRef,
    occurredAt: workspace.unit.updatedAt,
    title: workspace.unit.marketingStatus === "ACTIVE" ? "Listing is active" : "Listing needs review",
    detail: `${workspace.unit.property.name} #${workspace.unit.unitNumber} is ${workspace.unit.marketingStatus.toLowerCase().replaceAll("_", " ")}.`
  }));

  for (const lead of workspace.unit.leads.slice(0, 8)) {
    events.push(createWorkspaceEvent({
      type: "lead.created",
      entity: { type: "lead", id: lead.id },
      relatedEntities: [unitRef],
      occurredAt: lead.createdAt,
      title: `Lead created: ${lead.name}`,
      detail: lead.message ?? `${lead.email} is interested in this unit.`
    }));
  }

  for (const application of workspace.unit.applications.slice(0, 8)) {
    const type = application.status === "APPROVED"
      ? "application.approved"
      : application.status === "DENIED"
        ? "application.denied"
        : application.status === "SUBMITTED" || application.status === "UNDER_REVIEW"
          ? "application.submitted"
          : "application.updated";

    events.push(createWorkspaceEvent({
      type,
      entity: { type: "application", id: application.id },
      relatedEntities: [unitRef],
      occurredAt: application.updatedAt,
      title: `Application ${application.status.toLowerCase().replaceAll("_", " ")}: ${application.applicantName}`,
      detail: `${application.applicantEmail} is connected to this unit application.`
    }));
  }

  for (const lease of workspace.leasePackets.slice(0, 6)) {
    events.push(createWorkspaceEvent({
      type: lease.status === "COMPLETED" ? "lease.signed" : lease.sentForSignatureAt ? "lease.sent_for_signature" : "lease.generated",
      entity: { type: "lease", id: lease.id },
      relatedEntities: [unitRef],
      occurredAt: lease.completedAt ?? lease.sentForSignatureAt ?? lease.createdAt,
      title: `Lease ${lease.status.toLowerCase().replaceAll("_", " ")}`,
      detail: `${lease.template.name} for ${lease.application.applicantName}.`
    }));
  }

  for (const entry of workspace.ledgerEntries.slice(0, 8)) {
    const isPayment = entry.type === "PAYMENT" || entry.type === "CREDIT";
    events.push(createWorkspaceEvent({
      type: isPayment ? "payment.posted" : "ledger.adjusted",
      entity: isPayment ? { type: "payment", id: entry.id } : { type: "ledger", id: entry.id },
      relatedEntities: [unitRef],
      occurredAt: entry.postedAt ?? entry.createdAt,
      title: isPayment ? "Payment or credit posted" : "Ledger entry posted",
      detail: entry.description
    }));
  }

  for (const request of workspace.maintenanceRequests.slice(0, 8)) {
    events.push(createWorkspaceEvent({
      type: request.status === "COMPLETED" ? "work_order.completed" : request.assignedTo ? "maintenance.assigned" : "maintenance.created",
      entity: { type: "maintenance_request", id: request.id },
      relatedEntities: [unitRef],
      occurredAt: request.createdAt,
      title: `Maintenance: ${request.subject}`,
      detail: `${request.status.toLowerCase().replaceAll("_", " ")} priority ${request.priority.toLowerCase().replaceAll("_", " ")}.`
    }));
  }

  for (const inspection of workspace.inspections.slice(0, 6)) {
    const status = String(inspection.status);
    events.push(createWorkspaceEvent({
      type: status === "FAILED" || status === "NEEDS_REINSPECTION" ? "inspection.failed" : status === "PASSED" || status === "COMPLETED" ? "inspection.completed" : "inspection.scheduled",
      entity: { type: "inspection", id: inspection.id },
      relatedEntities: [unitRef],
      occurredAt: inspection.scheduledFor ?? inspection.createdAt,
      title: `Inspection ${status.toLowerCase().replaceAll("_", " ")}`,
      detail: inspection.inspectorName ?? inspection.assignedTo?.name ?? inspection.assignedTo?.email ?? "Inspection is connected to this unit."
    }));
  }

  for (const document of workspace.documents.slice(0, 8)) {
    events.push(createWorkspaceEvent({
      type: "document.uploaded",
      entity: { type: "document", id: document.id },
      relatedEntities: [unitRef],
      occurredAt: document.createdAt,
      title: `Document uploaded: ${document.title}`,
      detail: `${document.category.toLowerCase().replaceAll("_", " ")} document in ${document.status.toLowerCase().replaceAll("_", " ")} status.`
    }));
  }

  for (const thread of workspace.messageThreads.slice(0, 6)) {
    events.push(createWorkspaceEvent({
      type: "message.received",
      entity: { type: "message_thread", id: thread.id },
      relatedEntities: [unitRef],
      occurredAt: thread.lastMessageAt ?? thread.createdAt,
      title: `Message thread: ${thread.subject}`,
      detail: thread.messages[0]?.body ?? "Conversation activity is connected to this unit."
    }));
  }

  return events;
}
