import type { ShellIconName } from "@/components/layout/DashboardShell";
import type { WorkspaceDensityMode, WorkspaceOptionMode } from "@/lib/workspace/workspace-modes";

export type WorkspaceRoleKey =
  | "applicant"
  | "tenant"
  | "participant"
  | "landlord"
  | "property_manager"
  | "leasing_agent"
  | "vendor"
  | "inspector"
  | "owner_client"
  | "caseworker"
  | "housing_authority"
  | "admin"
  | "super_admin";

export type WorkspaceRegionKey =
  | "global_navigation"
  | "workflow_navigation"
  | "workspace_header"
  | "summary_strip"
  | "primary_canvas"
  | "context_rail"
  | "activity_layer"
  | "mobile_action_layer";

export type WorkspaceComponentStatus = "canonical" | "planned" | "legacy_bridge";

export type CanonicalWorkspaceComponent = {
  id: string;
  name: string;
  importPath?: string;
  status: WorkspaceComponentStatus;
  purpose: string;
  requiredForRegions: WorkspaceRegionKey[];
  replacementFor: string[];
};

export type WorkspaceRoleTemplate = {
  role: WorkspaceRoleKey;
  label: string;
  workspaceTitle: string;
  primaryMode: WorkspaceOptionMode;
  defaultDensity: WorkspaceDensityMode;
  navigationFocus: string[];
  primaryQuestions: string[];
  heroActions: string[];
  hiddenUntilRelevant: string[];
  icon: ShellIconName;
};

export type WorkspaceAuditCriterion = {
  id: string;
  label: string;
  description: string;
  targetScore: number;
  regions: WorkspaceRegionKey[];
};

export const workspaceRegions: Array<{ id: WorkspaceRegionKey; label: string; purpose: string }> = [
  region("global_navigation", "Global Navigation", "Product-level navigation, command search, notifications, account controls, and workspace switching."),
  region("workflow_navigation", "Workflow Navigation", "Role-aware left rail or compact mobile drawer for the user's recurring workflows."),
  region("workspace_header", "Workspace Header", "Entity or role identity, status, primary action, secondary action, and optional breadcrumbs."),
  region("summary_strip", "Summary Strip", "The few metrics or statuses needed to understand the current workspace at a glance."),
  region("primary_canvas", "Primary Operational Canvas", "The main working surface for lists, records, workflows, panels, tables, boards, and forms."),
  region("context_rail", "Context Rail", "Right-side contextual actions, alerts, related records, messages, notes, and next best actions."),
  region("activity_layer", "Activity Layer", "Timeline, audit history, recent changes, and workflow events."),
  region("mobile_action_layer", "Mobile Action Layer", "Touch-first quick actions and compact navigation for phones and field users.")
];

export const canonicalWorkspaceComponents: CanonicalWorkspaceComponent[] = [
  component("workspace-shell", "WorkspaceShell", "@/components/layout/DashboardShell", "canonical", "Role-level authenticated workspace shell with collapsible cabinet, command search, mobile drawer, inbox, and quick action.", ["global_navigation", "workflow_navigation", "mobile_action_layer"], ["DashboardShell one-off wrappers", "local sidebar shells"]),
  component("command-center-header", "CommandCenterHeader", "@/components/ui/CommandCenterPrimitives", "canonical", "Shared workspace/entity header for identity, status copy, icon, and primary actions.", ["workspace_header"], ["AdminPageHeader bespoke markup", "LandlordPageHeader bespoke markup", "local page title rows"]),
  component("command-center-surface", "CommandCenterSurface", "@/components/ui/CommandCenterPrimitives", "canonical", "Large white command-center shell for important work areas.", ["primary_canvas", "workspace_header"], ["floating dashboard section wrappers", "nested decorative cards"]),
  component("command-center-panel", "CommandCenterPanel", "@/components/ui/CommandCenterPrimitives", "canonical", "Focused workflow panel with title, detail text, optional action, and consistent spacing.", ["primary_canvas", "context_rail"], ["local card panels", "ad hoc section boxes"]),
  component("command-center-metric", "CommandCenterMetric", "@/components/ui/CommandCenterPrimitives", "canonical", "Compact operational metric with consistent tone, icon treatment, and mobile behavior.", ["summary_strip"], ["local metric cards", "dashboard stat boxes"]),
  component("command-center-button", "CommandCenterButton", "@/components/ui/CommandCenterPrimitives", "canonical", "Primary and secondary command-center action button pattern.", ["workspace_header", "primary_canvas", "context_rail", "mobile_action_layer"], ["local button links", "inconsistent CTA styles"]),
  component("collapsible-workspace-rail", "CollapsibleWorkspaceRail", "@/components/workspace/CollapsibleWorkspaceRail", "canonical", "Collapsible contextual rail for dense property, unit, and operational workspaces.", ["context_rail"], ["always-open right sidebars", "static context cards"]),
  component("operational-canvas", "OperationalCanvas", "@/components/workspace/OperationalCanvas", "canonical", "Reusable canvas renderer for mode/density-aware workspace modules.", ["primary_canvas", "context_rail"], ["single-purpose dashboard layouts"]),
  component("workspace-tabs", "WorkspaceTabs", undefined, "planned", "URL-state-aware tab row for switching workflow focus without losing workspace context.", ["primary_canvas", "mobile_action_layer"], ["local tab arrays", "non-persistent tab state"]),
  component("next-action-panel", "NextActionPanel", undefined, "planned", "Shared role-safe next action panel answering what the user should do next.", ["context_rail", "summary_strip"], ["scattered task cards", "unprioritized alert lists"]),
  component("responsive-record-list", "ResponsiveRecordList", undefined, "planned", "Desktop table plus mobile stacked record cards for operational lists.", ["primary_canvas", "mobile_action_layer"], ["overflow-x-only tables"]),
  component("workspace-empty-state", "WorkspaceEmptyState", undefined, "planned", "Action-oriented empty state with honest setup language and one clear next action.", ["primary_canvas", "context_rail"], ["placeholder text", "will appear here copy"]),
  component("workspace-status-badge", "WorkspaceStatusBadge", undefined, "planned", "Consistent status badge with text labels, tone mapping, and non-color-only meaning.", ["summary_strip", "primary_canvas", "context_rail"], ["local status pills", "color-only statuses"])
];

export const workspaceRoleTemplates: WorkspaceRoleTemplate[] = [
  role("applicant", "Applicant", "Renter workspace", "leasing", "comfortable", "LayoutDashboard", ["Search homes", "Profile", "Applications", "Documents", "Messages", "Saved homes"], ["What homes match me?", "What do I need to finish?", "What did I already submit?"], ["Continue application", "Complete profile", "Upload document"], ["Payments", "Maintenance", "Ledger", "Inspections"]),
  role("tenant", "Tenant", "Resident workspace", "tenant_services", "comfortable", "Home", ["Payments", "Maintenance", "Lease", "Documents", "Messages", "Notices"], ["What do I owe?", "Is my repair moving?", "Where are my lease and documents?"], ["Make payment", "Request repair", "Message manager"], ["Applicant screening", "Landlord financial tools", "Internal notes"]),
  role("participant", "Voucher participant", "Program participant workspace", "compliance", "comfortable", "ClipboardCheck", ["Program status", "RFTA", "Inspection", "Documents", "Rent portion", "Messages"], ["What is my next program step?", "What paperwork is missing?", "Who am I waiting on?"], ["Upload paperwork", "Message caseworker", "Review RFTA status"], ["Internal HAP accounting", "Staff notes", "Landlord packet internals"]),
  role("landlord", "Landlord", "Landlord workspace", "property_management", "operational", "Home", ["Home", "Inventory", "Leasing", "Residents", "Maintenance", "Documents & Leases", "Financials", "Reports"], ["What needs my attention today?", "Which units are vacant or blocked?", "Where can I act quickly?"], ["Add rental", "Review applications", "Open inventory"], ["Super admin operations", "Program-only compliance tools"]),
  role("property_manager", "Property manager", "Property management workspace", "property_management", "command_center", "PackageSearch", ["Home", "Inventory", "Residents", "Maintenance", "Inspections", "Documents & Leases", "Financials", "Reports", "Team & Vendors"], ["Which operational queue is blocked?", "What changed across the portfolio?", "Where do staff need decisions?"], ["Open inventory", "Review queues", "Assign work"], ["Platform operations", "Owner-only reports without permission"]),
  role("leasing_agent", "Leasing agent", "Leasing workspace", "leasing", "operational", "Megaphone", ["Leads", "Showings", "Applications", "Listings", "Messages", "Tasks"], ["Who needs follow-up?", "Which tours are waiting?", "Which applications can move forward?"], ["Reply to lead", "Schedule tour", "Invite to apply"], ["Ledger", "Owner statements", "Platform settings"]),
  role("vendor", "Vendor", "Field workspace", "field_staff", "field_mobile", "Wrench", ["Field mode", "Assigned jobs", "Estimates", "Invoices", "Contacts"], ["What job is next?", "What proof needs uploading?", "What estimate or invoice is pending?"], ["Open today's jobs", "Upload photos", "Submit invoice"], ["Tenant ledger", "Applicant data", "Internal property financials"]),
  role("inspector", "Inspector", "Inspection workspace", "inspection", "field_mobile", "ClipboardList", ["Assigned inspections", "Checklist", "Reports", "Corrections", "Messages"], ["Which inspection is assigned?", "What required items remain?", "What failed or needs evidence?"], ["Start checklist", "Upload evidence", "Submit report"], ["Lease decisions", "Applicant screening", "Financial records"]),
  role("owner_client", "Owner client", "Owner workspace", "executive", "executive_summary", "BriefcaseBusiness", ["Portfolio", "Statements", "Approvals", "Documents", "Activity", "Messages"], ["How is my property performing?", "What needs approval?", "Where are my statements?"], ["Review statement", "Approve maintenance", "Message manager"], ["Applicant PII", "Internal notes", "Screening reports"]),
  role("caseworker", "Caseworker", "Caseworker workspace", "compliance", "operational", "Users", ["Cases", "Documents", "RFTA", "Inspections", "Subsidy status", "Messages", "Tasks"], ["Which cases need attention?", "What is missing?", "Which deadlines are near?"], ["Review case", "Request document", "Message participant"], ["Landlord-only financial tools", "Platform recovery tools"]),
  role("housing_authority", "Housing authority / program admin", "Program operations workspace", "compliance", "analyst", "ShieldCheck", ["Program cases", "RFTA review", "Inspections", "HAP/Subsidy", "Payment standards", "Documents", "Reports"], ["What program work is blocked?", "Which RFTAs or inspections need review?", "Are payment standards current?"], ["Review RFTA", "Open subsidy exceptions", "Manage payment standards"], ["Market-rate landlord-only tools", "Unrelated organizations"]),
  role("admin", "Admin", "Operations workspace", "admin_operations", "command_center", "Shield", ["Command Center", "Users & access", "Workflow exceptions", "Data quality", "Integrations", "Reports", "Audit"], ["What needs operational attention?", "Which users or jobs are blocked?", "What changed recently?"], ["Review access", "Open data quality", "Inspect integration"], ["Super-admin-only destructive tools"]),
  role("super_admin", "Super admin", "Platform operations workspace", "admin_operations", "command_center", "Database", ["Platform health", "Impersonation", "API & webhooks", "Integrations", "Backups", "Security", "Audit", "Data recovery"], ["Is the platform healthy?", "Which high-risk action needs review?", "What requires a reason and audit trail?"], ["Review health", "Open audit", "Manage platform tools"], ["Role-scoped user data without purpose"])
];

export const workspaceAuditCriteria: WorkspaceAuditCriterion[] = [
  criterion("visual-consistency", "Visual consistency", "Uses the command-center shell, spacing, typography, buttons, badges, cards, and rails without one-off visual systems.", ["global_navigation", "workspace_header", "summary_strip", "primary_canvas"]),
  criterion("navigation-clarity", "Navigation clarity", "Shows role-specific canonical tools with ordinary labels and hides premature or unauthorized workflows.", ["workflow_navigation", "mobile_action_layer"]),
  criterion("next-action-clarity", "Next action clarity", "Makes the most important next step obvious above the fold or in the context rail.", ["summary_strip", "context_rail"]),
  criterion("workflow-usefulness", "Workflow usefulness", "Supports real work in context instead of static summaries or dead-end cards.", ["primary_canvas", "context_rail", "activity_layer"]),
  criterion("mobile-usability", "Mobile usability", "Provides touch-safe actions, compact navigation, and card alternatives to wide tables.", ["mobile_action_layer", "primary_canvas"]),
  criterion("language-polish", "Language polish", "Uses production-ready, role-appropriate copy with no scaffold or placeholder tone.", ["workspace_header", "primary_canvas", "context_rail"]),
  criterion("permission-safety", "Permission safety", "Does not expose links, actions, or context records the role cannot access.", ["workflow_navigation", "primary_canvas", "context_rail"]),
  criterion("state-quality", "State quality", "Has clear loading, error, empty, disabled, success, and confirmation states.", ["primary_canvas", "context_rail", "mobile_action_layer"]),
  criterion("status-clarity", "Status clarity", "Uses consistent text status and severity patterns without relying on color alone.", ["summary_strip", "primary_canvas", "activity_layer"]),
  criterion("activity-context", "Activity context", "Shows recent changes, actor, timestamp, and related record for operational confidence.", ["activity_layer", "context_rail"])
];

export function getWorkspaceRoleTemplate(roleKey: WorkspaceRoleKey) {
  return workspaceRoleTemplates.find((roleTemplate) => roleTemplate.role === roleKey);
}

export function getCanonicalWorkspaceComponentsForRegion(regionKey: WorkspaceRegionKey) {
  return canonicalWorkspaceComponents.filter((componentOption) => componentOption.requiredForRegions.includes(regionKey));
}

export function getWorkspaceUxTargetScore() {
  return 9;
}

function region(id: WorkspaceRegionKey, label: string, purpose: string) {
  return { id, label, purpose };
}

function component(
  id: string,
  name: string,
  importPath: string | undefined,
  status: WorkspaceComponentStatus,
  purpose: string,
  requiredForRegions: WorkspaceRegionKey[],
  replacementFor: string[]
): CanonicalWorkspaceComponent {
  return { id, name, importPath, status, purpose, requiredForRegions, replacementFor };
}

function role(
  role: WorkspaceRoleKey,
  label: string,
  workspaceTitle: string,
  primaryMode: WorkspaceOptionMode,
  defaultDensity: WorkspaceDensityMode,
  icon: ShellIconName,
  navigationFocus: string[],
  primaryQuestions: string[],
  heroActions: string[],
  hiddenUntilRelevant: string[]
): WorkspaceRoleTemplate {
  return { role, label, workspaceTitle, primaryMode, defaultDensity, icon, navigationFocus, primaryQuestions, heroActions, hiddenUntilRelevant };
}

function criterion(id: string, label: string, description: string, regions: WorkspaceRegionKey[], targetScore = 9): WorkspaceAuditCriterion {
  return { id, label, description, targetScore, regions };
}
