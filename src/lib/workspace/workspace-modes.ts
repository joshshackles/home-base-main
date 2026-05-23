import type { WorkspaceMode } from "@/lib/workspace/types";

export type WorkspaceOptionMode =
  | "leasing"
  | "maintenance"
  | "inspection"
  | "financial"
  | "executive"
  | "communication"
  | "property_management"
  | "tenant_services"
  | "compliance"
  | "field_staff"
  | "admin_operations"
  | "public_listing"
  | "application_review"
  | "lease_up"
  | "emergency_response"
  | "documents"
  | "overview";

export type WorkspaceDensityMode =
  | "simple_daily"
  | "comfortable"
  | "operational"
  | "analyst"
  | "command_center"
  | "field_mobile"
  | "executive_summary"
  | "spreadsheet_heavy"
  | "focus"
  | "presentation";

export type WorkspaceModeDefinitionOption = {
  id: WorkspaceOptionMode;
  label: string;
  description: string;
  defaultDensity: WorkspaceDensityMode;
  isDefault?: boolean;
};

export type WorkspaceDensityDefinition = {
  id: WorkspaceDensityMode;
  label: string;
  description: string;
  rowHeight: number;
  gutter: number;
  columns: number;
};

export const workspaceOptionModes: WorkspaceModeDefinitionOption[] = [
  mode("leasing", "Leasing Mode", "Listing, lead, showing, application, screening, and approval work.", "operational", true),
  mode("maintenance", "Maintenance Mode", "Repair triage, dispatch, vendor, media, estimate, invoice, and closeout work.", "operational"),
  mode("inspection", "Inspection Mode", "Checklist, evidence, reports, corrections, and reinspection workflows.", "operational"),
  mode("financial", "Financial Mode", "Ledger, payments, deposits, subsidy, owner statements, exports, and audit-safe actions.", "analyst"),
  mode("executive", "Executive Mode", "Portfolio-level summaries, risk, performance, statements, approvals, and controlled drilldowns.", "executive_summary"),
  mode("communication", "Communication Mode", "Inbox, linked entity context, assignment, message triage, and response workflows.", "operational"),
  mode("property_management", "Property Management Mode", "Inventory, residents, units, leasing state, work orders, documents, and day-to-day operations.", "operational"),
  mode("tenant_services", "Tenant Services Mode", "Resident support, payments, lease, documents, maintenance, and communication workflows.", "comfortable"),
  mode("compliance", "Compliance Mode", "Program, RFTA, certification, inspection, document, audit, and subsidy compliance work.", "analyst"),
  mode("field_staff", "Field Staff Mode", "Mobile-first work for vendors, inspectors, technicians, and field teams.", "field_mobile"),
  mode("admin_operations", "Admin Operations Mode", "Access, security, data quality, integrations, imports, exports, jobs, and operational recovery.", "command_center"),
  mode("public_listing", "Public Listing Mode", "Public-facing listing quality, media, preview, inquiry, tours, and conversion state.", "comfortable"),
  mode("application_review", "Application Review Mode", "Applicant review, missing items, documents, screening status, messages, and decision workflow.", "focus"),
  mode("lease_up", "Lease-Up Mode", "Approval-to-move-in workflow with lease, signatures, deposits, documents, and resident handoff.", "operational"),
  mode("emergency_response", "Emergency Response Mode", "Urgent maintenance, habitability, safety, contacts, vendors, messages, and status escalation.", "command_center"),
  mode("documents", "Documents Mode", "Documents, signatures, sharing, revocation, templates, and audit timeline.", "spreadsheet_heavy"),
  mode("overview", "Overview Mode", "Balanced entity summary for status, activity, relationships, and next actions.", "operational")
];

export const workspaceDensityDefinitions: WorkspaceDensityDefinition[] = [
  density("simple_daily", "Simple Daily View", "Lower-density daily view for ordinary users and quick routine work.", 104, 18, 6),
  density("comfortable", "Comfortable", "Guided layouts with more spacing and fewer simultaneous modules.", 92, 16, 8),
  density("operational", "Operational", "Balanced professional density for daily property operations.", 76, 12, 12),
  density("analyst", "Analyst", "Dense comparison views for reports, ledgers, inspections, and operational analysis.", 60, 8, 12),
  density("command_center", "Command Center", "Mission-control density for urgent queues, large portfolios, and operations teams.", 52, 6, 12),
  density("field_mobile", "Field Mobile", "Touch-first field layout for phones, cameras, notes, and one-task-at-a-time completion.", 96, 14, 4),
  density("executive_summary", "Executive Summary", "Clean summary layout for owners, executives, and decision reviews.", 108, 18, 8),
  density("spreadsheet_heavy", "Spreadsheet Heavy", "Table-first mode for bulk editing, sorting, filtering, export, and analysis.", 48, 6, 12),
  density("focus", "Focus Mode", "Single-workflow mode that suppresses noise and emphasizes the current decision.", 84, 12, 8),
  density("presentation", "Presentation Mode", "Readable review layout for meetings, demos, and stakeholder walkthroughs.", 120, 20, 8)
];

export function normalizeWorkspaceOptionMode(mode: WorkspaceMode | WorkspaceOptionMode): WorkspaceOptionMode {
  const modeMap: Record<WorkspaceMode, WorkspaceOptionMode> = {
    communication: "communication",
    compliance: "compliance",
    documents: "documents",
    executive: "executive",
    financial: "financial",
    inspection: "inspection",
    leasing: "leasing",
    maintenance: "maintenance",
    mobile_field: "field_staff",
    overview: "overview",
    resident: "tenant_services"
  };

  return (modeMap as Partial<Record<string, WorkspaceOptionMode>>)[mode] ?? (mode as WorkspaceOptionMode);
}

export function getWorkspaceOptionModeDefinition(mode: WorkspaceMode | WorkspaceOptionMode): WorkspaceModeDefinitionOption {
  const normalized = normalizeWorkspaceOptionMode(mode);
  return workspaceOptionModes.find((item) => item.id === normalized) ?? workspaceOptionModes[0];
}

export function getWorkspaceDensityDefinition(densityMode: WorkspaceDensityMode): WorkspaceDensityDefinition {
  return workspaceDensityDefinitions.find((item) => item.id === densityMode) ?? workspaceDensityDefinitions[2];
}

function mode(id: WorkspaceOptionMode, label: string, description: string, defaultDensity: WorkspaceDensityMode, isDefault = false): WorkspaceModeDefinitionOption {
  return { id, label, description, defaultDensity, isDefault };
}

function density(id: WorkspaceDensityMode, label: string, description: string, rowHeight: number, gutter: number, columns: number): WorkspaceDensityDefinition {
  return { id, label, description, rowHeight, gutter, columns };
}

