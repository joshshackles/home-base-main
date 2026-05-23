import type { PlatformActor, PlatformEntityRef, PlatformRequestMetadata } from "@/lib/platform/types";

export type WorkspaceEntityType =
  | "property"
  | "unit"
  | "tenant"
  | "applicant"
  | "lead"
  | "application"
  | "lease"
  | "ledger"
  | "payment"
  | "maintenance_request"
  | "work_order"
  | "inspection"
  | "document"
  | "message_thread"
  | "organization"
  | "owner_statement"
  | "vendor_invoice"
  | "program_case"
  | "voucher"
  | "hap_contract"
  | "certification_packet";

export type WorkspaceMode =
  | "overview"
  | "leasing"
  | "resident"
  | "financial"
  | "maintenance"
  | "inspection"
  | "documents"
  | "communication"
  | "executive"
  | "compliance"
  | "mobile_field";

export type WorkspaceDeviceProfile = "desktop" | "tablet" | "mobile" | "unknown";

export type WorkspaceSurface = "web" | "mobile" | "admin" | "vendor" | "public" | "api" | "system";

export type WorkspaceUrgency = "none" | "low" | "medium" | "high" | "critical";

export type WorkspaceEntityRef = PlatformEntityRef & {
  type: WorkspaceEntityType;
  id: string;
};

export type WorkspaceRelationshipCardinality = "one" | "many";

export type WorkspaceRelationshipDefinition = {
  key: string;
  label: string;
  from: WorkspaceEntityType;
  to: WorkspaceEntityType;
  cardinality: WorkspaceRelationshipCardinality;
  description?: string;
};

export type WorkspacePermissionRequirement = {
  anyOf?: string[];
  allOf?: string[];
  deniedBy?: string[];
};

export type WorkspaceContextInput = {
  entity: WorkspaceEntityRef;
  requestedMode?: WorkspaceMode;
  surface?: WorkspaceSurface;
  device?: WorkspaceDeviceProfile;
  metadata?: PlatformRequestMetadata;
};

export type WorkspaceContext = WorkspaceContextInput & {
  actor: PlatformActor;
  resolvedMode: WorkspaceMode;
  urgency: WorkspaceUrgency;
  permissions: string[];
};

export type WorkspaceActionTone = "primary" | "secondary" | "danger" | "quiet";

export type WorkspaceAction = {
  key: string;
  label: string;
  description?: string;
  href?: string;
  commandKey?: string;
  tone?: WorkspaceActionTone;
  disabled?: boolean;
  disabledReason?: string;
  permission?: WorkspacePermissionRequirement;
};

export type WorkspaceCommandCategory =
  | "navigation"
  | "communication"
  | "workflow"
  | "financial"
  | "document"
  | "maintenance"
  | "inspection"
  | "admin";

export type WorkspaceCommand = {
  key: string;
  label: string;
  description?: string;
  category: WorkspaceCommandCategory;
  entityTypes: WorkspaceEntityType[];
  modes?: WorkspaceMode[];
  permission?: WorkspacePermissionRequirement;
  auditRequired?: boolean;
};

export type WorkspaceWidgetSize = "sm" | "md" | "lg" | "xl" | "full";

export type WorkspaceWidgetKind =
  | "summary"
  | "metric"
  | "table"
  | "timeline"
  | "form"
  | "media"
  | "message"
  | "approval"
  | "map"
  | "board"
  | "document_preview"
  | "inspector";

export type WorkspaceWidgetDefinition = {
  key: string;
  label: string;
  kind: WorkspaceWidgetKind;
  entityTypes: WorkspaceEntityType[];
  modes: WorkspaceMode[];
  defaultSize: WorkspaceWidgetSize;
  description?: string;
  dataDependencies?: string[];
  actions?: string[];
  permission?: WorkspacePermissionRequirement;
};

export type WorkspacePanelKind = "drawer" | "stacked" | "split_pane" | "modal" | "inspector" | "dock" | "bottom_sheet";

export type WorkspacePanelDefinition = {
  key: string;
  label: string;
  kind: WorkspacePanelKind;
  entityTypes: WorkspaceEntityType[];
  modes?: WorkspaceMode[];
  permission?: WorkspacePermissionRequirement;
};

export type WorkspaceEventSeverity = "info" | "success" | "warning" | "error" | "critical";

export type WorkspaceEvent = {
  type: string;
  entity: WorkspaceEntityRef;
  actor?: Pick<PlatformActor, "userId" | "email" | "name" | "role"> | null;
  occurredAt: Date;
  title: string;
  detail?: string;
  severity?: WorkspaceEventSeverity;
  relatedEntities?: WorkspaceEntityRef[];
  metadata?: Record<string, unknown>;
};

export type WorkspaceActivityItem = {
  id: string;
  eventType: string;
  title: string;
  detail?: string;
  occurredAt: Date;
  actorLabel?: string;
  entity: WorkspaceEntityRef;
  relatedEntity?: WorkspaceEntityRef;
  href?: string;
  severity?: WorkspaceEventSeverity;
};

export type WorkspaceAlert = {
  key: string;
  title: string;
  detail: string;
  urgency: WorkspaceUrgency;
  entity?: WorkspaceEntityRef;
  action?: WorkspaceAction;
};

export type WorkspaceMemorySignal =
  | "opened_widget"
  | "used_filter"
  | "changed_mode"
  | "ran_command"
  | "opened_panel"
  | "abandoned_workflow"
  | "paired_entities";

export type WorkspaceMemoryEntry = {
  userId: string;
  entityType?: WorkspaceEntityType;
  mode?: WorkspaceMode;
  signal: WorkspaceMemorySignal;
  key: string;
  value?: Record<string, unknown>;
  lastObservedAt: Date;
};

export type WorkspaceResolvedModel = {
  context: WorkspaceContext;
  primaryActions: WorkspaceAction[];
  secondaryActions: WorkspaceAction[];
  alerts: WorkspaceAlert[];
  widgets: WorkspaceWidgetDefinition[];
  panels: WorkspacePanelDefinition[];
  commands: WorkspaceCommand[];
  activity: WorkspaceActivityItem[];
};

export type WorkspaceEntityDefinition = {
  type: WorkspaceEntityType;
  label: string;
  pluralLabel: string;
  description: string;
  canonicalRoute?: (id: string) => string;
  defaultMode: WorkspaceMode;
  supportedModes: WorkspaceMode[];
  permission?: WorkspacePermissionRequirement;
  relationships?: WorkspaceRelationshipDefinition[];
  widgets?: string[];
  commands?: string[];
};
