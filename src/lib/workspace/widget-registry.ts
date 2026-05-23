import type {
  WorkspaceEntityType,
  WorkspaceMode,
  WorkspacePermissionRequirement,
  WorkspaceWidgetDefinition,
  WorkspaceWidgetKind,
  WorkspaceWidgetSize
} from "@/lib/workspace/types";

type WidgetOptions = {
  key: string;
  label: string;
  kind: WorkspaceWidgetKind;
  entityTypes: WorkspaceEntityType[];
  modes: WorkspaceMode[];
  defaultSize?: WorkspaceWidgetSize;
  description?: string;
  dataDependencies?: string[];
  actions?: string[];
  permission?: WorkspacePermissionRequirement;
};

type ResolveWorkspaceWidgetsInput = {
  keys?: string[];
  entityType: WorkspaceEntityType;
  mode: WorkspaceMode;
  permissions?: string[];
};

const allCoreModes: WorkspaceMode[] = ["overview", "leasing", "resident", "financial", "maintenance", "inspection", "documents", "communication", "executive", "compliance"];
const propertyModes: WorkspaceMode[] = ["overview", "leasing", "resident", "financial", "maintenance", "inspection", "documents", "communication", "executive"];
const leasingModes: WorkspaceMode[] = ["overview", "leasing", "documents", "communication"];
const residentModes: WorkspaceMode[] = ["overview", "resident", "financial", "maintenance", "documents", "communication"];
const financialModes: WorkspaceMode[] = ["overview", "financial", "resident", "executive"];
const maintenanceModes: WorkspaceMode[] = ["overview", "maintenance", "financial", "documents", "communication", "mobile_field"];
const inspectionModes: WorkspaceMode[] = ["overview", "inspection", "maintenance", "documents", "communication", "mobile_field", "compliance"];
const programModes: WorkspaceMode[] = ["overview", "compliance", "documents", "communication", "financial"];
const documentModes: WorkspaceMode[] = ["overview", "documents", "communication", "compliance"];

const permission = (anyOf: string[]): WorkspacePermissionRequirement => ({ anyOf });

const widget = (options: WidgetOptions): WorkspaceWidgetDefinition => ({
  key: options.key,
  label: options.label,
  kind: options.kind,
  entityTypes: options.entityTypes,
  modes: options.modes,
  defaultSize: options.defaultSize ?? "md",
  description: options.description,
  dataDependencies: options.dataDependencies,
  actions: options.actions,
  permission: options.permission
});

export const workspaceWidgetRegistry: Record<string, WorkspaceWidgetDefinition> = {
  "access.summary": widget({ key: "access.summary", label: "Access summary", kind: "summary", entityTypes: ["organization"], modes: ["overview", "executive", "compliance"], defaultSize: "lg", description: "Organization users, roles, invitations, and access exceptions.", dataDependencies: ["organization.users", "access.requests"], permission: permission(["admin.users"]) }),
  "activity.stream": widget({ key: "activity.stream", label: "Activity stream", kind: "timeline", entityTypes: ["unit"], modes: allCoreModes, defaultSize: "full", description: "Chronological workspace activity from the shared event stream.", dataDependencies: ["workspace.events"] }),
  "affordability.review": widget({ key: "affordability.review", label: "Affordability review", kind: "summary", entityTypes: ["voucher"], modes: programModes, defaultSize: "lg", description: "Payment standard, utility allowance, gross rent, and review result.", dataDependencies: ["affordability.calculation"], permission: permission(["admin.workflows"]) }),
  "applicant.profile": widget({ key: "applicant.profile", label: "Applicant profile", kind: "summary", entityTypes: ["applicant"], modes: leasingModes, defaultSize: "lg", description: "Reusable renter profile summary, household, income, and readiness status.", dataDependencies: ["applicant.profile"], permission: permission(["landlord.applications"]) }),
  "application.missingItems": widget({ key: "application.missingItems", label: "Missing items", kind: "summary", entityTypes: ["application"], modes: leasingModes, description: "Documents, signatures, payments, or screening steps still needed.", dataDependencies: ["application.requirements"], actions: ["application.requestUpdate"], permission: permission(["landlord.applications"]) }),
  "application.progress": widget({ key: "application.progress", label: "Application progress", kind: "metric", entityTypes: ["applicant"], modes: leasingModes, description: "Application completion and submission readiness.", dataDependencies: ["application.status"] }),
  "application.summary": widget({ key: "application.summary", label: "Application summary", kind: "summary", entityTypes: ["application"], modes: leasingModes, defaultSize: "lg", description: "Applicant, unit, status, missing items, and review posture.", dataDependencies: ["application", "applicant", "unit"], permission: permission(["landlord.applications"]) }),
  "application.timeline": widget({ key: "application.timeline", label: "Application timeline", kind: "timeline", entityTypes: ["application"], modes: leasingModes, defaultSize: "lg", description: "Application events, messages, document changes, and decisions.", dataDependencies: ["workspace.events"] }),
  "approval.status": widget({ key: "approval.status", label: "Approval status", kind: "approval", entityTypes: ["vendor_invoice"], modes: maintenanceModes, description: "Invoice or estimate approval state and decision history.", dataDependencies: ["vendorInvoice.approvals"], actions: ["vendorInvoice.approve", "vendorInvoice.deny"], permission: permission(["landlord.vendors"]) }),
  "case.timeline": widget({ key: "case.timeline", label: "Case timeline", kind: "timeline", entityTypes: ["program_case"], modes: programModes, defaultSize: "lg", description: "Program case events across RFTA, documents, inspections, subsidy, and messages.", dataDependencies: ["workspace.events"] }),
  "certification.summary": widget({ key: "certification.summary", label: "Certification summary", kind: "summary", entityTypes: ["certification_packet"], modes: programModes, defaultSize: "lg", description: "Certification type, status, due date, reviewer, and next steps.", dataDependencies: ["certification.packet"], permission: permission(["admin.workflows"]) }),
  "certification.timeline": widget({ key: "certification.timeline", label: "Certification timeline", kind: "timeline", entityTypes: ["certification_packet"], modes: programModes, defaultSize: "lg", description: "Certification document, signature, review, approval, and denial events.", dataDependencies: ["workspace.events"] }),
  "conversation.actions": widget({ key: "conversation.actions", label: "Conversation actions", kind: "message", entityTypes: ["message_thread"], modes: ["overview", "communication", "leasing", "resident", "maintenance", "compliance"], description: "Reply, assign, resolve, or open the linked record.", dataDependencies: ["message.thread"], actions: ["message.reply", "message.assign", "message.markResolved"], permission: permission(["landlord.inbox", "tenant.messages", "caseworker.messages"]) }),
  "correction.queue": widget({ key: "correction.queue", label: "Correction queue", kind: "table", entityTypes: ["inspection"], modes: inspectionModes, defaultSize: "lg", description: "Failed inspection corrections, due dates, owners, and linked work orders.", dataDependencies: ["inspection.corrections"], actions: ["inspection.scheduleReinspection"], permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "decision.panel": widget({ key: "decision.panel", label: "Decision panel", kind: "approval", entityTypes: ["application"], modes: leasingModes, defaultSize: "lg", description: "Fair-housing-safe application decision actions and required notes.", dataDependencies: ["application.decision"], actions: ["application.approve", "application.conditionallyApprove", "application.deny"], permission: permission(["landlord.applications"]) }),
  "deposit.liability": widget({ key: "deposit.liability", label: "Deposit liability", kind: "metric", entityTypes: ["ledger"], modes: financialModes, description: "Deposit charges, holdings, refunds, and liability balance.", dataDependencies: ["ledger.deposit"], permission: permission(["landlord.ledger"]) }),
  "document.preview": widget({ key: "document.preview", label: "Document preview", kind: "document_preview", entityTypes: ["document", "vendor_invoice"], modes: documentModes, defaultSize: "lg", description: "Preview or open a document without leaving workspace context.", dataDependencies: ["document.file"], actions: ["document.download"] }),
  "document.requests": widget({ key: "document.requests", label: "Document requests", kind: "table", entityTypes: ["program_case"], modes: programModes, description: "Requested, missing, submitted, accepted, and rejected case documents.", dataDependencies: ["document.requests"], actions: ["programCase.requestDocument"], permission: permission(["admin.workflows", "caseworker.documents"]) }),
  "document.requirements": widget({ key: "document.requirements", label: "Document requirements", kind: "table", entityTypes: ["certification_packet"], modes: programModes, description: "Certification document requirements by household member and review status.", dataDependencies: ["certification.requirements"], permission: permission(["admin.workflows"]) }),
  "document.sharing": widget({ key: "document.sharing", label: "Sharing", kind: "approval", entityTypes: ["document"], modes: documentModes, description: "Shared, private, revoked, and expired access state.", dataDependencies: ["document.shares"], actions: ["document.share", "document.revoke"], permission: permission(["landlord.documents", "admin.command-center"]) }),
  "document.timeline": widget({ key: "document.timeline", label: "Document timeline", kind: "timeline", entityTypes: ["unit", "lease", "document"], modes: documentModes, defaultSize: "lg", description: "Uploaded, shared, signed, revoked, replaced, and expired document events.", dataDependencies: ["workspace.events"] }),
  "document.wallet": widget({ key: "document.wallet", label: "Document wallet", kind: "table", entityTypes: ["applicant", "tenant"], modes: ["overview", "leasing", "resident", "documents"], description: "Reusable profile, application, lease, resident, and requested documents.", dataDependencies: ["documents"], actions: ["tenant.uploadDocument", "applicant.requestDocument"] }),
  "entity.context": widget({ key: "entity.context", label: "Linked record context", kind: "summary", entityTypes: ["message_thread"], modes: ["overview", "communication"], description: "The property, unit, application, work order, or program case behind a conversation.", dataDependencies: ["message.linkedEntity"] }),
  "estimate.status": widget({ key: "estimate.status", label: "Estimate status", kind: "approval", entityTypes: ["work_order"], modes: maintenanceModes, description: "Vendor estimate submission, review, decision, and revision state.", dataDependencies: ["workOrder.estimate"], actions: ["workOrder.submitEstimate"], permission: permission(["landlord.maintenance", "vendor.jobs"]) }),
  "financial.rollup": widget({ key: "financial.rollup", label: "Financial rollup", kind: "metric", entityTypes: ["property"], modes: propertyModes, defaultSize: "lg", description: "Rent due, collections, balances, deposits, and owner-facing financial summary.", dataDependencies: ["property.financials"], permission: permission(["landlord.ledger", "landlord.payments"]) }),
  "hap.summary": widget({ key: "hap.summary", label: "HAP summary", kind: "summary", entityTypes: ["hap_contract"], modes: ["overview", "financial", "compliance"], defaultSize: "lg", description: "Contract rent, tenant portion, subsidy portion, status, and dates.", dataDependencies: ["hap.contract"], permission: permission(["admin.workflows", "landlord.ledger"]) }),
  "inspection.checklist": widget({ key: "inspection.checklist", label: "Inspection checklist", kind: "inspector", entityTypes: ["inspection"], modes: inspectionModes, defaultSize: "full", description: "Checklist sections, required items, pass/fail controls, and review state.", dataDependencies: ["inspection.template", "inspection.results"], actions: ["inspection.recordResults"], permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "inspection.evidence": widget({ key: "inspection.evidence", label: "Photo evidence", kind: "media", entityTypes: ["inspection"], modes: inspectionModes, description: "Inspection photos, files, report attachments, and evidence notes.", dataDependencies: ["inspection.evidence"], actions: ["inspection.uploadReport"] }),
  "inspection.report": widget({ key: "inspection.report", label: "Inspection report", kind: "document_preview", entityTypes: ["inspection"], modes: inspectionModes, description: "Generated or uploaded inspection report and visibility state.", dataDependencies: ["inspection.report", "document.file"] }),
  "inspection.status": widget({ key: "inspection.status", label: "Inspection status", kind: "summary", entityTypes: ["unit"], modes: propertyModes, description: "Latest, scheduled, failed, due, or reinspection status for the unit.", dataDependencies: ["unit.inspections"], actions: ["unit.scheduleInspection"], permission: permission(["landlord.inspections"]) }),
  "inspection.summary": widget({ key: "inspection.summary", label: "Inspection summary", kind: "summary", entityTypes: ["inspection"], modes: inspectionModes, defaultSize: "lg", description: "Inspection type, assignment, due date, result, and required corrections.", dataDependencies: ["inspection"], permission: permission(["landlord.inspections", "inspector.assignments"]) }),
  "integration.health": widget({ key: "integration.health", label: "Integration health", kind: "summary", entityTypes: ["organization"], modes: ["overview", "executive", "compliance"], description: "Connected, degraded, failed, and action-needed integrations.", dataDependencies: ["integration.connections"], permission: permission(["admin.integrations"]) }),
  "invoice.status": widget({ key: "invoice.status", label: "Invoice status", kind: "approval", entityTypes: ["work_order"], modes: maintenanceModes, description: "Vendor invoice submission, approval, denial, and payout readiness.", dataDependencies: ["workOrder.invoice"], actions: ["workOrder.submitInvoice"], permission: permission(["landlord.maintenance", "vendor.invoices"]) }),
  "lead.card": widget({ key: "lead.card", label: "Lead card", kind: "summary", entityTypes: ["lead"], modes: leasingModes, description: "Prospect, unit, stage, tour, application, assignment, and next action.", dataDependencies: ["lead"], actions: ["lead.reply", "lead.scheduleTour"], permission: permission(["landlord.inbox"]) }),
  "lease.status": widget({ key: "lease.status", label: "Lease status", kind: "summary", entityTypes: ["unit", "tenant"], modes: residentModes, description: "Current lease, dates, rent, renewal, and signature state.", dataDependencies: ["lease"], actions: ["lease.renew", "lease.sendForSignature"], permission: permission(["landlord.leases", "tenant.lease"]) }),
  "lease.summary": widget({ key: "lease.summary", label: "Lease summary", kind: "summary", entityTypes: ["lease"], modes: residentModes, defaultSize: "lg", description: "Lease term, rent, deposit, signers, documents, renewals, and key dates.", dataDependencies: ["lease"], permission: permission(["landlord.leases", "tenant.lease"]) }),
  "leasing.pipeline": widget({ key: "leasing.pipeline", label: "Leasing pipeline", kind: "board", entityTypes: ["lead"], modes: leasingModes, defaultSize: "full", description: "Lead stages from inquiry through application, approval, lease, and conversion.", dataDependencies: ["lead.pipeline"], actions: ["lead.inviteToApply", "lead.close"], permission: permission(["landlord.inbox"]) }),
  "ledger.summary": widget({ key: "ledger.summary", label: "Ledger summary", kind: "summary", entityTypes: ["unit", "ledger"], modes: financialModes, defaultSize: "lg", description: "Current balance, monthly rent, charges, payments, credits, and deposits.", dataDependencies: ["ledger"], actions: ["ledger.recordPayment", "ledger.addCharge"], permission: permission(["landlord.ledger", "tenant.rent"]) }),
  "listing.status": widget({ key: "listing.status", label: "Listing status", kind: "summary", entityTypes: ["unit"], modes: propertyModes, defaultSize: "lg", description: "Marketing status, public visibility, rent, availability, description, and publish readiness.", dataDependencies: ["listing"], actions: ["unit.editListing"], permission: permission(["landlord.listings", "landlord.units"]) }),
  "maintenance.history": widget({ key: "maintenance.history", label: "Maintenance history", kind: "table", entityTypes: ["tenant"], modes: residentModes, description: "Resident repair request history and active work orders.", dataDependencies: ["tenant.maintenanceRequests"], permission: permission(["landlord.maintenance", "tenant.maintenance"]) }),
  "maintenance.issueSummary": widget({ key: "maintenance.issueSummary", label: "Issue summary", kind: "summary", entityTypes: ["maintenance_request"], modes: maintenanceModes, defaultSize: "lg", description: "Request title, priority, location, description, access notes, and reporter.", dataDependencies: ["maintenance.request"] }),
  "maintenance.media": widget({ key: "maintenance.media", label: "Maintenance media", kind: "media", entityTypes: ["maintenance_request"], modes: maintenanceModes, description: "Photos, videos, documents, and work-order attachments.", dataDependencies: ["maintenance.attachments"], actions: ["tenant.uploadDocument"] }),
  "maintenance.queue": widget({ key: "maintenance.queue", label: "Maintenance queue", kind: "table", entityTypes: ["unit"], modes: propertyModes, defaultSize: "lg", description: "Open requests, priorities, assignments, status, and next actions.", dataDependencies: ["unit.maintenanceRequests"], actions: ["unit.createWorkOrder"], permission: permission(["landlord.maintenance"]) }),
  "maintenance.rollup": widget({ key: "maintenance.rollup", label: "Maintenance rollup", kind: "metric", entityTypes: ["property"], modes: propertyModes, description: "Open requests, urgent jobs, vendor assignments, and aging work orders.", dataDependencies: ["property.maintenance"], permission: permission(["landlord.maintenance"]) }),
  "message.thread": widget({ key: "message.thread", label: "Message thread", kind: "message", entityTypes: ["lead", "maintenance_request", "message_thread"], modes: ["overview", "leasing", "resident", "maintenance", "communication", "compliance"], defaultSize: "lg", description: "Conversation history and reply composer for the linked record.", dataDependencies: ["message.thread"], actions: ["message.reply"], permission: permission(["landlord.inbox", "tenant.messages", "caseworker.messages"]) }),
  "occupancy.metrics": widget({ key: "occupancy.metrics", label: "Occupancy metrics", kind: "metric", entityTypes: ["property"], modes: propertyModes, description: "Occupied, vacant, listed, unlisted, lease-expiring, and delinquent unit counts.", dataDependencies: ["property.units"], permission: permission(["landlord.units"]) }),
  "organization.summary": widget({ key: "organization.summary", label: "Organization summary", kind: "summary", entityTypes: ["organization"], modes: ["overview", "executive", "compliance"], defaultSize: "lg", description: "Organization profile, scope, staff, settings, and operational status.", dataDependencies: ["organization"], permission: permission(["admin.command-center"]) }),
  "ownerStatement.lines": widget({ key: "ownerStatement.lines", label: "Statement lines", kind: "table", entityTypes: ["owner_statement"], modes: financialModes, defaultSize: "lg", description: "Rent, fees, expenses, maintenance, distributions, and ending balance.", dataDependencies: ["ownerStatement.lines"], permission: permission(["landlord.reports", "admin.reports"]) }),
  "ownerStatement.summary": widget({ key: "ownerStatement.summary", label: "Owner statement summary", kind: "summary", entityTypes: ["owner_statement"], modes: financialModes, defaultSize: "lg", description: "Statement period, property, owner, status, distribution, and totals.", dataDependencies: ["ownerStatement"], permission: permission(["landlord.reports", "admin.reports"]) }),
  "payment.summary": widget({ key: "payment.summary", label: "Payment summary", kind: "summary", entityTypes: ["payment", "tenant"], modes: financialModes, description: "Amount, status, receipt, method, reconciliation, and related ledger.", dataDependencies: ["payment"], permission: permission(["landlord.payments", "tenant.rent"]) }),
  "payout.readiness": widget({ key: "payout.readiness", label: "Payout readiness", kind: "approval", entityTypes: ["vendor_invoice"], modes: financialModes, description: "Whether an approved vendor invoice is ready for payment processing.", dataDependencies: ["vendorInvoice.payout"], permission: permission(["landlord.vendors"]) }),
  "portfolio.metrics": widget({ key: "portfolio.metrics", label: "Portfolio metrics", kind: "metric", entityTypes: ["organization"], modes: ["overview", "executive", "financial"], defaultSize: "lg", description: "Portfolio occupancy, rent, balances, maintenance, and workflow health.", dataDependencies: ["organization.portfolio"], permission: permission(["admin.reports", "landlord.reports"]) }),
  "programCase.summary": widget({ key: "programCase.summary", label: "Program case summary", kind: "summary", entityTypes: ["program_case"], modes: programModes, defaultSize: "lg", description: "Participant, program, voucher, RFTA, documents, inspection, and subsidy milestones.", dataDependencies: ["program.case"], permission: permission(["admin.workflows", "caseworker.clients"]) }),
  "property.summary": widget({ key: "property.summary", label: "Property summary", kind: "summary", entityTypes: ["property"], modes: propertyModes, defaultSize: "lg", description: "Property identity, address, portfolio, unit count, and operational status.", dataDependencies: ["property"], permission: permission(["landlord.properties", "landlord.units"]) }),
  "receipt.preview": widget({ key: "receipt.preview", label: "Receipt preview", kind: "document_preview", entityTypes: ["payment"], modes: financialModes, description: "Receipt, payment confirmation, and downloadable proof.", dataDependencies: ["payment.receipt"], actions: ["payment.viewReceipt"] }),
  "reconciliation.status": widget({ key: "reconciliation.status", label: "Reconciliation status", kind: "summary", entityTypes: ["payment"], modes: financialModes, description: "Provider event, ledger posting, payout, refund, dispute, or batch reconciliation state.", dataDependencies: ["payment.reconciliation"], permission: permission(["landlord.payments"]) }),
  "renewal.status": widget({ key: "renewal.status", label: "Renewal status", kind: "summary", entityTypes: ["lease"], modes: residentModes, description: "Renewal window, offers, signatures, notices, and next action.", dataDependencies: ["lease.renewal"], actions: ["lease.renew"], permission: permission(["landlord.leases"]) }),
  "resident.profile": widget({ key: "resident.profile", label: "Resident profile", kind: "summary", entityTypes: ["tenant"], modes: residentModes, defaultSize: "lg", description: "Resident, household, contact, lease, balance, and service context.", dataDependencies: ["tenant.profile"], actions: ["tenant.message"], permission: permission(["landlord.tenants", "tenant.dashboard"]) }),
  "resident.status": widget({ key: "resident.status", label: "Resident status", kind: "summary", entityTypes: ["unit"], modes: propertyModes, description: "Vacancy, occupancy, current resident, household, and move-in/move-out status.", dataDependencies: ["unit.tenant"], actions: ["unit.reviewApplication"], permission: permission(["landlord.tenants", "landlord.units"]) }),
  "rfta.status": widget({ key: "rfta.status", label: "RFTA status", kind: "summary", entityTypes: ["program_case"], modes: programModes, description: "Packet stage, missing items, landlord tasks, signatures, and review state.", dataDependencies: ["rfta"], actions: ["programCase.reviewRfta"], permission: permission(["admin.workflows", "caseworker.applications"]) }),
  "screening.status": widget({ key: "screening.status", label: "Screening status", kind: "summary", entityTypes: ["applicant", "application"], modes: leasingModes, description: "Provider-agnostic screening request, authorization, status, and protected summary.", dataDependencies: ["screening.summary"], permission: permission(["landlord.screening", "landlord.applications"]) }),
  "showing.status": widget({ key: "showing.status", label: "Showing status", kind: "summary", entityTypes: ["lead"], modes: leasingModes, description: "Tour request, scheduled time, staff assignment, no-show, and follow-up status.", dataDependencies: ["showing"], actions: ["lead.scheduleTour"], permission: permission(["landlord.inbox"]) }),
  "signature.queue": widget({ key: "signature.queue", label: "Signature queue", kind: "table", entityTypes: ["lease"], modes: residentModes, description: "Pending applicant, tenant, landlord, owner, or program signatures.", dataDependencies: ["signatures"], actions: ["lease.sendForSignature"], permission: permission(["landlord.leases", "tenant.lease"]) }),
  "signature.status": widget({ key: "signature.status", label: "Signature status", kind: "summary", entityTypes: ["document", "certification_packet"], modes: documentModes, description: "Signature routing, pending signers, completion, countersignature, and expiration.", dataDependencies: ["signatures"], permission: permission(["landlord.documents", "tenant.documents", "admin.workflows"]) }),
  "statement.document": widget({ key: "statement.document", label: "Statement document", kind: "document_preview", entityTypes: ["owner_statement"], modes: financialModes, description: "Shared owner statement document and download state.", dataDependencies: ["ownerStatement.document"], actions: ["ownerStatement.download"], permission: permission(["landlord.reports", "admin.reports"]) }),
  "subsidy.holds": widget({ key: "subsidy.holds", label: "Subsidy holds", kind: "table", entityTypes: ["hap_contract"], modes: programModes, description: "Active and resolved subsidy holds, reasons, dates, and linked issues.", dataDependencies: ["subsidy.holds"], actions: ["hap.reviewHold"], permission: permission(["admin.workflows"]) }),
  "subsidy.receipts": widget({ key: "subsidy.receipts", label: "Subsidy receipts", kind: "table", entityTypes: ["hap_contract"], modes: programModes, description: "Received subsidy payments by period, reference, source, and ledger linkage.", dataDependencies: ["subsidy.receipts"], actions: ["hap.recordReceipt"], permission: permission(["admin.workflows", "landlord.ledger"]) }),
  "subsidy.schedule": widget({ key: "subsidy.schedule", label: "Subsidy schedule", kind: "table", entityTypes: ["hap_contract"], modes: programModes, description: "Expected subsidy lines by month or rent period.", dataDependencies: ["subsidy.schedule"], permission: permission(["admin.workflows", "landlord.ledger"]) }),
  "subsidy.summary": widget({ key: "subsidy.summary", label: "Subsidy summary", kind: "summary", entityTypes: ["ledger", "program_case"], modes: programModes, description: "Expected, received, outstanding, held, and adjusted subsidy balances.", dataDependencies: ["subsidy.summary"], permission: permission(["admin.workflows", "landlord.ledger"]) }),
  "transaction.table": widget({ key: "transaction.table", label: "Transactions", kind: "table", entityTypes: ["ledger"], modes: financialModes, defaultSize: "full", description: "Posted charges, payments, credits, late fees, refunds, voids, and reversals.", dataDependencies: ["ledger.transactions"], actions: ["ledger.export"], permission: permission(["landlord.ledger", "tenant.rent"]) }),
  "unit.rollup": widget({ key: "unit.rollup", label: "Unit rollup", kind: "table", entityTypes: ["property"], modes: propertyModes, defaultSize: "full", description: "Units under a property with status, rent, occupancy, applications, maintenance, and inspections.", dataDependencies: ["property.units"], permission: permission(["landlord.units"]) }),
  "unit.summary": widget({ key: "unit.summary", label: "Unit summary", kind: "summary", entityTypes: ["unit"], modes: propertyModes, defaultSize: "lg", description: "Unit identity, property, rent, occupancy, marketing, balance, lease, and work status.", dataDependencies: ["unit"], permission: permission(["landlord.units"]) }),
  "vendor.assignment": widget({ key: "vendor.assignment", label: "Vendor assignment", kind: "summary", entityTypes: ["work_order"], modes: maintenanceModes, description: "Assigned vendor, schedule, acceptance, access notes, and field status.", dataDependencies: ["workOrder.assignment"], actions: ["workOrder.accept", "workOrder.schedule"], permission: permission(["landlord.maintenance", "vendor.jobs"]) }),
  "vendorInvoice.summary": widget({ key: "vendorInvoice.summary", label: "Vendor invoice summary", kind: "summary", entityTypes: ["vendor_invoice"], modes: financialModes, defaultSize: "lg", description: "Invoice number, vendor, amount, status, approval, documents, and payout readiness.", dataDependencies: ["vendorInvoice"], permission: permission(["landlord.vendors", "vendor.invoices"]) }),
  "voucher.expiration": widget({ key: "voucher.expiration", label: "Voucher expiration", kind: "metric", entityTypes: ["voucher"], modes: programModes, description: "Issue, expiration, extension, and urgent deadline status.", dataDependencies: ["voucher"], permission: permission(["admin.workflows"]) }),
  "voucher.status": widget({ key: "voucher.status", label: "Voucher status", kind: "summary", entityTypes: ["program_case"], modes: programModes, description: "Voucher status, bedroom size, authority, expiration, and next action.", dataDependencies: ["voucher"], permission: permission(["admin.workflows", "caseworker.clients"]) }),
  "voucher.summary": widget({ key: "voucher.summary", label: "Voucher summary", kind: "summary", entityTypes: ["voucher"], modes: programModes, defaultSize: "lg", description: "Voucher holder, program, authority, bedroom size, status, and dates.", dataDependencies: ["voucher"], permission: permission(["admin.workflows"]) }),
  "workOrder.media": widget({ key: "workOrder.media", label: "Work order media", kind: "media", entityTypes: ["work_order"], modes: maintenanceModes, description: "Field photos, videos, documents, and completion evidence.", dataDependencies: ["workOrder.attachments"], actions: ["workOrder.uploadMedia"], permission: permission(["landlord.maintenance", "vendor.jobs"]) }),
  "workOrder.status": widget({ key: "workOrder.status", label: "Work order status", kind: "summary", entityTypes: ["maintenance_request"], modes: maintenanceModes, description: "Linked work order lifecycle, assignment, schedule, completion, and next action.", dataDependencies: ["workOrder"], permission: permission(["landlord.maintenance", "tenant.maintenance"]) }),
  "workOrder.summary": widget({ key: "workOrder.summary", label: "Work order summary", kind: "summary", entityTypes: ["work_order"], modes: maintenanceModes, defaultSize: "lg", description: "Issue, property, access, assignment, status, estimate, invoice, and completion state.", dataDependencies: ["workOrder"], actions: ["workOrder.markComplete"], permission: permission(["landlord.maintenance", "vendor.jobs"]) })
};

export const workspaceWidgetKeys = Object.keys(workspaceWidgetRegistry);

export function getWorkspaceWidgetDefinition(key: string): WorkspaceWidgetDefinition | undefined {
  return workspaceWidgetRegistry[key];
}

export function getWorkspaceWidgetsForEntity(entityType: WorkspaceEntityType): WorkspaceWidgetDefinition[] {
  return workspaceWidgetKeys
    .map((key) => workspaceWidgetRegistry[key])
    .filter((definition) => definition.entityTypes.includes(entityType));
}

export function getWorkspaceWidgetsForMode(mode: WorkspaceMode): WorkspaceWidgetDefinition[] {
  return workspaceWidgetKeys
    .map((key) => workspaceWidgetRegistry[key])
    .filter((definition) => definition.modes.includes(mode));
}

export function resolveWorkspaceWidgets(input: ResolveWorkspaceWidgetsInput): WorkspaceWidgetDefinition[] {
  const permissionSet = new Set(input.permissions ?? []);
  const keys = input.keys?.length ? input.keys : workspaceWidgetKeys;

  return keys
    .map((key) => workspaceWidgetRegistry[key])
    .filter((definition): definition is WorkspaceWidgetDefinition => Boolean(definition))
    .filter((definition) => definition.entityTypes.includes(input.entityType))
    .filter((definition) => definition.modes.includes(input.mode))
    .filter((definition) => canUseWorkspaceWidget(definition, permissionSet));
}

export function getMissingWorkspaceWidgetKeys(keys: string[]): string[] {
  return keys.filter((key) => !workspaceWidgetRegistry[key]);
}

function canUseWorkspaceWidget(definition: WorkspaceWidgetDefinition, permissionSet: Set<string>): boolean {
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
