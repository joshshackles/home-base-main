import type { UserRole } from "@prisma/client";
import type { WorkspaceEntityType } from "@/lib/workspace/types";
import type {
  WorkspaceOptionCategory,
  WorkspaceOptionDefinition,
  WorkspaceOptionEntityType,
  WorkspaceOptionPlacement,
  WorkspaceOptionRegion,
  WorkspaceOptionRegistry,
  WorkspaceOptionSize,
  WorkspaceRepresentationType,
  WorkspaceTemplateDefinition
} from "@/lib/workspace/workspace-options";
import type { WorkspaceDensityMode, WorkspaceOptionMode } from "@/lib/workspace/workspace-modes";
import { normalizeWorkspaceOptionMode } from "@/lib/workspace/workspace-modes";

const allModes: WorkspaceOptionMode[] = [
  "overview",
  "property_management",
  "leasing",
  "lease_up",
  "application_review",
  "tenant_services",
  "financial",
  "maintenance",
  "inspection",
  "documents",
  "communication",
  "compliance",
  "executive",
  "admin_operations",
  "public_listing",
  "field_staff",
  "emergency_response"
];

const allDensities: WorkspaceDensityMode[] = [
  "simple_daily",
  "comfortable",
  "operational",
  "analyst",
  "command_center",
  "field_mobile",
  "executive_summary",
  "spreadsheet_heavy",
  "focus",
  "presentation"
];

const allEntities: WorkspaceOptionEntityType[] = [
  "property",
  "unit",
  "resident",
  "applicant",
  "landlord",
  "lease",
  "payment",
  "maintenanceRequest",
  "inspection",
  "document",
  "message",
  "task",
  "vendor",
  "organization",
  "staff",
  "report",
  "auditEvent",
  "workflow",
  "automation"
];

type OptionInput = {
  id: string;
  label: string;
  description: string;
  region: WorkspaceOptionRegion;
  category: WorkspaceOptionCategory;
  supportedModes?: WorkspaceOptionMode[];
  supportedDensityModes?: WorkspaceDensityMode[];
  allowedEntityTypes?: WorkspaceOptionEntityType[];
  requiredPermissions?: string[];
  defaultSize?: WorkspaceOptionSize;
  minSize?: WorkspaceOptionSize;
  preferredPlacement: WorkspaceOptionPlacement;
  representationTypes: WorkspaceRepresentationType[];
  priority?: number;
  isExperimental?: boolean;
  isDefault?: boolean;
};

const option = (input: OptionInput): WorkspaceOptionDefinition => ({
  id: input.id,
  label: input.label,
  description: input.description,
  region: input.region,
  category: input.category,
  supportedModes: input.supportedModes ?? allModes,
  supportedDensityModes: input.supportedDensityModes ?? allDensities,
  allowedEntityTypes: input.allowedEntityTypes ?? allEntities,
  requiredPermissions: input.requiredPermissions ?? [],
  defaultSize: input.defaultSize ?? "md",
  minSize: input.minSize ?? "sm",
  preferredPlacement: input.preferredPlacement,
  representationTypes: input.representationTypes,
  priority: input.priority ?? 50,
  isExperimental: input.isExperimental ?? false,
  isDefault: input.isDefault ?? false
});

export const workflowNavigationOptions: WorkspaceOptionDefinition[] = [
  nav("workflow.propertyOverview", "Property Overview", "Property-level status, ownership, units, listing, finance, and operational summary.", "property", ["overview", "property_management", "executive"], ["property", "unit"], 10),
  nav("workflow.units", "Units", "Rentable doors, occupancy, marketability, rent, and operational state.", "property", ["property_management", "leasing", "maintenance", "inspection"], ["property", "unit"], 11),
  nav("workflow.leasing", "Leasing", "Listing, tour, lead, application, approval, and lease-up workflows.", "leasing", ["leasing", "lease_up", "public_listing"], ["property", "unit", "applicant"], 12),
  nav("workflow.leads", "Leads", "Leasing inquiries, guest cards, source, status, and follow-up work.", "leasing", ["leasing", "communication"], ["unit", "applicant"], 13),
  nav("workflow.applications", "Applications", "Rental applications, missing items, screening status, messages, and decisions.", "leasing", ["leasing", "application_review", "lease_up"], ["unit", "applicant"], 14),
  nav("workflow.tenantRecord", "Tenant Record", "Current resident, household, contact, lease, payments, and service context.", "resident", ["tenant_services", "property_management"], ["unit", "resident"], 15),
  nav("workflow.lease", "Lease", "Lease packet, signatures, dates, terms, renewals, and termination workflow.", "lease", ["tenant_services", "lease_up", "documents"], ["unit", "lease", "resident"], 16),
  nav("workflow.payments", "Payments", "Payments, receipts, failed payments, autopay state, and tenant-facing payment context.", "financial", ["financial", "tenant_services"], ["unit", "resident", "payment"], 17),
  nav("workflow.ledger", "Ledger", "Charges, credits, deposits, subsidy, balances, and transaction history.", "financial", ["financial"], ["unit", "resident", "payment"], 18),
  nav("workflow.maintenance", "Maintenance", "Requests, work orders, assignments, vendor updates, invoices, and repair history.", "maintenance", ["maintenance", "tenant_services", "field_staff", "emergency_response"], ["unit", "maintenanceRequest", "vendor"], 19),
  nav("workflow.inspections", "Inspections", "Schedules, checklists, evidence, reports, corrections, and reinspection.", "inspection", ["inspection", "compliance", "field_staff"], ["unit", "inspection"], 20),
  nav("workflow.documents", "Documents", "Files, lease packets, signatures, sharing, revocation, templates, and audit timeline.", "document", ["documents", "tenant_services", "compliance"], ["unit", "document"], 21),
  nav("workflow.messages", "Messages", "Conversations, assignment, linked context, unread work, and follow-up status.", "communication", ["communication", "leasing", "maintenance", "tenant_services"], ["message", "unit"], 22),
  nav("workflow.timeline", "Timeline", "Activity history, workflow events, audit markers, and related record changes.", "workflow", ["overview", "property_management", "compliance"], ["unit", "property", "auditEvent"], 23),
  nav("workflow.staffContacts", "Staff & Contacts", "Internal staff, owners, vendors, inspectors, caseworkers, and emergency contacts.", "staff", ["property_management", "maintenance", "inspection"], ["unit", "staff", "vendor"], 24),
  nav("workflow.compliance", "Compliance", "Program rules, RFTA, subsidy, certification, inspections, document requests, and audit work.", "compliance", ["compliance"], ["unit", "organization", "workflow"], 25),
  nav("workflow.reports", "Reports", "Saved reports, exports, portfolio metrics, operational summaries, and audit history.", "analytics", ["financial", "executive", "admin_operations"], ["report", "organization"], 26),
  nav("workflow.automations", "Automations", "Rules, triggers, actions, notification routing, and workflow automation controls.", "automation", ["admin_operations", "property_management"], ["automation", "workflow"], 27, true),
  nav("workflow.auditHistory", "Audit History", "Sensitive actions, actor history, exported records, and platform evidence.", "admin", ["admin_operations", "compliance", "financial"], ["auditEvent", "organization"], 28),
  nav("workflow.publicListing", "Public Listing", "Public preview, availability, address privacy, inquiry conversion, and marketplace state.", "leasing", ["public_listing", "leasing"], ["unit", "property"], 29),
  nav("workflow.marketing", "Marketing", "Syndication, source tracking, listing quality, media readiness, and conversion.", "leasing", ["public_listing", "leasing"], ["unit", "property"], 30),
  nav("workflow.photosMedia", "Photos & Media", "Listing media, inspection evidence, maintenance attachments, and field uploads.", "media", ["public_listing", "maintenance", "inspection", "documents"], ["unit", "document", "maintenanceRequest"], 31),
  nav("workflow.vendors", "Vendors", "Vendor directory, assignments, estimates, invoices, and payout readiness.", "maintenance", ["maintenance", "field_staff"], ["vendor", "maintenanceRequest"], 32),
  nav("workflow.workOrders", "Work Orders", "Dispatch queue, schedule, access, field progress, media, invoices, and completion.", "maintenance", ["maintenance", "field_staff", "emergency_response"], ["maintenanceRequest", "vendor"], 33),
  nav("workflow.approvals", "Approvals", "Owner, landlord, manager, vendor invoice, application, and workflow approval queues.", "workflow", ["property_management", "maintenance", "financial", "executive"], ["workflow", "payment", "maintenanceRequest"], 34),
  nav("workflow.fundingSources", "Funding Sources", "Voucher, subsidy, HAP, assistance, owner, and program funding relationships.", "compliance", ["compliance", "financial"], ["organization", "payment"], 35),
  nav("workflow.programRules", "Program Rules", "Assistance program, PHA, compliance, payment standard, and utility allowance rules.", "compliance", ["compliance"], ["organization", "workflow"], 36),
  nav("workflow.notes", "Notes", "Internal notes, public notes, shared notes, case notes, and visibility controls.", "workflow", ["communication", "tenant_services", "compliance"], ["unit", "message", "workflow"], 37),
  nav("workflow.tasks", "Tasks", "Role-safe next actions, assigned work, due dates, overdue items, and workflow queues.", "workflow", ["property_management", "communication", "admin_operations"], ["task", "workflow"], 38),
  nav("workflow.calendar", "Calendar", "Tours, inspections, lease dates, renewal windows, maintenance visits, and due dates.", "workflow", ["leasing", "inspection", "maintenance", "property_management"], ["task", "inspection"], 39),
  nav("workflow.mapView", "Map View", "Map-based inventory, showings, field routes, inspection coverage, and nearby context.", "map", ["property_management", "leasing", "field_staff"], ["property", "unit"], 40),
  nav("workflow.settings", "Settings", "Workspace settings, saved layouts, permissions, workflow preferences, and configuration.", "admin", ["admin_operations", "property_management"], ["organization", "automation"], 41)
];

export const primaryCanvasOptions: WorkspaceOptionDefinition[] = [
  canvas("canvas.propertySummary", "Property summary panel", "Open operating summary for property, unit, rent, status, owner, and activity.", "property", ["overview", "property_management"], ["property", "unit"], ["card"], "primary", 10, true),
  canvas("canvas.unitRosterSpreadsheet", "Unit roster spreadsheet", "Spreadsheet view of units, rent, status, occupancy, listing, inspection, and maintenance fields.", "property", ["property_management", "financial"], ["property", "unit"], ["spreadsheet", "table"], "primary", 11),
  canvas("canvas.rentRollSpreadsheet", "Rent roll spreadsheet", "Rent roll, balances, deposits, subsidy, payments, lease dates, and exceptions.", "financial", ["financial", "executive"], ["property", "unit", "payment"], ["spreadsheet", "table"], "primary", 12),
  canvas("canvas.applicantPipelineKanban", "Applicant pipeline kanban", "Lead-to-application pipeline with stages, cards, next actions, and assignment.", "leasing", ["leasing", "application_review"], ["unit", "applicant"], ["kanban"], "primary", 13),
  canvas("canvas.maintenanceQueue", "Maintenance queue", "Open repairs, priority, status, vendor, next action, schedule, and aging.", "maintenance", ["maintenance", "emergency_response"], ["unit", "maintenanceRequest"], ["table", "kanban"], "primary", 14),
  canvas("canvas.inspectionChecklist", "Inspection checklist", "Checklist sections, required items, outcomes, evidence, and corrections.", "inspection", ["inspection", "field_staff", "compliance"], ["inspection", "unit"], ["checklist", "form"], "primary", 15),
  canvas("canvas.paymentLedger", "Payment ledger", "Charges, payments, credits, deposits, subsidy, late fees, and transaction controls.", "financial", ["financial", "tenant_services"], ["unit", "resident", "payment"], ["spreadsheet", "table"], "primary", 16),
  canvas("canvas.leaseBuilder", "Lease builder", "Lease packet, terms, addenda, signatures, and document generation flow.", "lease", ["lease_up", "documents", "tenant_services"], ["lease", "unit"], ["form", "document"], "primary", 17),
  canvas("canvas.documentCenter", "Document center", "Documents, categories, sharing, revocation, signature status, previews, and filters.", "document", ["documents", "compliance"], ["document", "unit"], ["document", "table"], "primary", 18),
  canvas("canvas.messageInbox", "Message inbox", "Conversation list, detail, assignment, linked context, unread states, and quick actions.", "communication", ["communication"], ["message", "unit"], ["inbox"], "primary", 19),
  canvas("canvas.timelineStream", "Timeline stream", "Chronological event stream with actor, timestamp, action, related record, and audit cues.", "workflow", ["overview", "compliance", "admin_operations"], ["unit", "auditEvent"], ["timeline"], "primary", 20),
  canvas("canvas.activityFeed", "Activity feed", "Recent important actions, changes, comments, uploads, messages, and workflow events.", "workflow", ["overview", "property_management"], ["unit", "task"], ["timeline", "card"], "secondary", 21),
  canvas("canvas.mapPanel", "Map panel", "Map view for properties, units, field routes, inspections, nearby features, and service areas.", "map", ["property_management", "field_staff", "public_listing"], ["property", "unit"], ["map"], "primary", 22),
  canvas("canvas.photoGallery", "Photo gallery", "Listing photos, unit media, repair photos, inspection evidence, and upload review.", "media", ["public_listing", "maintenance", "inspection", "documents"], ["unit", "document"], ["media"], "primary", 23),
  canvas("canvas.listingReadinessChecklist", "Listing readiness checklist", "Completeness, photos, address privacy, fees, policies, amenities, and publish blockers.", "leasing", ["public_listing", "leasing"], ["unit", "property"], ["checklist"], "primary", 24),
  canvas("canvas.publicListingPreview", "Public listing preview", "Marketplace-ready public listing preview with conversion and privacy checks.", "leasing", ["public_listing", "leasing"], ["unit", "property"], ["card", "media"], "primary", 25),
  canvas("canvas.financialTermsPanel", "Financial terms panel", "Rent, deposit, fees, utilities, due day, late fee policy, move-in cost, and lease terms.", "financial", ["leasing", "financial", "tenant_services"], ["unit", "lease"], ["card", "form"], "secondary", 26),
  canvas("canvas.tenantProfilePanel", "Tenant profile panel", "Resident contact, household, lease status, balance, documents, and service summary.", "resident", ["tenant_services", "property_management"], ["resident", "unit"], ["card"], "secondary", 27),
  canvas("canvas.landlordProfilePanel", "Landlord profile panel", "Landlord, owner, property manager, team, and contact context.", "staff", ["property_management", "communication"], ["landlord", "staff", "organization"], ["card"], "secondary", 28),
  canvas("canvas.vendorDispatchBoard", "Vendor dispatch board", "Vendor assignments, acceptance, schedules, estimates, invoices, and completion.", "maintenance", ["maintenance", "field_staff"], ["vendor", "maintenanceRequest"], ["kanban"], "primary", 29),
  canvas("canvas.workOrderIntake", "Work order intake", "Repair intake with title, category, priority, access notes, media, and submission status.", "maintenance", ["maintenance", "tenant_services", "emergency_response"], ["maintenanceRequest", "unit"], ["form"], "floating", 30),
  canvas("canvas.repairHistory", "Repair history", "Past maintenance, vendors, costs, media, completion notes, and recurring issues.", "maintenance", ["maintenance", "property_management"], ["unit", "maintenanceRequest"], ["timeline", "table"], "secondary", 31),
  canvas("canvas.occupancyTracker", "Occupancy tracker", "Occupied, vacant, notice, move-in, move-out, renewal, and turn status.", "property", ["property_management", "executive"], ["property", "unit"], ["chart", "table"], "primary", 32),
  canvas("canvas.complianceTracker", "Compliance tracker", "Program cases, inspections, documents, certifications, deadlines, and audit issues.", "compliance", ["compliance"], ["organization", "workflow"], ["table", "checklist"], "primary", 33),
  canvas("canvas.renewalTracker", "Renewal tracker", "Lease expirations, renewal windows, offers, signatures, notices, and resident responses.", "lease", ["tenant_services", "financial", "property_management"], ["lease", "resident"], ["table", "timeline"], "secondary", 34),
  canvas("canvas.vacancyTracker", "Vacancy tracker", "Vacancy, turn, listing readiness, marketing, tour, application, and lease-up state.", "leasing", ["leasing", "property_management", "lease_up"], ["unit", "property"], ["kanban", "table"], "primary", 35),
  canvas("canvas.leadSourceAnalytics", "Lead source analytics", "Lead source, conversion, tour rate, application rate, and marketing quality.", "analytics", ["leasing", "executive"], ["unit", "report"], ["chart"], "secondary", 36),
  canvas("canvas.showingCalendar", "Showing calendar", "Tours, open houses, virtual showings, staff assignment, and no-show follow-up.", "leasing", ["leasing"], ["unit", "task"], ["timeline"], "primary", 37),
  canvas("canvas.taskBoard", "Task board", "Assigned tasks, due dates, owner, status, priority, and next-action movement.", "workflow", ["property_management", "communication", "admin_operations"], ["task", "workflow"], ["kanban"], "primary", 38),
  canvas("canvas.approvalQueue", "Approval queue", "Application, owner, invoice, maintenance, refund, and workflow approvals.", "workflow", ["property_management", "financial", "executive"], ["workflow", "payment"], ["table", "workflow"], "primary", 39),
  canvas("canvas.bulkActionTable", "Bulk action table", "Select, filter, update, archive, export, and process records safely.", "workflow", ["property_management", "admin_operations", "financial"], allEntities, ["spreadsheet", "table"], "primary", 40),
  canvas("canvas.commandConsole", "Command console", "Keyboard-first command surface for quick actions, search, navigation, and workflows.", "admin", ["admin_operations"], allEntities, ["command"], "bottomConsole", 41, true),
  canvas("canvas.reportBuilder", "Report builder", "Saved report filters, columns, exports, schedules, and audit history.", "analytics", ["financial", "executive", "admin_operations"], ["report", "organization"], ["form", "table"], "primary", 42),
  canvas("canvas.workflowBuilder", "Workflow builder", "Workflow stages, conditions, transitions, permissions, next actions, and events.", "automation", ["admin_operations"], ["workflow", "automation"], ["workflow", "form"], "primary", 43, true),
  canvas("canvas.automationRulesPanel", "Automation rules panel", "Automation triggers, conditions, actions, notification routing, and delivery state.", "automation", ["admin_operations", "property_management"], ["automation", "workflow"], ["table", "form"], "secondary", 44, true),
  canvas("canvas.savedViewsPanel", "Saved views panel", "Saved filters, layout preferences, quick views, columns, sort, and team defaults.", "workflow", ["property_management", "financial"], allEntities, ["card", "table"], "rightSidebar", 45),
  canvas("canvas.auditLogViewer", "Audit log viewer", "Sensitive changes, exports, impersonation, API access, actor, and evidence review.", "admin", ["admin_operations", "compliance", "financial"], ["auditEvent", "organization"], ["table", "timeline"], "primary", 46)
];

export const contextualSidebarOptions: WorkspaceOptionDefinition[] = [
  context("context.nextBestActions", "Next best actions", "Role-safe suggested actions based on workflow state and urgency.", "workflow", ["overview", "property_management", "leasing", "maintenance"], ["workflow", "task"], ["workflow", "button"], 10, true),
  context("context.unresolvedAlerts", "Unresolved alerts", "Open risks, failures, overdue items, warnings, and exception states.", "workflow", ["admin_operations", "maintenance", "emergency_response"], allEntities, ["alert"], 11),
  context("context.missingInformation", "Missing information", "Required fields, documents, signatures, media, and readiness blockers.", "workflow", ["leasing", "application_review", "compliance"], allEntities, ["checklist", "alert"], 12),
  context("context.recentActivity", "Recent activity", "Recent events, actor activity, uploads, messages, status changes, and workflow updates.", "workflow", allModes, allEntities, ["timeline"], 13, true),
  context("context.relatedRecords", "Related records", "Connected records across entity relationships and operational context.", "workflow", allModes, allEntities, ["card", "drawer"], 14),
  context("context.linkedDocuments", "Linked documents", "Documents, reports, files, signatures, and shared attachments connected to this workspace.", "document", ["documents", "compliance", "tenant_services"], ["document", "unit", "lease"], ["document"], 15),
  context("context.openMessages", "Open messages", "Unread and unresolved conversations related to the current entity.", "communication", ["communication", "leasing", "maintenance"], ["message", "unit"], ["inbox"], 16),
  context("context.complianceWarnings", "Compliance warnings", "Program, inspection, certification, subsidy, document, and audit warnings.", "compliance", ["compliance", "admin_operations"], ["workflow", "organization", "unit"], ["alert"], 17),
  context("context.upcomingDeadlines", "Upcoming deadlines", "Lease, inspection, renewal, voucher, document, payment, and task due dates.", "workflow", allModes, ["task", "lease", "inspection"], ["timeline", "alert"], 18),
  context("context.pendingApprovals", "Pending approvals", "Owner, property manager, landlord, application, invoice, refund, and workflow approvals.", "workflow", ["property_management", "financial", "executive"], ["workflow", "payment"], ["workflow", "alert"], 19),
  context("context.workflowProgress", "Workflow progress", "Current workflow stage, completed steps, missing steps, and next milestone.", "workflow", allModes, ["workflow", "unit"], ["workflow", "checklist"], 20),
  context("context.listingHealth", "Listing health", "Readiness, quality, visibility, conversion, photos, pricing, and privacy issues.", "leasing", ["public_listing", "leasing"], ["unit", "property"], ["chart", "checklist"], 21),
  context("context.leaseUpStatus", "Lease-up status", "Application approval, lease, signatures, deposit, move-in, and tenant handoff progress.", "lease", ["lease_up", "application_review"], ["unit", "lease"], ["workflow"], 22),
  context("context.paymentRisk", "Payment risk", "Balances, failed payments, disputes, refunds, delinquency, and subsidy exceptions.", "financial", ["financial", "tenant_services"], ["payment", "resident"], ["alert", "chart"], 23),
  context("context.maintenanceRisk", "Maintenance risk", "High-priority work, aging repairs, repeated issues, access blockers, and vendor delays.", "maintenance", ["maintenance", "emergency_response"], ["maintenanceRequest", "unit"], ["alert", "chart"], 24),
  context("context.inspectionRisk", "Inspection risk", "Failed items, overdue corrections, missing evidence, reinspection, and report gaps.", "inspection", ["inspection", "compliance"], ["inspection", "unit"], ["alert"], 25),
  context("context.tenantStatus", "Tenant status", "Resident standing, lease state, payment state, service requests, and document needs.", "resident", ["tenant_services", "property_management"], ["resident", "unit"], ["card"], 26),
  context("context.applicationStatus", "Application status", "Submission status, missing items, screening, documents, messages, and decision stage.", "leasing", ["application_review", "leasing"], ["applicant", "unit"], ["workflow"], 27),
  context("context.occupancyInsights", "Occupancy insights", "Vacancy, turns, lease expirations, move-ins, renewals, and portfolio trends.", "analytics", ["property_management", "executive"], ["property", "unit"], ["chart"], 28),
  context("context.recommendedAutomations", "Recommended automations", "Automation suggestions based on repeated workflow patterns and risk.", "automation", ["admin_operations", "property_management"], ["automation", "workflow"], ["card"], 29, true),
  context("context.suggestedCommands", "Suggested commands", "Contextual commands ranked by mode, role, urgency, and current entity.", "workflow", allModes, allEntities, ["command"], 30),
  context("context.quickNotes", "Quick notes", "Visibility-safe notes, internal reminders, and lightweight record annotations.", "communication", ["communication", "property_management", "tenant_services"], ["unit", "message"], ["form"], 31),
  context("context.aiSummaryPlaceholder", "AI summary placeholder", "Future AI-generated summary area for operational context and recommended action.", "workflow", allModes, allEntities, ["card"], 32, true),
  context("context.auditSummary", "Audit summary", "Recent sensitive actions, exports, impersonation, access, and evidence status.", "admin", ["admin_operations", "financial", "compliance"], ["auditEvent", "organization"], ["timeline"], 33),
  context("context.dataQualityIssues", "Data quality issues", "Missing, duplicate, stale, conflicting, or invalid data needing review.", "admin", ["admin_operations", "property_management"], ["organization", "workflow"], ["alert"], 34),
  context("context.duplicateRecords", "Duplicate records", "Potential duplicate people, properties, documents, messages, and records.", "admin", ["admin_operations"], ["organization", "auditEvent"], ["alert", "table"], 35),
  context("context.integrationStatus", "Integration status", "Provider health, errors, degraded services, token refresh, and webhook state.", "admin", ["admin_operations"], ["organization", "automation"], ["alert", "card"], 36),
  context("context.recentChanges", "Recent changes", "Recent updates, edits, comments, status changes, and platform actions.", "workflow", allModes, allEntities, ["timeline"], 37),
  context("context.savedShortcuts", "Saved shortcuts", "User-saved commands, filters, records, views, and frequently opened workspaces.", "workflow", allModes, allEntities, ["button", "card"], 38)
];

export const workspaceOptionDefinitions: WorkspaceOptionDefinition[] = [
  ...workflowNavigationOptions,
  ...primaryCanvasOptions,
  ...contextualSidebarOptions
];

export const workspaceTemplateDefinitions: WorkspaceTemplateDefinition[] = [
  template("template.unit.propertyManagement.operational", "Unit operations canvas", "unit", "property_management", "operational",
    ["workflow.propertyOverview", "workflow.units", "workflow.leasing", "workflow.tenantRecord", "workflow.maintenance", "workflow.inspections", "workflow.documents", "workflow.timeline"],
    ["canvas.propertySummary", "canvas.unitRosterSpreadsheet", "canvas.occupancyTracker", "canvas.maintenanceQueue", "canvas.paymentLedger", "canvas.timelineStream"],
    ["context.nextBestActions", "context.unresolvedAlerts", "context.recentActivity", "context.relatedRecords", "context.upcomingDeadlines"],
    ["canvas.commandConsole"]),
  template("template.unit.leasing.operational", "Unit leasing canvas", "unit", "leasing", "operational",
    ["workflow.publicListing", "workflow.marketing", "workflow.photosMedia", "workflow.leads", "workflow.applications", "workflow.calendar", "workflow.messages"],
    ["canvas.publicListingPreview", "canvas.listingReadinessChecklist", "canvas.applicantPipelineKanban", "canvas.showingCalendar", "canvas.leadSourceAnalytics"],
    ["context.nextBestActions", "context.listingHealth", "context.applicationStatus", "context.openMessages", "context.leaseUpStatus"],
    ["canvas.commandConsole"]),
  template("template.unit.maintenance.operational", "Unit maintenance canvas", "unit", "maintenance", "operational",
    ["workflow.maintenance", "workflow.workOrders", "workflow.vendors", "workflow.photosMedia", "workflow.messages", "workflow.timeline"],
    ["canvas.maintenanceQueue", "canvas.vendorDispatchBoard", "canvas.workOrderIntake", "canvas.repairHistory", "canvas.photoGallery", "canvas.timelineStream"],
    ["context.nextBestActions", "context.maintenanceRisk", "context.openMessages", "context.relatedRecords", "context.recentActivity"],
    ["canvas.commandConsole"]),
  template("template.unit.financial.analyst", "Unit financial canvas", "unit", "financial", "analyst",
    ["workflow.payments", "workflow.ledger", "workflow.lease", "workflow.reports", "workflow.auditHistory"],
    ["canvas.paymentLedger", "canvas.rentRollSpreadsheet", "canvas.financialTermsPanel", "canvas.reportBuilder", "canvas.auditLogViewer"],
    ["context.paymentRisk", "context.pendingApprovals", "context.auditSummary", "context.upcomingDeadlines"],
    ["canvas.commandConsole"]),
  template("template.organization.admin.commandCenter", "Operations command center", "organization", "admin_operations", "command_center",
    ["workflow.auditHistory", "workflow.reports", "workflow.automations", "workflow.tasks", "workflow.settings"],
    ["canvas.bulkActionTable", "canvas.auditLogViewer", "canvas.workflowBuilder", "canvas.automationRulesPanel", "canvas.reportBuilder"],
    ["context.unresolvedAlerts", "context.dataQualityIssues", "context.integrationStatus", "context.duplicateRecords", "context.recommendedAutomations"],
    ["canvas.commandConsole"])
];

export function buildWorkspaceOptionRegistry(): WorkspaceOptionRegistry {
  return {
    options: workspaceOptionDefinitions,
    templates: workspaceTemplateDefinitions,
    byId: new Map(workspaceOptionDefinitions.map((item) => [item.id, item]))
  };
}

export function getWorkspaceOptionsForMode(mode: WorkspaceOptionMode): WorkspaceOptionDefinition[] {
  return workspaceOptionDefinitions.filter((optionDefinition) => optionDefinition.supportedModes.includes(mode));
}

export function getCanvasModulesForEntity(entityType: WorkspaceOptionEntityType | WorkspaceEntityType, mode: WorkspaceOptionMode, density: WorkspaceDensityMode): WorkspaceOptionDefinition[] {
  const mappedEntity = normalizeEntityType(entityType);
  return workspaceOptionDefinitions
    .filter((optionDefinition) => optionDefinition.region === "primary_canvas")
    .filter((optionDefinition) => optionDefinition.allowedEntityTypes.includes(mappedEntity))
    .filter((optionDefinition) => optionDefinition.supportedModes.includes(mode))
    .filter((optionDefinition) => optionDefinition.supportedDensityModes.includes(density))
    .sort((a, b) => a.priority - b.priority);
}

export function getContextPanelsForEntity(entityType: WorkspaceOptionEntityType | WorkspaceEntityType, mode: WorkspaceOptionMode): WorkspaceOptionDefinition[] {
  const mappedEntity = normalizeEntityType(entityType);
  return workspaceOptionDefinitions
    .filter((optionDefinition) => optionDefinition.region === "context_sidebar")
    .filter((optionDefinition) => optionDefinition.allowedEntityTypes.includes(mappedEntity))
    .filter((optionDefinition) => optionDefinition.supportedModes.includes(mode))
    .sort((a, b) => a.priority - b.priority);
}

export function getWorkflowNavForRole(role: UserRole | string, mode: WorkspaceOptionMode): WorkspaceOptionDefinition[] {
  const roleMode = normalizeWorkspaceOptionMode(mode);
  const roleKey = String(role).toUpperCase();
  const roleCategories: Partial<Record<string, WorkspaceOptionCategory[]>> = {
    ADMIN: ["admin", "analytics", "automation", "workflow", "communication"],
    APPLICANT: ["leasing", "document", "communication", "workflow"],
    INSPECTOR: ["inspection", "maintenance", "document", "communication"],
    LANDLORD: ["property", "leasing", "resident", "lease", "financial", "maintenance", "inspection", "document", "communication", "analytics", "staff"],
    OWNER: ["property", "financial", "analytics", "document", "maintenance", "communication"],
    SUPER_ADMIN: ["admin", "analytics", "automation", "workflow", "communication", "financial", "compliance"],
    TENANT: ["resident", "lease", "financial", "maintenance", "document", "communication"],
    VENDOR: ["maintenance", "document", "communication", "workflow"]
  };
  const categories = roleCategories[roleKey] ?? roleCategories.LANDLORD ?? [];

  return workspaceOptionDefinitions
    .filter((optionDefinition) => optionDefinition.region === "workflow_navigation")
    .filter((optionDefinition) => optionDefinition.supportedModes.includes(roleMode) || optionDefinition.supportedModes.includes("overview"))
    .filter((optionDefinition) => categories.includes(optionDefinition.category))
    .sort((a, b) => a.priority - b.priority);
}

export function buildDefaultWorkspaceTemplate(
  entityType: WorkspaceOptionEntityType | WorkspaceEntityType,
  mode: WorkspaceOptionMode,
  density: WorkspaceDensityMode
): WorkspaceTemplateDefinition {
  const mappedEntity = normalizeEntityType(entityType);
  const matchingTemplate = workspaceTemplateDefinitions.find((templateDefinition) =>
    templateDefinition.entityType === mappedEntity &&
    templateDefinition.mode === mode &&
    templateDefinition.density === density
  );

  if (matchingTemplate) return matchingTemplate;

  return template(`template.${mappedEntity}.${mode}.${density}.generated`, `${mappedEntity} ${mode} workspace`, mappedEntity, mode, density,
    getWorkflowNavForRole("LANDLORD", mode).slice(0, 8).map((item) => item.id),
    getCanvasModulesForEntity(mappedEntity, mode, density).slice(0, 8).map((item) => item.id),
    getContextPanelsForEntity(mappedEntity, mode).slice(0, 8).map((item) => item.id),
    ["canvas.commandConsole"]);
}

export function normalizeEntityType(entityType: WorkspaceOptionEntityType | WorkspaceEntityType): WorkspaceOptionEntityType {
  const map: Partial<Record<string, WorkspaceOptionEntityType>> = {
    applicant: "applicant",
    application: "applicant",
    certification_packet: "workflow",
    document: "document",
    hap_contract: "payment",
    inspection: "inspection",
    lead: "applicant",
    lease: "lease",
    ledger: "payment",
    maintenance_request: "maintenanceRequest",
    message_thread: "message",
    organization: "organization",
    owner_statement: "report",
    payment: "payment",
    program_case: "workflow",
    property: "property",
    tenant: "resident",
    unit: "unit",
    vendor_invoice: "vendor",
    voucher: "workflow",
    work_order: "maintenanceRequest"
  };

  return map[entityType] ?? (entityType as WorkspaceOptionEntityType);
}

function nav(
  id: string,
  label: string,
  description: string,
  category: WorkspaceOptionCategory,
  modes: WorkspaceOptionMode[],
  entities: WorkspaceOptionEntityType[],
  priority: number,
  isExperimental = false
) {
  return option({
    id,
    label,
    description,
    region: "workflow_navigation",
    category,
    supportedModes: modes,
    allowedEntityTypes: entities,
    preferredPlacement: "leftRail",
    representationTypes: ["button"],
    defaultSize: "sm",
    minSize: "xs",
    priority,
    isExperimental
  });
}

function canvas(
  id: string,
  label: string,
  description: string,
  category: WorkspaceOptionCategory,
  modes: WorkspaceOptionMode[],
  entities: WorkspaceOptionEntityType[],
  representations: WorkspaceRepresentationType[],
  placement: WorkspaceOptionPlacement,
  priority: number,
  isDefault = false
) {
  return option({
    id,
    label,
    description,
    region: "primary_canvas",
    category,
    supportedModes: modes,
    allowedEntityTypes: entities,
    preferredPlacement: placement,
    representationTypes: representations,
    defaultSize: representations.includes("spreadsheet") || representations.includes("kanban") ? "xl" : "lg",
    minSize: "sm",
    priority,
    isDefault
  });
}

function context(
  id: string,
  label: string,
  description: string,
  category: WorkspaceOptionCategory,
  modes: WorkspaceOptionMode[],
  entities: WorkspaceOptionEntityType[],
  representations: WorkspaceRepresentationType[],
  priority: number,
  isDefault = false
) {
  return option({
    id,
    label,
    description,
    region: "context_sidebar",
    category,
    supportedModes: modes,
    allowedEntityTypes: entities,
    preferredPlacement: "rightSidebar",
    representationTypes: representations,
    defaultSize: "md",
    minSize: "sm",
    priority,
    isDefault
  });
}

function template(
  id: string,
  label: string,
  entityType: WorkspaceOptionEntityType,
  mode: WorkspaceOptionMode,
  density: WorkspaceDensityMode,
  workflowNavigation: string[],
  primaryCanvas: string[],
  contextSidebar: string[],
  floatingUtilities: string[]
): WorkspaceTemplateDefinition {
  return { id, label, entityType, mode, density, workflowNavigation, primaryCanvas, contextSidebar, floatingUtilities };
}

