import type {
  WorkspaceCommand,
  WorkspaceCommandCategory,
  WorkspaceDeviceProfile,
  WorkspaceMode,
  WorkspaceModeDefinition,
  WorkspacePanelDefinition,
  WorkspacePanelKind,
  WorkspaceSurface,
  WorkspaceWidgetDefinition,
  WorkspaceWidgetKind
} from "@/lib/workspace/types";

type ModeOptions = {
  mode: WorkspaceMode;
  label: string;
  description: string;
  primaryIntent: string;
  preferredSurfaces?: WorkspaceSurface[];
  preferredDevices?: WorkspaceDeviceProfile[];
  emphasizedWidgetKinds?: WorkspaceWidgetKind[];
  emphasizedCommandCategories?: WorkspaceCommandCategory[];
  emphasizedPanelKinds?: WorkspacePanelKind[];
  priorityWidgetKeys?: string[];
  priorityCommandKeys?: string[];
  priorityPanelKeys?: string[];
  compact?: boolean;
};

const mode = (options: ModeOptions): WorkspaceModeDefinition => ({
  mode: options.mode,
  label: options.label,
  description: options.description,
  primaryIntent: options.primaryIntent,
  preferredSurfaces: options.preferredSurfaces ?? ["web", "admin"],
  preferredDevices: options.preferredDevices ?? ["desktop", "tablet"],
  emphasizedWidgetKinds: options.emphasizedWidgetKinds ?? ["summary", "metric", "timeline"],
  emphasizedCommandCategories: options.emphasizedCommandCategories ?? ["navigation", "workflow"],
  emphasizedPanelKinds: options.emphasizedPanelKinds ?? ["drawer", "inspector"],
  priorityWidgetKeys: options.priorityWidgetKeys,
  priorityCommandKeys: options.priorityCommandKeys,
  priorityPanelKeys: options.priorityPanelKeys,
  compact: options.compact ?? false
});

export const workspaceModeRegistry = {
  overview: mode({
    mode: "overview",
    label: "Overview",
    description: "Balanced operational summary for the selected entity.",
    primaryIntent: "Give the user enough context to understand status and choose the next workflow.",
    emphasizedWidgetKinds: ["summary", "metric", "timeline"],
    emphasizedCommandCategories: ["navigation", "workflow", "communication"],
    emphasizedPanelKinds: ["drawer", "inspector"],
    priorityWidgetKeys: ["unit.summary", "property.summary", "programCase.summary", "organization.summary", "activity.stream"],
    priorityCommandKeys: ["property.openInventory", "ownerStatement.view"],
    priorityPanelKeys: ["timeline.detailDrawer", "message.threadDock"]
  }),
  leasing: mode({
    mode: "leasing",
    label: "Leasing",
    description: "Lead, showing, listing, application, screening, and lease-up work.",
    primaryIntent: "Move prospects from inquiry to application approval and lease handoff.",
    emphasizedWidgetKinds: ["board", "summary", "table", "message", "approval"],
    emphasizedCommandCategories: ["workflow", "communication", "document"],
    emphasizedPanelKinds: ["drawer", "inspector", "modal"],
    priorityWidgetKeys: ["listing.status", "leasing.pipeline", "lead.card", "application.summary", "decision.panel", "screening.status"],
    priorityCommandKeys: ["unit.editListing", "lead.reply", "lead.scheduleTour", "lead.inviteToApply", "application.approve"],
    priorityPanelKeys: ["lead.detailInspector", "showing.scheduler", "application.reviewDrawer"]
  }),
  resident: mode({
    mode: "resident",
    label: "Resident",
    description: "Tenant, household, lease, documents, payments, service, and resident communication work.",
    primaryIntent: "Manage the resident relationship and tenancy lifecycle.",
    emphasizedWidgetKinds: ["summary", "metric", "message", "table"],
    emphasizedCommandCategories: ["communication", "financial", "document", "maintenance"],
    emphasizedPanelKinds: ["drawer", "dock", "inspector"],
    priorityWidgetKeys: ["resident.profile", "resident.status", "lease.status", "payment.summary", "maintenance.history", "document.wallet"],
    priorityCommandKeys: ["tenant.message", "tenant.viewPayments", "tenant.requestRepair", "unit.messageResident"],
    priorityPanelKeys: ["resident.profileDrawer", "lease.packetDrawer", "message.threadDock"]
  }),
  financial: mode({
    mode: "financial",
    label: "Financial",
    description: "Ledger, payment, owner statement, subsidy, invoice, reconciliation, and audit-safe financial work.",
    primaryIntent: "Review financial status and perform controlled financial actions with audit evidence.",
    emphasizedWidgetKinds: ["metric", "summary", "table", "approval"],
    emphasizedCommandCategories: ["financial", "document", "admin"],
    emphasizedPanelKinds: ["inspector", "modal", "drawer"],
    priorityWidgetKeys: ["ledger.summary", "transaction.table", "payment.summary", "subsidy.summary", "ownerStatement.summary", "vendorInvoice.summary"],
    priorityCommandKeys: ["ledger.recordPayment", "ledger.addCharge", "ledger.issueCredit", "ledger.export", "payment.reconcile"],
    priorityPanelKeys: ["ledger.transactionInspector", "financial.actionModal", "program.subsidyInspector", "owner.statementDrawer"]
  }),
  maintenance: mode({
    mode: "maintenance",
    label: "Maintenance",
    description: "Repair request, work order, dispatch, vendor, estimate, invoice, media, and completion work.",
    primaryIntent: "Triage, assign, schedule, document, and close maintenance work.",
    emphasizedWidgetKinds: ["summary", "table", "media", "approval", "message"],
    emphasizedCommandCategories: ["maintenance", "communication", "financial"],
    emphasizedPanelKinds: ["drawer", "bottom_sheet", "dock"],
    priorityWidgetKeys: ["maintenance.queue", "maintenance.issueSummary", "workOrder.summary", "workOrder.status", "vendor.assignment", "invoice.status"],
    priorityCommandKeys: ["unit.createWorkOrder", "maintenance.assign", "workOrder.schedule", "workOrder.markComplete"],
    priorityPanelKeys: ["workOrder.dispatchDrawer", "maintenance.mediaBottomSheet", "vendor.invoiceDrawer", "message.threadDock"]
  }),
  inspection: mode({
    mode: "inspection",
    label: "Inspection",
    description: "Inspection scheduling, checklist, evidence, report, correction, and reinspection work.",
    primaryIntent: "Complete inspections and turn failed items into trackable corrective work.",
    emphasizedWidgetKinds: ["inspector", "summary", "media", "table", "document_preview"],
    emphasizedCommandCategories: ["inspection", "maintenance", "document"],
    emphasizedPanelKinds: ["split_pane", "drawer", "bottom_sheet"],
    priorityWidgetKeys: ["inspection.summary", "inspection.checklist", "inspection.evidence", "correction.queue", "inspection.report"],
    priorityCommandKeys: ["inspection.start", "inspection.recordResults", "inspection.scheduleReinspection", "inspection.uploadReport"],
    priorityPanelKeys: ["inspection.checklistSplitPane", "inspection.correctionDrawer", "document.previewDrawer"]
  }),
  documents: mode({
    mode: "documents",
    label: "Documents",
    description: "Document center, sharing, signatures, previews, revocation, and timeline work.",
    primaryIntent: "Find, review, share, revoke, sign, download, and audit documents safely.",
    emphasizedWidgetKinds: ["document_preview", "table", "timeline", "approval"],
    emphasizedCommandCategories: ["document", "workflow"],
    emphasizedPanelKinds: ["drawer", "modal"],
    priorityWidgetKeys: ["document.preview", "document.sharing", "signature.status", "document.timeline", "document.wallet"],
    priorityCommandKeys: ["document.download", "document.share", "document.revoke", "document.sendForSignature"],
    priorityPanelKeys: ["document.previewDrawer", "lease.packetDrawer"]
  }),
  communication: mode({
    mode: "communication",
    label: "Communication",
    description: "Conversation, assignment, triage, linked entity context, and quick response work.",
    primaryIntent: "Resolve messages while preserving the operational context behind the conversation.",
    emphasizedWidgetKinds: ["message", "summary", "timeline"],
    emphasizedCommandCategories: ["communication", "workflow"],
    emphasizedPanelKinds: ["dock", "drawer", "inspector"],
    priorityWidgetKeys: ["message.thread", "entity.context", "conversation.actions"],
    priorityCommandKeys: ["message.reply", "message.assign", "message.markResolved"],
    priorityPanelKeys: ["message.threadDock", "lead.detailInspector", "timeline.detailDrawer"]
  }),
  executive: mode({
    mode: "executive",
    label: "Executive",
    description: "Portfolio, owner, organization, risk, performance, statement, and high-level operational views.",
    primaryIntent: "Summarize performance and expose only high-confidence drilldowns for leaders and owners.",
    emphasizedWidgetKinds: ["metric", "summary", "timeline", "table"],
    emphasizedCommandCategories: ["navigation", "financial", "document"],
    emphasizedPanelKinds: ["drawer", "inspector"],
    priorityWidgetKeys: ["portfolio.metrics", "financial.rollup", "occupancy.metrics", "ownerStatement.summary", "organization.summary"],
    priorityCommandKeys: ["organization.openReports", "ownerStatement.view", "ownerStatement.download"],
    priorityPanelKeys: ["owner.statementDrawer", "admin.auditInspector"]
  }),
  compliance: mode({
    mode: "compliance",
    label: "Compliance",
    description: "Program case, RFTA, voucher, HAP, certification, audit, document, and inspection compliance work.",
    primaryIntent: "Move regulated workflows forward while preserving evidence and access boundaries.",
    emphasizedWidgetKinds: ["summary", "table", "approval", "document_preview", "timeline"],
    emphasizedCommandCategories: ["workflow", "document", "inspection", "admin"],
    emphasizedPanelKinds: ["drawer", "inspector", "split_pane"],
    priorityWidgetKeys: ["programCase.summary", "rfta.status", "voucher.status", "hap.summary", "certification.summary", "document.requests"],
    priorityCommandKeys: ["programCase.reviewRfta", "programCase.requestDocument", "programCase.scheduleInspection", "certification.review"],
    priorityPanelKeys: ["program.rftaPacketDrawer", "program.subsidyInspector", "certification.reviewDrawer", "admin.auditInspector"]
  }),
  mobile_field: mode({
    mode: "mobile_field",
    label: "Mobile field",
    description: "Action-first mobile mode for vendors, inspectors, and field staff.",
    primaryIntent: "Help field users complete the next physical task quickly with camera-ready controls.",
    preferredSurfaces: ["mobile", "vendor", "web"],
    preferredDevices: ["mobile", "tablet"],
    emphasizedWidgetKinds: ["summary", "media", "inspector", "form", "message"],
    emphasizedCommandCategories: ["maintenance", "inspection", "communication", "document"],
    emphasizedPanelKinds: ["bottom_sheet", "split_pane", "drawer"],
    priorityWidgetKeys: ["workOrder.summary", "workOrder.media", "inspection.checklist", "inspection.evidence", "maintenance.issueSummary"],
    priorityCommandKeys: ["workOrder.accept", "workOrder.schedule", "workOrder.markComplete", "inspection.recordResults"],
    priorityPanelKeys: ["maintenance.mediaBottomSheet", "inspection.checklistSplitPane", "message.threadDock"],
    compact: true
  })
} satisfies Record<WorkspaceMode, WorkspaceModeDefinition>;

export const workspaceModes = Object.keys(workspaceModeRegistry) as WorkspaceMode[];

export function getWorkspaceModeDefinition(mode: WorkspaceMode): WorkspaceModeDefinition {
  return workspaceModeRegistry[mode];
}

export function rankWorkspaceWidgetsForMode(mode: WorkspaceMode, widgets: WorkspaceWidgetDefinition[]): WorkspaceWidgetDefinition[] {
  const definition = getWorkspaceModeDefinition(mode);
  return [...widgets].sort((a, b) => scoreWidgetForMode(definition, b) - scoreWidgetForMode(definition, a));
}

export function rankWorkspaceCommandsForMode(mode: WorkspaceMode, commands: WorkspaceCommand[]): WorkspaceCommand[] {
  const definition = getWorkspaceModeDefinition(mode);
  return [...commands].sort((a, b) => scoreCommandForMode(definition, b) - scoreCommandForMode(definition, a));
}

export function rankWorkspacePanelsForMode(mode: WorkspaceMode, panels: WorkspacePanelDefinition[]): WorkspacePanelDefinition[] {
  const definition = getWorkspaceModeDefinition(mode);
  return [...panels].sort((a, b) => scorePanelForMode(definition, b) - scorePanelForMode(definition, a));
}

export function shouldUseCompactWorkspaceMode(mode: WorkspaceMode, device?: WorkspaceDeviceProfile): boolean {
  const definition = getWorkspaceModeDefinition(mode);
  return definition.compact || device === "mobile";
}

function scoreWidgetForMode(mode: WorkspaceModeDefinition, widget: WorkspaceWidgetDefinition): number {
  return (
    scoreKey(mode.priorityWidgetKeys, widget.key, 50) +
    (mode.emphasizedWidgetKinds.includes(widget.kind) ? 20 : 0) +
    (widget.defaultSize === "full" ? 4 : 0) +
    (widget.defaultSize === "lg" || widget.defaultSize === "xl" ? 2 : 0)
  );
}

function scoreCommandForMode(mode: WorkspaceModeDefinition, command: WorkspaceCommand): number {
  return (
    scoreKey(mode.priorityCommandKeys, command.key, 50) +
    (mode.emphasizedCommandCategories.includes(command.category) ? 20 : 0) +
    (command.auditRequired ? -2 : 0)
  );
}

function scorePanelForMode(mode: WorkspaceModeDefinition, panel: WorkspacePanelDefinition): number {
  return (
    scoreKey(mode.priorityPanelKeys, panel.key, 50) +
    (mode.emphasizedPanelKinds.includes(panel.kind) ? 20 : 0) +
    (panel.defaultSize === "full" ? 4 : 0) +
    (panel.defaultSize === "lg" || panel.defaultSize === "xl" ? 2 : 0)
  );
}

function scoreKey(priorityKeys: string[] | undefined, key: string, baseScore: number): number {
  const index = priorityKeys?.indexOf(key) ?? -1;
  if (index < 0) {
    return 0;
  }

  return baseScore - index;
}
