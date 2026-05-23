import type {
  WorkspaceEntityType,
  WorkspaceMode,
  WorkspacePanelDefinition,
  WorkspacePanelKind,
  WorkspacePermissionRequirement,
  WorkspaceWidgetSize
} from "@/lib/workspace/types";

type PanelOptions = {
  key: string;
  label: string;
  kind: WorkspacePanelKind;
  entityTypes: WorkspaceEntityType[];
  modes?: WorkspaceMode[];
  description?: string;
  dataDependencies?: string[];
  actions?: string[];
  defaultSize?: WorkspaceWidgetSize;
  permission?: WorkspacePermissionRequirement;
};

type ResolveWorkspacePanelsInput = {
  keys?: string[];
  entityType: WorkspaceEntityType;
  mode: WorkspaceMode;
  permissions?: string[];
};

const leasingModes: WorkspaceMode[] = ["overview", "leasing", "documents", "communication"];
const residentModes: WorkspaceMode[] = ["overview", "resident", "financial", "maintenance", "documents", "communication"];
const financialModes: WorkspaceMode[] = ["overview", "financial", "resident", "executive"];
const maintenanceModes: WorkspaceMode[] = ["overview", "maintenance", "financial", "documents", "communication", "mobile_field"];
const inspectionModes: WorkspaceMode[] = ["overview", "inspection", "maintenance", "documents", "communication", "mobile_field", "compliance"];
const documentModes: WorkspaceMode[] = ["overview", "documents", "communication", "compliance"];
const programModes: WorkspaceMode[] = ["overview", "compliance", "documents", "communication", "financial"];

const permission = (anyOf: string[]): WorkspacePermissionRequirement => ({ anyOf });

const panel = (options: PanelOptions): WorkspacePanelDefinition => ({
  key: options.key,
  label: options.label,
  kind: options.kind,
  entityTypes: options.entityTypes,
  modes: options.modes,
  description: options.description,
  dataDependencies: options.dataDependencies,
  actions: options.actions,
  defaultSize: options.defaultSize,
  permission: options.permission
});

export const workspacePanelRegistry: Record<string, WorkspacePanelDefinition> = {
  "application.reviewDrawer": panel({
    key: "application.reviewDrawer",
    label: "Application review",
    kind: "drawer",
    entityTypes: ["unit", "lead", "application"],
    modes: leasingModes,
    description: "Review an application, missing items, documents, screening status, messages, and decision actions without leaving the workspace.",
    dataDependencies: ["application", "applicant", "documents", "screening.summary"],
    actions: ["application.requestUpdate", "application.approve", "application.deny"],
    defaultSize: "xl",
    permission: permission(["landlord.applications"])
  }),
  "lead.detailInspector": panel({
    key: "lead.detailInspector",
    label: "Lead detail",
    kind: "inspector",
    entityTypes: ["unit", "lead", "message_thread"],
    modes: leasingModes,
    description: "Inspect lead context, tour status, application conversion, assignment, and recent conversation activity.",
    dataDependencies: ["lead", "showing", "message.thread"],
    actions: ["lead.reply", "lead.scheduleTour", "lead.inviteToApply"],
    defaultSize: "lg",
    permission: permission(["landlord.inbox"])
  }),
  "showing.scheduler": panel({
    key: "showing.scheduler",
    label: "Schedule showing",
    kind: "modal",
    entityTypes: ["unit", "lead"],
    modes: leasingModes,
    description: "Schedule, approve, reschedule, or complete an in-person, virtual, self-guided, or open-house tour.",
    dataDependencies: ["showing.availability", "lead", "unit"],
    actions: ["lead.scheduleTour"],
    defaultSize: "md",
    permission: permission(["landlord.inbox", "landlord.calendar"])
  }),
  "resident.profileDrawer": panel({
    key: "resident.profileDrawer",
    label: "Resident profile",
    kind: "drawer",
    entityTypes: ["unit", "tenant", "lease"],
    modes: residentModes,
    description: "Open resident, household, contact, lease, balance, documents, and service context from any resident workspace.",
    dataDependencies: ["tenant.profile", "lease", "ledger.summary"],
    actions: ["tenant.message", "tenant.viewPayments"],
    defaultSize: "lg",
    permission: permission(["landlord.tenants", "tenant.dashboard"])
  }),
  "lease.packetDrawer": panel({
    key: "lease.packetDrawer",
    label: "Lease packet",
    kind: "drawer",
    entityTypes: ["unit", "tenant", "lease"],
    modes: residentModes,
    description: "Create, review, send, sign, renew, terminate, download, or inspect lease packet documents.",
    dataDependencies: ["lease", "document.timeline", "signatures"],
    actions: ["lease.sendForSignature", "lease.downloadPdf", "lease.renew", "lease.terminate"],
    defaultSize: "xl",
    permission: permission(["landlord.leases", "tenant.lease"])
  }),
  "ledger.transactionInspector": panel({
    key: "ledger.transactionInspector",
    label: "Transaction detail",
    kind: "inspector",
    entityTypes: ["unit", "tenant", "ledger", "payment"],
    modes: financialModes,
    description: "Inspect a charge, payment, credit, refund, void, reversal, subsidy receipt, or reconciliation event.",
    dataDependencies: ["ledger.transaction", "payment", "audit"],
    actions: ["ledger.export", "payment.viewReceipt"],
    defaultSize: "md",
    permission: permission(["landlord.ledger", "tenant.rent"])
  }),
  "financial.actionModal": panel({
    key: "financial.actionModal",
    label: "Financial action",
    kind: "modal",
    entityTypes: ["unit", "tenant", "ledger", "payment"],
    modes: financialModes,
    description: "Post a manual payment, charge, adjustment, credit, refund, void, or reversal with audit cues and required reason fields.",
    dataDependencies: ["ledger", "permissions", "audit"],
    actions: ["ledger.recordPayment", "ledger.addCharge", "ledger.issueCredit"],
    defaultSize: "md",
    permission: permission(["landlord.ledger", "landlord.payments"])
  }),
  "workOrder.dispatchDrawer": panel({
    key: "workOrder.dispatchDrawer",
    label: "Dispatch work order",
    kind: "drawer",
    entityTypes: ["unit", "maintenance_request", "work_order"],
    modes: maintenanceModes,
    description: "Triage, assign, schedule, message, and track a work order while preserving property, access, media, and tenant context.",
    dataDependencies: ["workOrder", "maintenance.request", "vendor.assignment", "message.thread"],
    actions: ["maintenance.assign", "workOrder.schedule", "workOrder.markComplete"],
    defaultSize: "xl",
    permission: permission(["landlord.maintenance", "vendor.jobs"])
  }),
  "maintenance.mediaBottomSheet": panel({
    key: "maintenance.mediaBottomSheet",
    label: "Maintenance media",
    kind: "bottom_sheet",
    entityTypes: ["maintenance_request", "work_order"],
    modes: maintenanceModes,
    description: "Capture, upload, preview, or annotate photos and videos from mobile field workflows.",
    dataDependencies: ["maintenance.attachments", "workOrder.attachments"],
    actions: ["workOrder.uploadMedia", "tenant.uploadDocument"],
    defaultSize: "lg",
    permission: permission(["tenant.maintenance", "vendor.jobs", "landlord.maintenance"])
  }),
  "vendor.invoiceDrawer": panel({
    key: "vendor.invoiceDrawer",
    label: "Vendor invoice",
    kind: "drawer",
    entityTypes: ["work_order", "vendor_invoice"],
    modes: maintenanceModes,
    description: "Submit, review, approve, deny, or inspect vendor invoice and payout readiness details.",
    dataDependencies: ["vendorInvoice", "workOrder", "document.file"],
    actions: ["workOrder.submitInvoice", "vendorInvoice.approve", "vendorInvoice.deny"],
    defaultSize: "lg",
    permission: permission(["landlord.vendors", "vendor.invoices"])
  }),
  "inspection.checklistSplitPane": panel({
    key: "inspection.checklistSplitPane",
    label: "Inspection checklist",
    kind: "split_pane",
    entityTypes: ["inspection"],
    modes: inspectionModes,
    description: "Complete template sections, item results, notes, photo evidence, and review state side-by-side.",
    dataDependencies: ["inspection.template", "inspection.results", "inspection.evidence"],
    actions: ["inspection.recordResults"],
    defaultSize: "full",
    permission: permission(["landlord.inspections", "inspector.assignments"])
  }),
  "inspection.correctionDrawer": panel({
    key: "inspection.correctionDrawer",
    label: "Correction workflow",
    kind: "drawer",
    entityTypes: ["unit", "inspection", "work_order"],
    modes: inspectionModes,
    description: "Review failed items, assign responsibility, create linked work orders, verify fixes, and schedule reinspection.",
    dataDependencies: ["inspection.corrections", "workOrder"],
    actions: ["inspection.scheduleReinspection", "unit.createWorkOrder"],
    defaultSize: "lg",
    permission: permission(["landlord.inspections", "landlord.maintenance"])
  }),
  "document.previewDrawer": panel({
    key: "document.previewDrawer",
    label: "Document preview",
    kind: "drawer",
    entityTypes: ["unit", "application", "lease", "document", "program_case", "owner_statement", "vendor_invoice"],
    modes: documentModes,
    description: "Preview, download, share, revoke, send for signature, or inspect document timeline state.",
    dataDependencies: ["document.file", "document.shares", "signatures"],
    actions: ["document.download", "document.share", "document.revoke"],
    defaultSize: "xl",
    permission: permission(["landlord.documents", "tenant.documents", "admin.command-center", "caseworker.documents"])
  }),
  "message.threadDock": panel({
    key: "message.threadDock",
    label: "Message dock",
    kind: "dock",
    entityTypes: ["unit", "lead", "application", "tenant", "maintenance_request", "work_order", "inspection", "program_case", "message_thread"],
    modes: ["overview", "leasing", "resident", "maintenance", "inspection", "documents", "communication", "compliance", "mobile_field"],
    description: "Keep the conversation open while working through the related record.",
    dataDependencies: ["message.thread", "entity.context"],
    actions: ["message.reply", "message.markResolved"],
    defaultSize: "md",
    permission: permission(["landlord.inbox", "tenant.messages", "caseworker.messages"])
  }),
  "timeline.detailDrawer": panel({
    key: "timeline.detailDrawer",
    label: "Activity detail",
    kind: "drawer",
    entityTypes: ["property", "unit", "tenant", "applicant", "lead", "application", "lease", "ledger", "payment", "maintenance_request", "work_order", "inspection", "document", "message_thread", "organization", "owner_statement", "vendor_invoice", "program_case", "voucher", "hap_contract", "certification_packet"],
    modes: ["overview", "leasing", "resident", "financial", "maintenance", "inspection", "documents", "communication", "executive", "compliance", "mobile_field"],
    description: "Inspect timeline event metadata, actor, related record, audit linkage, and follow-up action.",
    dataDependencies: ["workspace.events", "audit"],
    actions: ["timeline.openRelated"],
    defaultSize: "md"
  }),
  "program.rftaPacketDrawer": panel({
    key: "program.rftaPacketDrawer",
    label: "RFTA packet",
    kind: "drawer",
    entityTypes: ["program_case", "voucher"],
    modes: programModes,
    description: "Review packet progress, missing items, landlord checklist, signatures, corrections, and inspection readiness.",
    dataDependencies: ["rfta", "document.requests", "signatures"],
    actions: ["programCase.reviewRfta", "programCase.requestDocument"],
    defaultSize: "xl",
    permission: permission(["admin.workflows", "caseworker.applications"])
  }),
  "program.subsidyInspector": panel({
    key: "program.subsidyInspector",
    label: "Subsidy detail",
    kind: "inspector",
    entityTypes: ["program_case", "hap_contract", "ledger"],
    modes: programModes,
    description: "Inspect expected subsidy, receipts, holds, adjustments, periods, and ledger reconciliation.",
    dataDependencies: ["hap.contract", "subsidy.schedule", "subsidy.receipts", "ledger"],
    actions: ["hap.recordReceipt", "hap.reviewHold"],
    defaultSize: "lg",
    permission: permission(["admin.workflows", "landlord.ledger"])
  }),
  "certification.reviewDrawer": panel({
    key: "certification.reviewDrawer",
    label: "Certification review",
    kind: "drawer",
    entityTypes: ["program_case", "certification_packet"],
    modes: programModes,
    description: "Review certification snapshots, required documents, signatures, notes, and decision state.",
    dataDependencies: ["certification.packet", "document.requirements", "signatures"],
    actions: ["certification.review", "certification.approve", "certification.deny"],
    defaultSize: "xl",
    permission: permission(["admin.workflows"])
  }),
  "owner.statementDrawer": panel({
    key: "owner.statementDrawer",
    label: "Owner statement",
    kind: "drawer",
    entityTypes: ["owner_statement", "property", "ledger"],
    modes: ["overview", "executive", "financial", "documents"],
    description: "Open statement summary, line items, document, period filter, and download/share actions.",
    dataDependencies: ["ownerStatement", "ownerStatement.lines", "document.file"],
    actions: ["ownerStatement.download", "ownerStatement.share"],
    defaultSize: "xl",
    permission: permission(["landlord.reports", "admin.reports"])
  }),
  "admin.auditInspector": panel({
    key: "admin.auditInspector",
    label: "Audit detail",
    kind: "inspector",
    entityTypes: ["organization", "payment", "document", "ledger", "program_case"],
    modes: ["overview", "executive", "financial", "documents", "compliance"],
    description: "Inspect sensitive action history, actor, source, metadata, and related platform evidence.",
    dataDependencies: ["audit", "security.events"],
    actions: ["admin.openAudit"],
    defaultSize: "lg",
    permission: permission(["super-admin.audit", "admin.command-center"])
  })
};

export const workspacePanelKeys = Object.keys(workspacePanelRegistry);

export function getWorkspacePanelDefinition(key: string): WorkspacePanelDefinition | undefined {
  return workspacePanelRegistry[key];
}

export function getWorkspacePanelsForEntity(entityType: WorkspaceEntityType): WorkspacePanelDefinition[] {
  return workspacePanelKeys
    .map((key) => workspacePanelRegistry[key])
    .filter((definition) => definition.entityTypes.includes(entityType));
}

export function getWorkspacePanelsForMode(mode: WorkspaceMode): WorkspacePanelDefinition[] {
  return workspacePanelKeys
    .map((key) => workspacePanelRegistry[key])
    .filter((definition) => !definition.modes?.length || definition.modes.includes(mode));
}

export function resolveWorkspacePanels(input: ResolveWorkspacePanelsInput): WorkspacePanelDefinition[] {
  const permissionSet = new Set(input.permissions ?? []);
  const keys = input.keys?.length ? input.keys : workspacePanelKeys;

  return keys
    .map((key) => workspacePanelRegistry[key])
    .filter((definition): definition is WorkspacePanelDefinition => Boolean(definition))
    .filter((definition) => definition.entityTypes.includes(input.entityType))
    .filter((definition) => !definition.modes?.length || definition.modes.includes(input.mode))
    .filter((definition) => canUseWorkspacePanel(definition, permissionSet));
}

function canUseWorkspacePanel(definition: WorkspacePanelDefinition, permissionSet: Set<string>): boolean {
  const requirement = definition.permission;
  if (!requirement) {
    return true;
  }

  if (requirement.deniedBy?.some((permissionKey) => permissionSet.has(permissionKey))) {
    return false;
  }

  if (requirement.allOf?.some((permissionKey) => !permissionSet.has(permissionKey))) {
    return false;
  }

  if (requirement.anyOf?.length && !requirement.anyOf.some((permissionKey) => permissionSet.has(permissionKey))) {
    return false;
  }

  return true;
}
