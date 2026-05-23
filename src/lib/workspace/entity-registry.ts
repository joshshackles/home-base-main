import type {
  WorkspaceEntityDefinition,
  WorkspaceEntityRef,
  WorkspaceEntityType,
  WorkspaceMode,
  WorkspacePermissionRequirement,
  WorkspaceRelationshipCardinality,
  WorkspaceRelationshipDefinition
} from "@/lib/workspace/types";

const permission = (anyOf: string[]): WorkspacePermissionRequirement => ({ anyOf });

const relationship = (
  key: string,
  label: string,
  from: WorkspaceEntityType,
  to: WorkspaceEntityType,
  cardinality: WorkspaceRelationshipCardinality,
  description?: string
): WorkspaceRelationshipDefinition => ({
  key,
  label,
  from,
  to,
  cardinality,
  description
});

const commonPropertyModes: WorkspaceMode[] = [
  "overview",
  "leasing",
  "resident",
  "financial",
  "maintenance",
  "inspection",
  "documents",
  "communication",
  "executive"
];

const commonResidentModes: WorkspaceMode[] = ["overview", "resident", "financial", "maintenance", "documents", "communication"];
const commonProgramModes: WorkspaceMode[] = ["overview", "compliance", "documents", "communication", "financial"];

export const workspaceEntityRegistry = {
  property: {
    type: "property",
    label: "Property",
    pluralLabel: "Properties",
    description: "A managed property, building, complex, single-family rental, or portfolio asset.",
    canonicalRoute: (id) => `/landlord/inventory?property=${encodeURIComponent(id)}`,
    defaultMode: "overview",
    supportedModes: commonPropertyModes,
    permission: permission(["landlord.properties", "landlord.units"]),
    relationships: [
      relationship("property.units", "Units", "property", "unit", "many", "Rentable doors connected to this property."),
      relationship("property.inspections", "Inspections", "property", "inspection", "many"),
      relationship("property.documents", "Documents", "property", "document", "many"),
      relationship("property.ownerStatements", "Owner statements", "property", "owner_statement", "many")
    ],
    widgets: ["property.summary", "unit.rollup", "occupancy.metrics", "maintenance.rollup", "financial.rollup"],
    commands: ["property.openInventory", "property.addUnit", "property.uploadDocument"]
  },
  unit: {
    type: "unit",
    label: "Unit",
    pluralLabel: "Units",
    description: "One rentable door and the canonical workspace anchor for leasing, residents, financials, and operations.",
    canonicalRoute: (id) => `/landlord/units/${encodeURIComponent(id)}`,
    defaultMode: "overview",
    supportedModes: commonPropertyModes,
    permission: permission(["landlord.units"]),
    relationships: [
      relationship("unit.property", "Property", "unit", "property", "one"),
      relationship("unit.currentTenant", "Current tenant", "unit", "tenant", "one"),
      relationship("unit.leads", "Leads", "unit", "lead", "many"),
      relationship("unit.applications", "Applications", "unit", "application", "many"),
      relationship("unit.lease", "Lease", "unit", "lease", "one"),
      relationship("unit.ledger", "Ledger", "unit", "ledger", "one"),
      relationship("unit.maintenanceRequests", "Maintenance requests", "unit", "maintenance_request", "many"),
      relationship("unit.workOrders", "Work orders", "unit", "work_order", "many"),
      relationship("unit.inspections", "Inspections", "unit", "inspection", "many"),
      relationship("unit.documents", "Documents", "unit", "document", "many"),
      relationship("unit.messages", "Messages", "unit", "message_thread", "many"),
      relationship("unit.programCases", "Program cases", "unit", "program_case", "many")
    ],
    widgets: [
      "unit.summary",
      "listing.status",
      "resident.status",
      "lease.status",
      "ledger.summary",
      "maintenance.queue",
      "inspection.status",
      "document.timeline",
      "activity.stream"
    ],
    commands: [
      "unit.editListing",
      "unit.reviewApplication",
      "unit.messageResident",
      "unit.recordPayment",
      "unit.createWorkOrder",
      "unit.scheduleInspection",
      "unit.uploadDocument"
    ]
  },
  tenant: {
    type: "tenant",
    label: "Resident",
    pluralLabel: "Residents",
    description: "A current or former resident connected to a unit, lease, payments, requests, documents, and messages.",
    canonicalRoute: (id) => `/landlord/tenants?tenant=${encodeURIComponent(id)}`,
    defaultMode: "resident",
    supportedModes: commonResidentModes,
    permission: permission(["landlord.tenants", "tenant.dashboard"]),
    relationships: [
      relationship("tenant.unit", "Unit", "tenant", "unit", "one"),
      relationship("tenant.lease", "Lease", "tenant", "lease", "one"),
      relationship("tenant.ledger", "Ledger", "tenant", "ledger", "one"),
      relationship("tenant.documents", "Documents", "tenant", "document", "many"),
      relationship("tenant.messages", "Messages", "tenant", "message_thread", "many"),
      relationship("tenant.maintenanceRequests", "Maintenance requests", "tenant", "maintenance_request", "many")
    ],
    widgets: ["resident.profile", "lease.status", "payment.summary", "maintenance.history", "document.wallet"],
    commands: ["tenant.message", "tenant.requestRepair", "tenant.viewPayments", "tenant.uploadDocument"]
  },
  applicant: {
    type: "applicant",
    label: "Applicant",
    pluralLabel: "Applicants",
    description: "A renter prospect with reusable profile, documents, applications, messages, and screening authorization.",
    canonicalRoute: (id) => `/landlord/applications?applicant=${encodeURIComponent(id)}`,
    defaultMode: "leasing",
    supportedModes: ["overview", "leasing", "documents", "communication", "compliance"],
    permission: permission(["landlord.applications"]),
    relationships: [
      relationship("applicant.applications", "Applications", "applicant", "application", "many"),
      relationship("applicant.documents", "Documents", "applicant", "document", "many"),
      relationship("applicant.messages", "Messages", "applicant", "message_thread", "many")
    ],
    widgets: ["applicant.profile", "application.progress", "document.wallet", "screening.status"],
    commands: ["applicant.message", "applicant.requestDocument", "applicant.inviteToApply"]
  },
  lead: {
    type: "lead",
    label: "Lead",
    pluralLabel: "Leads",
    description: "A leasing inquiry or guest card tied to a listing, unit, messages, tours, and application conversion.",
    canonicalRoute: (id) => `/landlord/leads/${encodeURIComponent(id)}`,
    defaultMode: "leasing",
    supportedModes: ["overview", "leasing", "communication"],
    permission: permission(["landlord.inbox", "landlord.applications"]),
    relationships: [
      relationship("lead.unit", "Unit", "lead", "unit", "one"),
      relationship("lead.application", "Application", "lead", "application", "one"),
      relationship("lead.messages", "Messages", "lead", "message_thread", "many")
    ],
    widgets: ["lead.card", "showing.status", "message.thread", "leasing.pipeline"],
    commands: ["lead.reply", "lead.scheduleTour", "lead.inviteToApply", "lead.close"]
  },
  application: {
    type: "application",
    label: "Application",
    pluralLabel: "Applications",
    description: "A rental application workflow with applicant profile, documents, screening, decision, and lease handoff.",
    canonicalRoute: (id) => `/landlord/applications/${encodeURIComponent(id)}`,
    defaultMode: "leasing",
    supportedModes: ["overview", "leasing", "resident", "documents", "communication", "compliance"],
    permission: permission(["landlord.applications"]),
    relationships: [
      relationship("application.applicant", "Applicant", "application", "applicant", "one"),
      relationship("application.unit", "Unit", "application", "unit", "one"),
      relationship("application.documents", "Documents", "application", "document", "many"),
      relationship("application.messages", "Messages", "application", "message_thread", "many"),
      relationship("application.lease", "Lease", "application", "lease", "one")
    ],
    widgets: ["application.summary", "application.missingItems", "screening.status", "decision.panel", "application.timeline"],
    commands: ["application.requestUpdate", "application.approve", "application.conditionallyApprove", "application.deny", "application.moveToLease"]
  },
  lease: {
    type: "lease",
    label: "Lease",
    pluralLabel: "Leases",
    description: "A lease packet, uploaded lease, addendum, signature, renewal, or termination workflow.",
    canonicalRoute: (id) => `/landlord/leases/${encodeURIComponent(id)}`,
    defaultMode: "resident",
    supportedModes: ["overview", "resident", "financial", "documents", "communication"],
    permission: permission(["landlord.leases", "tenant.lease"]),
    relationships: [
      relationship("lease.unit", "Unit", "lease", "unit", "one"),
      relationship("lease.tenant", "Resident", "lease", "tenant", "one"),
      relationship("lease.documents", "Documents", "lease", "document", "many"),
      relationship("lease.ledger", "Ledger", "lease", "ledger", "one")
    ],
    widgets: ["lease.summary", "signature.queue", "renewal.status", "document.timeline"],
    commands: ["lease.sendForSignature", "lease.downloadPdf", "lease.renew", "lease.terminate"]
  },
  ledger: {
    type: "ledger",
    label: "Ledger",
    pluralLabel: "Ledgers",
    description: "A financial account history for unit, resident, household, subsidy, owner, or portfolio balances.",
    canonicalRoute: (id) => `/landlord/ledger?ledger=${encodeURIComponent(id)}`,
    defaultMode: "financial",
    supportedModes: ["overview", "financial", "resident", "executive"],
    permission: permission(["landlord.ledger", "landlord.payments", "tenant.rent"]),
    relationships: [
      relationship("ledger.unit", "Unit", "ledger", "unit", "one"),
      relationship("ledger.tenant", "Resident", "ledger", "tenant", "one"),
      relationship("ledger.payments", "Payments", "ledger", "payment", "many"),
      relationship("ledger.ownerStatements", "Owner statements", "ledger", "owner_statement", "many")
    ],
    widgets: ["ledger.summary", "transaction.table", "subsidy.summary", "deposit.liability"],
    commands: ["ledger.recordPayment", "ledger.addCharge", "ledger.issueCredit", "ledger.export"]
  },
  payment: {
    type: "payment",
    label: "Payment",
    pluralLabel: "Payments",
    description: "A tenant, subsidy, refund, dispute, payout, or reconciliation payment event.",
    canonicalRoute: (id) => `/landlord/payments?payment=${encodeURIComponent(id)}`,
    defaultMode: "financial",
    supportedModes: ["overview", "financial", "resident"],
    permission: permission(["landlord.payments", "tenant.rent"]),
    relationships: [
      relationship("payment.ledger", "Ledger", "payment", "ledger", "one"),
      relationship("payment.tenant", "Resident", "payment", "tenant", "one"),
      relationship("payment.unit", "Unit", "payment", "unit", "one")
    ],
    widgets: ["payment.summary", "receipt.preview", "reconciliation.status"],
    commands: ["payment.viewReceipt", "payment.reconcile", "payment.refund"]
  },
  maintenance_request: {
    type: "maintenance_request",
    label: "Maintenance Request",
    pluralLabel: "Maintenance Requests",
    description: "A resident repair request with issue details, media, messages, work order handoff, and timeline.",
    canonicalRoute: (id) => `/landlord/maintenance?request=${encodeURIComponent(id)}`,
    defaultMode: "maintenance",
    supportedModes: ["overview", "maintenance", "resident", "documents", "communication", "mobile_field"],
    permission: permission(["landlord.maintenance", "tenant.maintenance"]),
    relationships: [
      relationship("maintenanceRequest.unit", "Unit", "maintenance_request", "unit", "one"),
      relationship("maintenanceRequest.tenant", "Resident", "maintenance_request", "tenant", "one"),
      relationship("maintenanceRequest.workOrder", "Work order", "maintenance_request", "work_order", "one"),
      relationship("maintenanceRequest.documents", "Documents", "maintenance_request", "document", "many"),
      relationship("maintenanceRequest.messages", "Messages", "maintenance_request", "message_thread", "many")
    ],
    widgets: ["maintenance.issueSummary", "maintenance.media", "workOrder.status", "message.thread"],
    commands: ["maintenance.assign", "maintenance.messageTenant", "maintenance.createWorkOrder", "maintenance.close"]
  },
  work_order: {
    type: "work_order",
    label: "Work Order",
    pluralLabel: "Work Orders",
    description: "An operational repair job with vendor assignment, estimate, invoice, schedule, media, and completion flow.",
    canonicalRoute: (id) => `/vendor/field?workOrder=${encodeURIComponent(id)}`,
    defaultMode: "mobile_field",
    supportedModes: ["overview", "maintenance", "financial", "documents", "communication", "mobile_field"],
    permission: permission(["landlord.maintenance", "vendor.jobs"]),
    relationships: [
      relationship("workOrder.unit", "Unit", "work_order", "unit", "one"),
      relationship("workOrder.request", "Maintenance request", "work_order", "maintenance_request", "one"),
      relationship("workOrder.invoice", "Vendor invoice", "work_order", "vendor_invoice", "one"),
      relationship("workOrder.documents", "Documents", "work_order", "document", "many"),
      relationship("workOrder.messages", "Messages", "work_order", "message_thread", "many")
    ],
    widgets: ["workOrder.summary", "vendor.assignment", "workOrder.media", "estimate.status", "invoice.status"],
    commands: ["workOrder.accept", "workOrder.schedule", "workOrder.submitEstimate", "workOrder.submitInvoice", "workOrder.markComplete"]
  },
  inspection: {
    type: "inspection",
    label: "Inspection",
    pluralLabel: "Inspections",
    description: "A structured inspection, checklist, evidence, correction, reinspection, and report workflow.",
    canonicalRoute: (id) => `/landlord/inspections/${encodeURIComponent(id)}`,
    defaultMode: "inspection",
    supportedModes: ["overview", "inspection", "maintenance", "documents", "communication", "mobile_field", "compliance"],
    permission: permission(["landlord.inspections", "inspector.assignments"]),
    relationships: [
      relationship("inspection.unit", "Unit", "inspection", "unit", "one"),
      relationship("inspection.documents", "Documents", "inspection", "document", "many"),
      relationship("inspection.workOrders", "Linked work orders", "inspection", "work_order", "many"),
      relationship("inspection.programCase", "Program case", "inspection", "program_case", "one")
    ],
    widgets: ["inspection.summary", "inspection.checklist", "inspection.evidence", "correction.queue", "inspection.report"],
    commands: ["inspection.start", "inspection.recordResults", "inspection.uploadReport", "inspection.scheduleReinspection"]
  },
  document: {
    type: "document",
    label: "Document",
    pluralLabel: "Documents",
    description: "A shared, private, signed, revoked, uploaded, or generated document connected to platform records.",
    canonicalRoute: (id) => `/landlord/documents?document=${encodeURIComponent(id)}`,
    defaultMode: "documents",
    supportedModes: ["overview", "documents", "communication", "compliance"],
    permission: permission(["landlord.documents", "tenant.documents", "admin.command-center"]),
    relationships: [
      relationship("document.unit", "Unit", "document", "unit", "one"),
      relationship("document.lease", "Lease", "document", "lease", "one"),
      relationship("document.application", "Application", "document", "application", "one"),
      relationship("document.programCase", "Program case", "document", "program_case", "one")
    ],
    widgets: ["document.preview", "document.sharing", "signature.status", "document.timeline"],
    commands: ["document.share", "document.revoke", "document.download", "document.sendForSignature"]
  },
  message_thread: {
    type: "message_thread",
    label: "Message Thread",
    pluralLabel: "Message Threads",
    description: "A conversation connected to a lead, application, resident, work order, inspection, document, or program case.",
    canonicalRoute: (id) => `/landlord/inbox?thread=${encodeURIComponent(id)}`,
    defaultMode: "communication",
    supportedModes: ["overview", "communication", "leasing", "resident", "maintenance", "compliance"],
    permission: permission(["landlord.inbox", "tenant.messages"]),
    relationships: [
      relationship("messageThread.unit", "Unit", "message_thread", "unit", "one"),
      relationship("messageThread.lead", "Lead", "message_thread", "lead", "one"),
      relationship("messageThread.application", "Application", "message_thread", "application", "one"),
      relationship("messageThread.workOrder", "Work order", "message_thread", "work_order", "one"),
      relationship("messageThread.programCase", "Program case", "message_thread", "program_case", "one")
    ],
    widgets: ["message.thread", "entity.context", "conversation.actions"],
    commands: ["message.reply", "message.assign", "message.markResolved"]
  },
  organization: {
    type: "organization",
    label: "Organization",
    pluralLabel: "Organizations",
    description: "A company, owner group, property manager, program administrator, partner, or platform tenant.",
    canonicalRoute: (id) => `/admin/users?organization=${encodeURIComponent(id)}`,
    defaultMode: "executive",
    supportedModes: ["overview", "executive", "financial", "documents", "communication", "compliance"],
    permission: permission(["admin.command-center", "admin.users"]),
    relationships: [
      relationship("organization.properties", "Properties", "organization", "property", "many"),
      relationship("organization.users", "Staff and users", "organization", "tenant", "many"),
      relationship("organization.programCases", "Program cases", "organization", "program_case", "many"),
      relationship("organization.documents", "Documents", "organization", "document", "many")
    ],
    widgets: ["organization.summary", "access.summary", "integration.health", "portfolio.metrics"],
    commands: ["organization.manageUsers", "organization.reviewAccess", "organization.openReports"]
  },
  owner_statement: {
    type: "owner_statement",
    label: "Owner Statement",
    pluralLabel: "Owner Statements",
    description: "A property owner financial statement, distribution summary, document, and approval record.",
    canonicalRoute: (id) => `/owner/statements?statement=${encodeURIComponent(id)}`,
    defaultMode: "executive",
    supportedModes: ["overview", "executive", "financial", "documents"],
    permission: permission(["landlord.reports", "admin.reports"]),
    relationships: [
      relationship("ownerStatement.property", "Property", "owner_statement", "property", "one"),
      relationship("ownerStatement.ledger", "Ledger", "owner_statement", "ledger", "one"),
      relationship("ownerStatement.document", "Document", "owner_statement", "document", "one")
    ],
    widgets: ["ownerStatement.summary", "ownerStatement.lines", "statement.document"],
    commands: ["ownerStatement.view", "ownerStatement.download", "ownerStatement.share"]
  },
  vendor_invoice: {
    type: "vendor_invoice",
    label: "Vendor Invoice",
    pluralLabel: "Vendor Invoices",
    description: "A vendor invoice connected to maintenance, approval, payout readiness, documents, and audit history.",
    canonicalRoute: (id) => `/vendor/invoices?invoice=${encodeURIComponent(id)}`,
    defaultMode: "financial",
    supportedModes: ["overview", "maintenance", "financial", "documents", "mobile_field"],
    permission: permission(["landlord.vendors", "vendor.invoices"]),
    relationships: [
      relationship("vendorInvoice.workOrder", "Work order", "vendor_invoice", "work_order", "one"),
      relationship("vendorInvoice.documents", "Documents", "vendor_invoice", "document", "many"),
      relationship("vendorInvoice.unit", "Unit", "vendor_invoice", "unit", "one")
    ],
    widgets: ["vendorInvoice.summary", "approval.status", "payout.readiness", "document.preview"],
    commands: ["vendorInvoice.submit", "vendorInvoice.approve", "vendorInvoice.deny", "vendorInvoice.markReadyForPayout"]
  },
  program_case: {
    type: "program_case",
    label: "Program Case",
    pluralLabel: "Program Cases",
    description: "An affordable housing or assistance program case connecting household, voucher, RFTA, inspections, subsidy, documents, and communications.",
    canonicalRoute: (id) => `/program/cases/${encodeURIComponent(id)}`,
    defaultMode: "compliance",
    supportedModes: commonProgramModes,
    permission: permission(["admin.command-center", "admin.workflows"]),
    relationships: [
      relationship("programCase.tenant", "Participant", "program_case", "tenant", "one"),
      relationship("programCase.voucher", "Voucher", "program_case", "voucher", "one"),
      relationship("programCase.hapContract", "HAP contract", "program_case", "hap_contract", "one"),
      relationship("programCase.inspections", "Inspections", "program_case", "inspection", "many"),
      relationship("programCase.documents", "Documents", "program_case", "document", "many"),
      relationship("programCase.certifications", "Certification packets", "program_case", "certification_packet", "many"),
      relationship("programCase.messages", "Messages", "program_case", "message_thread", "many")
    ],
    widgets: ["programCase.summary", "rfta.status", "voucher.status", "subsidy.summary", "document.requests", "case.timeline"],
    commands: ["programCase.requestDocument", "programCase.reviewRfta", "programCase.scheduleInspection", "programCase.messageParticipant"]
  },
  voucher: {
    type: "voucher",
    label: "Voucher",
    pluralLabel: "Vouchers",
    description: "A voucher or assistance authorization connected to program case, participant, deadlines, affordability, and subsidy workflows.",
    canonicalRoute: (id) => `/program/vouchers?voucher=${encodeURIComponent(id)}`,
    defaultMode: "compliance",
    supportedModes: commonProgramModes,
    permission: permission(["admin.workflows"]),
    relationships: [
      relationship("voucher.programCase", "Program case", "voucher", "program_case", "one"),
      relationship("voucher.hapContract", "HAP contract", "voucher", "hap_contract", "one"),
      relationship("voucher.documents", "Documents", "voucher", "document", "many")
    ],
    widgets: ["voucher.summary", "voucher.expiration", "affordability.review"],
    commands: ["voucher.review", "voucher.extend", "voucher.requestDocument"]
  },
  hap_contract: {
    type: "hap_contract",
    label: "HAP Contract",
    pluralLabel: "HAP Contracts",
    description: "A subsidy contract connecting program case, unit, rent portions, schedules, receipts, holds, and reconciliation.",
    canonicalRoute: (id) => `/program/hap?contract=${encodeURIComponent(id)}`,
    defaultMode: "financial",
    supportedModes: ["overview", "financial", "compliance", "documents"],
    permission: permission(["admin.workflows", "landlord.ledger"]),
    relationships: [
      relationship("hapContract.programCase", "Program case", "hap_contract", "program_case", "one"),
      relationship("hapContract.voucher", "Voucher", "hap_contract", "voucher", "one"),
      relationship("hapContract.unit", "Unit", "hap_contract", "unit", "one"),
      relationship("hapContract.ledger", "Ledger", "hap_contract", "ledger", "one"),
      relationship("hapContract.documents", "Documents", "hap_contract", "document", "many")
    ],
    widgets: ["hap.summary", "subsidy.schedule", "subsidy.receipts", "subsidy.holds"],
    commands: ["hap.recordReceipt", "hap.reviewHold", "hap.exportReconciliation"]
  },
  certification_packet: {
    type: "certification_packet",
    label: "Certification Packet",
    pluralLabel: "Certification Packets",
    description: "A certification or recertification packet with snapshots, requirements, signatures, review, and audit history.",
    canonicalRoute: (id) => `/program/certifications?packet=${encodeURIComponent(id)}`,
    defaultMode: "compliance",
    supportedModes: ["overview", "compliance", "documents", "communication"],
    permission: permission(["admin.workflows"]),
    relationships: [
      relationship("certification.programCase", "Program case", "certification_packet", "program_case", "one"),
      relationship("certification.documents", "Documents", "certification_packet", "document", "many"),
      relationship("certification.messages", "Messages", "certification_packet", "message_thread", "many")
    ],
    widgets: ["certification.summary", "document.requirements", "signature.status", "certification.timeline"],
    commands: ["certification.requestDocument", "certification.review", "certification.approve", "certification.deny"]
  }
} satisfies Record<WorkspaceEntityType, WorkspaceEntityDefinition>;

export const workspaceEntityTypes = Object.keys(workspaceEntityRegistry) as WorkspaceEntityType[];

export function getWorkspaceEntityDefinition(type: WorkspaceEntityType): WorkspaceEntityDefinition {
  return workspaceEntityRegistry[type];
}

export function getWorkspaceEntityLabel(type: WorkspaceEntityType, options?: { plural?: boolean }): string {
  const definition = getWorkspaceEntityDefinition(type);
  return options?.plural ? definition.pluralLabel : definition.label;
}

export function getWorkspaceEntityRoute(entity: Pick<WorkspaceEntityRef, "type" | "id">): string | undefined {
  const definition = getWorkspaceEntityDefinition(entity.type);
  return definition.canonicalRoute?.(entity.id);
}

export function getWorkspaceEntityRelationships(type: WorkspaceEntityType): WorkspaceRelationshipDefinition[] {
  return getWorkspaceEntityDefinition(type).relationships ?? [];
}

export function getWorkspaceRelatedEntityTypes(type: WorkspaceEntityType): WorkspaceEntityType[] {
  return Array.from(new Set(getWorkspaceEntityRelationships(type).map((item) => item.to)));
}

export function supportsWorkspaceMode(type: WorkspaceEntityType, mode: WorkspaceMode): boolean {
  return getWorkspaceEntityDefinition(type).supportedModes.includes(mode);
}

export function resolveWorkspaceMode(type: WorkspaceEntityType, requestedMode?: WorkspaceMode): WorkspaceMode {
  const definition = getWorkspaceEntityDefinition(type);
  if (requestedMode && supportsWorkspaceMode(type, requestedMode)) {
    return requestedMode;
  }

  return definition.defaultMode;
}

export function getWorkspaceEntityWidgetKeys(type: WorkspaceEntityType): string[] {
  return getWorkspaceEntityDefinition(type).widgets ?? [];
}

export function getWorkspaceEntityCommandKeys(type: WorkspaceEntityType): string[] {
  return getWorkspaceEntityDefinition(type).commands ?? [];
}
