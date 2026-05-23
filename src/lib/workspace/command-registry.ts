import type {
  WorkspaceCommand,
  WorkspaceCommandCategory,
  WorkspaceEntityType,
  WorkspaceMode,
  WorkspacePermissionRequirement
} from "@/lib/workspace/types";

type CommandOptions = {
  key: string;
  label: string;
  description: string;
  category: WorkspaceCommandCategory;
  entityTypes: WorkspaceEntityType[];
  modes?: WorkspaceMode[];
  permission?: WorkspacePermissionRequirement;
  auditRequired?: boolean;
};

type ResolveWorkspaceCommandsInput = {
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

const command = (options: CommandOptions): WorkspaceCommand => ({
  key: options.key,
  label: options.label,
  description: options.description,
  category: options.category,
  entityTypes: options.entityTypes,
  modes: options.modes,
  permission: options.permission,
  auditRequired: options.auditRequired
});

export const workspaceCommandRegistry: Record<string, WorkspaceCommand> = {
  "admin.openAudit": command({ key: "admin.openAudit", label: "Open audit detail", description: "Open audit evidence, actor, source, metadata, and related platform history.", category: "admin", entityTypes: ["organization", "payment", "document", "ledger", "program_case"], permission: permission(["super-admin.audit", "admin.command-center"]) }),
  "applicant.inviteToApply": command({ key: "applicant.inviteToApply", label: "Invite to apply", description: "Send an application invitation to an applicant or lead.", category: "workflow", entityTypes: ["applicant"], modes: leasingModes, permission: permission(["landlord.applications"]) }),
  "applicant.message": command({ key: "applicant.message", label: "Message applicant", description: "Open a conversation with the applicant.", category: "communication", entityTypes: ["applicant"], modes: leasingModes, permission: permission(["landlord.inbox", "landlord.applications"]) }),
  "applicant.requestDocument": command({ key: "applicant.requestDocument", label: "Request document", description: "Request a missing or updated applicant document.", category: "document", entityTypes: ["applicant"], modes: leasingModes, permission: permission(["landlord.applications", "landlord.documents"]) }),
  "application.approve": command({ key: "application.approve", label: "Approve application", description: "Approve the application and prepare the lease handoff.", category: "workflow", entityTypes: ["application"], modes: leasingModes, permission: permission(["landlord.applications"]), auditRequired: true }),
  "application.conditionallyApprove": command({ key: "application.conditionallyApprove", label: "Conditionally approve", description: "Record a conditional approval with structured requirements.", category: "workflow", entityTypes: ["application"], modes: leasingModes, permission: permission(["landlord.applications"]), auditRequired: true }),
  "application.deny": command({ key: "application.deny", label: "Deny application", description: "Record a fair-housing-safe denial decision with required reason support.", category: "workflow", entityTypes: ["application"], modes: leasingModes, permission: permission(["landlord.applications"]), auditRequired: true }),
  "application.moveToLease": command({ key: "application.moveToLease", label: "Move to lease", description: "Start the lease packet from an approved application.", category: "workflow", entityTypes: ["application"], modes: leasingModes, permission: permission(["landlord.leases", "landlord.applications"]) }),
  "application.requestUpdate": command({ key: "application.requestUpdate", label: "Request update", description: "Ask the applicant for missing details, documents, or corrections.", category: "workflow", entityTypes: ["application"], modes: leasingModes, permission: permission(["landlord.applications"]) }),
  "certification.approve": command({ key: "certification.approve", label: "Approve certification", description: "Approve a certification or recertification packet.", category: "workflow", entityTypes: ["certification_packet"], modes: programModes, permission: permission(["admin.workflows"]), auditRequired: true }),
  "certification.deny": command({ key: "certification.deny", label: "Deny certification", description: "Deny a certification packet with review notes.", category: "workflow", entityTypes: ["certification_packet"], modes: programModes, permission: permission(["admin.workflows"]), auditRequired: true }),
  "certification.requestDocument": command({ key: "certification.requestDocument", label: "Request certification document", description: "Request a required certification document from the participant or household.", category: "document", entityTypes: ["certification_packet"], modes: programModes, permission: permission(["admin.workflows", "caseworker.documents"]) }),
  "certification.review": command({ key: "certification.review", label: "Review certification", description: "Open the certification packet review workflow.", category: "workflow", entityTypes: ["certification_packet"], modes: programModes, permission: permission(["admin.workflows"]) }),
  "document.download": command({ key: "document.download", label: "Download document", description: "Download a document when the user has access.", category: "document", entityTypes: ["document"], modes: documentModes, permission: permission(["landlord.documents", "tenant.documents", "admin.command-center", "caseworker.documents"]) }),
  "document.revoke": command({ key: "document.revoke", label: "Revoke access", description: "Revoke shared document access.", category: "document", entityTypes: ["document"], modes: documentModes, permission: permission(["landlord.documents", "admin.command-center"]), auditRequired: true }),
  "document.sendForSignature": command({ key: "document.sendForSignature", label: "Send for signature", description: "Send a document through the signature queue.", category: "document", entityTypes: ["document"], modes: documentModes, permission: permission(["landlord.documents", "landlord.leases"]), auditRequired: true }),
  "document.share": command({ key: "document.share", label: "Share document", description: "Share a document with an authorized party.", category: "document", entityTypes: ["document"], modes: documentModes, permission: permission(["landlord.documents", "admin.command-center"]), auditRequired: true }),
  "hap.exportReconciliation": command({ key: "hap.exportReconciliation", label: "Export reconciliation", description: "Export HAP/subsidy reconciliation details for review.", category: "financial", entityTypes: ["hap_contract"], modes: programModes, permission: permission(["admin.workflows", "landlord.ledger"]), auditRequired: true }),
  "hap.recordReceipt": command({ key: "hap.recordReceipt", label: "Record subsidy receipt", description: "Record a subsidy or HAP receipt against expected subsidy.", category: "financial", entityTypes: ["hap_contract"], modes: programModes, permission: permission(["admin.workflows", "landlord.ledger"]), auditRequired: true }),
  "hap.reviewHold": command({ key: "hap.reviewHold", label: "Review subsidy hold", description: "Review or resolve a subsidy payment hold.", category: "workflow", entityTypes: ["hap_contract"], modes: programModes, permission: permission(["admin.workflows"]), auditRequired: true }),
  "inspection.recordResults": command({ key: "inspection.recordResults", label: "Record results", description: "Record inspection checklist outcomes, notes, and evidence.", category: "inspection", entityTypes: ["inspection"], modes: inspectionModes, permission: permission(["landlord.inspections", "inspector.assignments"]), auditRequired: true }),
  "inspection.scheduleReinspection": command({ key: "inspection.scheduleReinspection", label: "Schedule reinspection", description: "Schedule a reinspection after correction work.", category: "inspection", entityTypes: ["inspection"], modes: inspectionModes, permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "inspection.start": command({ key: "inspection.start", label: "Start inspection", description: "Start an assigned inspection checklist.", category: "inspection", entityTypes: ["inspection"], modes: inspectionModes, permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "inspection.uploadReport": command({ key: "inspection.uploadReport", label: "Upload report", description: "Upload an inspection report or supporting evidence.", category: "document", entityTypes: ["inspection"], modes: inspectionModes, permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "lead.close": command({ key: "lead.close", label: "Close lead", description: "Close a lead with a reason or outcome.", category: "workflow", entityTypes: ["lead"], modes: leasingModes, permission: permission(["landlord.inbox"]) }),
  "lead.inviteToApply": command({ key: "lead.inviteToApply", label: "Invite to apply", description: "Invite a lead to submit an application.", category: "workflow", entityTypes: ["lead"], modes: leasingModes, permission: permission(["landlord.applications", "landlord.inbox"]) }),
  "lead.reply": command({ key: "lead.reply", label: "Reply to lead", description: "Reply to a leasing inquiry.", category: "communication", entityTypes: ["lead"], modes: leasingModes, permission: permission(["landlord.inbox"]) }),
  "lead.scheduleTour": command({ key: "lead.scheduleTour", label: "Schedule tour", description: "Schedule, approve, or update a tour.", category: "workflow", entityTypes: ["lead"], modes: leasingModes, permission: permission(["landlord.inbox", "landlord.calendar"]) }),
  "lease.downloadPdf": command({ key: "lease.downloadPdf", label: "Download lease PDF", description: "Download the lease or packet PDF.", category: "document", entityTypes: ["lease"], modes: residentModes, permission: permission(["landlord.leases", "tenant.lease"]) }),
  "lease.renew": command({ key: "lease.renew", label: "Renew lease", description: "Start or continue a lease renewal workflow.", category: "workflow", entityTypes: ["lease"], modes: residentModes, permission: permission(["landlord.leases"]), auditRequired: true }),
  "lease.sendForSignature": command({ key: "lease.sendForSignature", label: "Send for signature", description: "Send a lease for required signatures.", category: "document", entityTypes: ["lease"], modes: residentModes, permission: permission(["landlord.leases"]), auditRequired: true }),
  "lease.terminate": command({ key: "lease.terminate", label: "Terminate lease", description: "Start a lease termination workflow with audit evidence.", category: "workflow", entityTypes: ["lease"], modes: residentModes, permission: permission(["landlord.leases"]), auditRequired: true }),
  "ledger.addCharge": command({ key: "ledger.addCharge", label: "Add charge", description: "Post a charge to the ledger through the financial posting workflow.", category: "financial", entityTypes: ["ledger"], modes: financialModes, permission: permission(["landlord.ledger"]), auditRequired: true }),
  "ledger.export": command({ key: "ledger.export", label: "Export ledger", description: "Export ledger records with audit tracking.", category: "financial", entityTypes: ["ledger"], modes: financialModes, permission: permission(["landlord.ledger", "admin.reports"]), auditRequired: true }),
  "ledger.issueCredit": command({ key: "ledger.issueCredit", label: "Issue credit", description: "Post a credit or adjustment with required reason support.", category: "financial", entityTypes: ["ledger"], modes: financialModes, permission: permission(["landlord.ledger"]), auditRequired: true }),
  "ledger.recordPayment": command({ key: "ledger.recordPayment", label: "Record payment", description: "Record a manual payment through the ledger posting workflow.", category: "financial", entityTypes: ["ledger"], modes: financialModes, permission: permission(["landlord.payments", "landlord.ledger"]), auditRequired: true }),
  "maintenance.assign": command({ key: "maintenance.assign", label: "Assign maintenance", description: "Assign maintenance work to staff or a vendor.", category: "maintenance", entityTypes: ["maintenance_request"], modes: maintenanceModes, permission: permission(["landlord.maintenance"]), auditRequired: true }),
  "maintenance.close": command({ key: "maintenance.close", label: "Close request", description: "Close a maintenance request after completion or cancellation.", category: "maintenance", entityTypes: ["maintenance_request"], modes: maintenanceModes, permission: permission(["landlord.maintenance"]), auditRequired: true }),
  "maintenance.createWorkOrder": command({ key: "maintenance.createWorkOrder", label: "Create work order", description: "Create a work order from a maintenance request.", category: "maintenance", entityTypes: ["maintenance_request"], modes: maintenanceModes, permission: permission(["landlord.maintenance"]) }),
  "maintenance.messageTenant": command({ key: "maintenance.messageTenant", label: "Message resident", description: "Message the resident about a maintenance request.", category: "communication", entityTypes: ["maintenance_request"], modes: maintenanceModes, permission: permission(["landlord.maintenance", "landlord.inbox"]) }),
  "message.assign": command({ key: "message.assign", label: "Assign conversation", description: "Assign a conversation to a team member.", category: "communication", entityTypes: ["message_thread"], modes: ["overview", "communication"], permission: permission(["landlord.inbox", "admin.command-center"]) }),
  "message.markResolved": command({ key: "message.markResolved", label: "Mark resolved", description: "Mark a conversation as resolved.", category: "communication", entityTypes: ["message_thread"], modes: ["overview", "communication"], permission: permission(["landlord.inbox", "caseworker.messages"]) }),
  "message.reply": command({ key: "message.reply", label: "Reply", description: "Reply to a message thread.", category: "communication", entityTypes: ["message_thread"], modes: ["overview", "communication"], permission: permission(["landlord.inbox", "tenant.messages", "caseworker.messages"]) }),
  "organization.manageUsers": command({ key: "organization.manageUsers", label: "Manage users", description: "Open organization user and access management.", category: "admin", entityTypes: ["organization"], modes: ["overview", "executive", "compliance"], permission: permission(["admin.users"]) }),
  "organization.openReports": command({ key: "organization.openReports", label: "Open reports", description: "Open organization or portfolio reports.", category: "navigation", entityTypes: ["organization"], modes: ["overview", "executive", "financial"], permission: permission(["admin.reports", "landlord.reports"]) }),
  "organization.reviewAccess": command({ key: "organization.reviewAccess", label: "Review access", description: "Review access requests and scoped permissions.", category: "admin", entityTypes: ["organization"], modes: ["overview", "executive", "compliance"], permission: permission(["admin.access-requests"]) }),
  "ownerStatement.download": command({ key: "ownerStatement.download", label: "Download statement", description: "Download an owner statement.", category: "document", entityTypes: ["owner_statement"], modes: financialModes, permission: permission(["landlord.reports", "admin.reports"]) }),
  "ownerStatement.share": command({ key: "ownerStatement.share", label: "Share statement", description: "Share an owner statement document with authorized owner clients.", category: "document", entityTypes: ["owner_statement"], modes: financialModes, permission: permission(["landlord.reports"]), auditRequired: true }),
  "ownerStatement.view": command({ key: "ownerStatement.view", label: "View statement", description: "Open the owner statement details.", category: "navigation", entityTypes: ["owner_statement"], modes: financialModes, permission: permission(["landlord.reports", "admin.reports"]) }),
  "payment.reconcile": command({ key: "payment.reconcile", label: "Reconcile payment", description: "Review payment provider, ledger, refund, dispute, or payout reconciliation.", category: "financial", entityTypes: ["payment"], modes: financialModes, permission: permission(["landlord.payments"]), auditRequired: true }),
  "payment.refund": command({ key: "payment.refund", label: "Issue refund", description: "Start a refund workflow with confirmation and audit evidence.", category: "financial", entityTypes: ["payment"], modes: financialModes, permission: permission(["landlord.payments"]), auditRequired: true }),
  "payment.viewReceipt": command({ key: "payment.viewReceipt", label: "View receipt", description: "View or download the payment receipt.", category: "document", entityTypes: ["payment"], modes: financialModes, permission: permission(["landlord.payments", "tenant.rent"]) }),
  "programCase.messageParticipant": command({ key: "programCase.messageParticipant", label: "Message participant", description: "Message the participant or household connected to the case.", category: "communication", entityTypes: ["program_case"], modes: programModes, permission: permission(["caseworker.messages", "admin.workflows"]) }),
  "programCase.requestDocument": command({ key: "programCase.requestDocument", label: "Request document", description: "Request a missing program, RFTA, certification, or participant document.", category: "document", entityTypes: ["program_case"], modes: programModes, permission: permission(["caseworker.documents", "admin.workflows"]) }),
  "programCase.reviewRfta": command({ key: "programCase.reviewRfta", label: "Review RFTA", description: "Review the RFTA packet and missing items.", category: "workflow", entityTypes: ["program_case"], modes: programModes, permission: permission(["caseworker.applications", "admin.workflows"]), auditRequired: true }),
  "programCase.scheduleInspection": command({ key: "programCase.scheduleInspection", label: "Schedule inspection", description: "Schedule or request an inspection for a program case.", category: "inspection", entityTypes: ["program_case"], modes: programModes, permission: permission(["admin.workflows"]) }),
  "property.addUnit": command({ key: "property.addUnit", label: "Add unit", description: "Add a rentable unit under this property.", category: "workflow", entityTypes: ["property"], modes: ["overview", "leasing"], permission: permission(["landlord.units"]) }),
  "property.openInventory": command({ key: "property.openInventory", label: "Open inventory", description: "Open inventory filtered to this property.", category: "navigation", entityTypes: ["property"], modes: ["overview", "leasing", "maintenance", "inspection"], permission: permission(["landlord.units", "landlord.properties"]) }),
  "property.uploadDocument": command({ key: "property.uploadDocument", label: "Upload property document", description: "Upload a document connected to this property.", category: "document", entityTypes: ["property"], modes: documentModes, permission: permission(["landlord.documents"]) }),
  "tenant.message": command({ key: "tenant.message", label: "Message resident", description: "Open a message thread with the resident.", category: "communication", entityTypes: ["tenant"], modes: residentModes, permission: permission(["landlord.inbox", "tenant.messages"]) }),
  "tenant.requestRepair": command({ key: "tenant.requestRepair", label: "Request repair", description: "Create a resident maintenance request.", category: "maintenance", entityTypes: ["tenant"], modes: residentModes, permission: permission(["tenant.maintenance", "landlord.maintenance"]) }),
  "tenant.uploadDocument": command({ key: "tenant.uploadDocument", label: "Upload document", description: "Upload a resident document.", category: "document", entityTypes: ["tenant"], modes: documentModes, permission: permission(["tenant.documents", "landlord.documents"]) }),
  "tenant.viewPayments": command({ key: "tenant.viewPayments", label: "View payments", description: "Open tenant-facing payments and account history.", category: "financial", entityTypes: ["tenant"], modes: financialModes, permission: permission(["tenant.rent", "landlord.ledger"]) }),
  "timeline.openRelated": command({ key: "timeline.openRelated", label: "Open related record", description: "Open the record connected to the selected timeline activity.", category: "navigation", entityTypes: ["unit", "application", "lease", "ledger", "maintenance_request", "inspection", "document", "message_thread", "program_case"], permission: permission(["landlord.units", "admin.command-center", "caseworker.clients"]) }),
  "unit.createWorkOrder": command({ key: "unit.createWorkOrder", label: "Create work order", description: "Create a maintenance work order for this unit.", category: "maintenance", entityTypes: ["unit"], modes: maintenanceModes, permission: permission(["landlord.maintenance"]) }),
  "unit.editListing": command({ key: "unit.editListing", label: "Edit listing", description: "Edit listing details, pricing, media, visibility, and publish readiness.", category: "workflow", entityTypes: ["unit"], modes: leasingModes, permission: permission(["landlord.listings", "landlord.units"]) }),
  "unit.messageResident": command({ key: "unit.messageResident", label: "Message resident", description: "Open a conversation connected to the unit or current resident.", category: "communication", entityTypes: ["unit"], modes: residentModes, permission: permission(["landlord.inbox"]) }),
  "unit.recordPayment": command({ key: "unit.recordPayment", label: "Record payment", description: "Record a payment against the unit or resident ledger.", category: "financial", entityTypes: ["unit"], modes: financialModes, permission: permission(["landlord.payments", "landlord.ledger"]), auditRequired: true }),
  "unit.reviewApplication": command({ key: "unit.reviewApplication", label: "Review applications", description: "Open active applications tied to this unit.", category: "workflow", entityTypes: ["unit"], modes: leasingModes, permission: permission(["landlord.applications"]) }),
  "unit.scheduleInspection": command({ key: "unit.scheduleInspection", label: "Schedule inspection", description: "Schedule an inspection for this unit.", category: "inspection", entityTypes: ["unit"], modes: inspectionModes, permission: permission(["landlord.inspections"]) }),
  "unit.uploadDocument": command({ key: "unit.uploadDocument", label: "Upload unit document", description: "Upload a document connected to this unit.", category: "document", entityTypes: ["unit"], modes: documentModes, permission: permission(["landlord.documents"]) }),
  "vendorInvoice.approve": command({ key: "vendorInvoice.approve", label: "Approve invoice", description: "Approve a vendor invoice for payout readiness.", category: "financial", entityTypes: ["vendor_invoice"], modes: financialModes, permission: permission(["landlord.vendors"]), auditRequired: true }),
  "vendorInvoice.deny": command({ key: "vendorInvoice.deny", label: "Deny invoice", description: "Deny a vendor invoice with a reason.", category: "financial", entityTypes: ["vendor_invoice"], modes: financialModes, permission: permission(["landlord.vendors"]), auditRequired: true }),
  "vendorInvoice.markReadyForPayout": command({ key: "vendorInvoice.markReadyForPayout", label: "Mark payout ready", description: "Mark an approved invoice ready for payout processing.", category: "financial", entityTypes: ["vendor_invoice"], modes: financialModes, permission: permission(["landlord.vendors"]), auditRequired: true }),
  "vendorInvoice.submit": command({ key: "vendorInvoice.submit", label: "Submit invoice", description: "Submit a vendor invoice for review.", category: "financial", entityTypes: ["vendor_invoice"], modes: financialModes, permission: permission(["vendor.invoices"]), auditRequired: true }),
  "voucher.extend": command({ key: "voucher.extend", label: "Extend voucher", description: "Record a voucher extension date or extension review.", category: "workflow", entityTypes: ["voucher"], modes: programModes, permission: permission(["admin.workflows"]), auditRequired: true }),
  "voucher.requestDocument": command({ key: "voucher.requestDocument", label: "Request voucher document", description: "Request voucher-related documentation.", category: "document", entityTypes: ["voucher"], modes: programModes, permission: permission(["admin.workflows", "caseworker.documents"]) }),
  "voucher.review": command({ key: "voucher.review", label: "Review voucher", description: "Review voucher status, dates, program, and affordability context.", category: "workflow", entityTypes: ["voucher"], modes: programModes, permission: permission(["admin.workflows"]) }),
  "workOrder.accept": command({ key: "workOrder.accept", label: "Accept job", description: "Vendor accepts an assigned work order.", category: "maintenance", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["vendor.jobs"]), auditRequired: true }),
  "workOrder.markComplete": command({ key: "workOrder.markComplete", label: "Mark complete", description: "Mark a work order complete with notes or evidence.", category: "maintenance", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["landlord.maintenance", "vendor.jobs"]), auditRequired: true }),
  "workOrder.schedule": command({ key: "workOrder.schedule", label: "Schedule work", description: "Schedule or reschedule maintenance work.", category: "maintenance", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["landlord.maintenance", "vendor.jobs"]) }),
  "workOrder.submitEstimate": command({ key: "workOrder.submitEstimate", label: "Submit estimate", description: "Submit a vendor estimate for review.", category: "maintenance", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["vendor.jobs"]), auditRequired: true }),
  "workOrder.submitInvoice": command({ key: "workOrder.submitInvoice", label: "Submit invoice", description: "Submit a work order invoice for review.", category: "financial", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["vendor.invoices", "vendor.jobs"]), auditRequired: true }),
  "workOrder.uploadMedia": command({ key: "workOrder.uploadMedia", label: "Upload media", description: "Upload work order photos, videos, documents, or completion evidence.", category: "document", entityTypes: ["work_order"], modes: maintenanceModes, permission: permission(["landlord.maintenance", "vendor.jobs"]) })
};

export const workspaceCommandKeys = Object.keys(workspaceCommandRegistry);

export function getWorkspaceCommandDefinition(key: string): WorkspaceCommand | undefined {
  return workspaceCommandRegistry[key];
}

export function getWorkspaceCommandsForEntity(entityType: WorkspaceEntityType): WorkspaceCommand[] {
  return workspaceCommandKeys
    .map((key) => workspaceCommandRegistry[key])
    .filter((definition) => definition.entityTypes.includes(entityType));
}

export function getWorkspaceCommandsForMode(mode: WorkspaceMode): WorkspaceCommand[] {
  return workspaceCommandKeys
    .map((key) => workspaceCommandRegistry[key])
    .filter((definition) => !definition.modes?.length || definition.modes.includes(mode));
}

export function resolveWorkspaceCommands(input: ResolveWorkspaceCommandsInput): WorkspaceCommand[] {
  const permissionSet = new Set(input.permissions ?? []);
  const keys = input.keys?.length ? input.keys : workspaceCommandKeys;

  return keys
    .map((key) => workspaceCommandRegistry[key])
    .filter((definition): definition is WorkspaceCommand => Boolean(definition))
    .filter((definition) => definition.entityTypes.includes(input.entityType))
    .filter((definition) => !definition.modes?.length || definition.modes.includes(input.mode))
    .filter((definition) => canUseWorkspaceCommand(definition, permissionSet));
}

export function getMissingWorkspaceCommandKeys(keys: string[]): string[] {
  return keys.filter((key) => !workspaceCommandRegistry[key]);
}

export function shouldWorkspaceCommandCreateAuditEvidence(key: string): boolean {
  return workspaceCommandRegistry[key]?.auditRequired ?? false;
}

function canUseWorkspaceCommand(definition: WorkspaceCommand, permissionSet: Set<string>): boolean {
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
