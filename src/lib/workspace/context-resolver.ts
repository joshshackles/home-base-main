import { buildCapabilitySet } from "@/lib/role-capabilities";
import { buildWorkspaceActivityStream } from "@/lib/workspace/activity-stream";
import { resolveWorkspaceCommands } from "@/lib/workspace/command-registry";
import {
  getWorkspaceEntityCommandKeys,
  getWorkspaceEntityDefinition,
  getWorkspaceEntityRoute,
  getWorkspaceEntityWidgetKeys,
  resolveWorkspaceMode,
  supportsWorkspaceMode
} from "@/lib/workspace/entity-registry";
import { getWorkspaceRelationshipSummary } from "@/lib/workspace/relationship-graph";
import { resolveWorkspacePanels } from "@/lib/workspace/panel-registry";
import { resolveWorkspaceWidgets } from "@/lib/workspace/widget-registry";
import type {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceContext,
  WorkspaceContextInput,
  WorkspaceCommand,
  WorkspaceEvent,
  WorkspaceEventAudience,
  WorkspaceEventSeverity,
  WorkspacePermissionRequirement,
  WorkspaceResolvedModel,
  WorkspaceUrgency
} from "@/lib/workspace/types";
import type { PlatformActor } from "@/lib/platform/types";
import type { AccountAccessType } from "@prisma/client";

export type ResolveWorkspaceContextInput = WorkspaceContextInput & {
  actor: PlatformActor;
  permissions?: string[];
  approvedAccessTypes?: AccountAccessType[];
  events?: WorkspaceEvent[];
  audience?: WorkspaceEventAudience;
  includeSensitiveActivity?: boolean;
  activityLimit?: number;
};

type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export function resolveWorkspaceContext(input: ResolveWorkspaceContextInput): WorkspaceResolvedModel {
  const entityDefinition = getWorkspaceEntityDefinition(input.entity.type);
  const permissions = input.permissions ?? getActorWorkspacePermissions(input.actor, input.approvedAccessTypes);
  const permissionDecision = evaluateWorkspacePermission(entityDefinition.permission, permissions);
  const requestedModeSupported = input.requestedMode ? supportsWorkspaceMode(input.entity.type, input.requestedMode) : true;
  const resolvedMode = resolveWorkspaceMode(input.entity.type, input.requestedMode);
  const activityStream = buildWorkspaceActivityStream({
    events: input.events ?? [],
    entity: input.entity,
    includeRelatedEntities: true,
    audience: input.audience,
    includeSensitive: input.includeSensitiveActivity ?? false,
    limit: input.activityLimit ?? 25
  });
  const urgency = input.urgency ?? resolveWorkspaceUrgency(activityStream.countsBySeverity);
  const context: WorkspaceContext = {
    entity: input.entity,
    requestedMode: input.requestedMode,
    surface: input.surface ?? "web",
    device: input.device ?? "unknown",
    metadata: input.metadata,
    actor: input.actor,
    resolvedMode,
    urgency,
    permissions
  };
  const widgetKeys = getWorkspaceEntityWidgetKeys(input.entity.type);
  const commandKeys = getWorkspaceEntityCommandKeys(input.entity.type);
  const commands = resolveWorkspaceCommands({
    keys: commandKeys,
    entityType: input.entity.type,
    mode: resolvedMode,
    permissions
  });
  const widgets = resolveWorkspaceWidgets({
    keys: widgetKeys,
    entityType: input.entity.type,
    mode: resolvedMode,
    permissions
  });
  const panels = resolveWorkspacePanels({
    entityType: input.entity.type,
    mode: resolvedMode,
    permissions
  });

  return {
    context,
    entityDefinition,
    relationshipSummary: getWorkspaceRelationshipSummary(input.entity.type),
    activityStream,
    widgetKeys,
    commandKeys,
    canAccess: permissionDecision.allowed,
    deniedReason: permissionDecision.reason,
    primaryActions: buildWorkspacePrimaryActions(input.entity, commands, permissionDecision.allowed),
    secondaryActions: buildWorkspaceSecondaryActions(input.entity, resolvedMode),
    alerts: buildWorkspaceAlerts({
      permissionDecision,
      requestedModeSupported,
      urgency,
      eventCount: activityStream.visibleCount,
      hasMoreActivity: activityStream.hasMore
    }),
    widgets,
    panels,
    commands,
    activity: activityStream.items
  };
}

export function getActorWorkspacePermissions(actor: PlatformActor, approvedAccessTypes: AccountAccessType[] = []): string[] {
  return buildCapabilitySet(actor.role, approvedAccessTypes).capabilities;
}

export function evaluateWorkspacePermission(
  requirement: WorkspacePermissionRequirement | undefined,
  permissions: string[]
): PermissionDecision {
  if (!requirement) {
    return { allowed: true };
  }

  const permissionSet = new Set(permissions);
  const deniedBy = requirement.deniedBy?.filter((permission) => permissionSet.has(permission)) ?? [];
  if (deniedBy.length > 0) {
    return { allowed: false, reason: `Denied by ${deniedBy.join(", ")}.` };
  }

  const missingAllOf = requirement.allOf?.filter((permission) => !permissionSet.has(permission)) ?? [];
  if (missingAllOf.length > 0) {
    return { allowed: false, reason: `Missing required permissions: ${missingAllOf.join(", ")}.` };
  }

  if (requirement.anyOf?.length && !requirement.anyOf.some((permission) => permissionSet.has(permission))) {
    return { allowed: false, reason: `Requires one of: ${requirement.anyOf.join(", ")}.` };
  }

  return { allowed: true };
}

function buildWorkspacePrimaryActions(entity: WorkspaceContextInput["entity"], commands: WorkspaceCommand[], canAccess: boolean): WorkspaceAction[] {
  const entityRoute = getWorkspaceEntityRoute(entity);
  const openAction: WorkspaceAction | null = entityRoute
    ? {
        key: `${entity.type}.open`,
        label: "Open workspace",
        description: "Open the canonical workspace for this record.",
        href: entityRoute,
        tone: "primary",
        disabled: !canAccess,
        disabledReason: canAccess ? undefined : "You do not have permission to open this workspace."
      }
    : null;

  const commandActions = commands.slice(0, 3).map((commandDefinition) => ({
    key: commandDefinition.key,
    label: commandDefinition.label,
    description: commandDefinition.description,
    commandKey: commandDefinition.key,
    tone: "secondary" as const,
    disabled: !canAccess,
    disabledReason: canAccess ? undefined : "This action is unavailable for your current permissions."
  }));

  return [openAction, ...commandActions].filter((action): action is WorkspaceAction => Boolean(action));
}

function buildWorkspaceSecondaryActions(entity: WorkspaceContextInput["entity"], resolvedMode: WorkspaceContext["resolvedMode"]): WorkspaceAction[] {
  return [
    {
      key: `${entity.type}.copyLink`,
      label: "Copy workspace link",
      description: "Prepare a link to this workspace for internal collaboration.",
      href: getWorkspaceEntityRoute(entity),
      tone: "quiet"
    },
    {
      key: `${entity.type}.mode.${resolvedMode}`,
      label: `${humanizeWorkspaceKey(resolvedMode)} mode`,
      description: "Current workspace focus mode.",
      tone: "quiet",
      disabled: true,
      disabledReason: "This is the active workspace mode."
    }
  ];
}

function buildWorkspaceAlerts(input: {
  permissionDecision: PermissionDecision;
  requestedModeSupported: boolean;
  urgency: WorkspaceUrgency;
  eventCount: number;
  hasMoreActivity: boolean;
}): WorkspaceAlert[] {
  const alerts: WorkspaceAlert[] = [];

  if (!input.permissionDecision.allowed) {
    alerts.push({
      key: "workspace.permission.denied",
      title: "Workspace access is restricted",
      detail: input.permissionDecision.reason ?? "This record is outside the current permission scope.",
      urgency: "critical"
    });
  }

  if (!input.requestedModeSupported) {
    alerts.push({
      key: "workspace.mode.fallback",
      title: "Workspace mode adjusted",
      detail: "The requested mode is not supported for this entity, so the workspace opened in its default mode.",
      urgency: "low"
    });
  }

  if (input.urgency === "critical" || input.urgency === "high") {
    alerts.push({
      key: "workspace.activity.attention",
      title: "Recent activity needs attention",
      detail: "High-priority activity exists in this workspace timeline.",
      urgency: input.urgency
    });
  }

  if (input.hasMoreActivity) {
    alerts.push({
      key: "workspace.activity.more",
      title: "More activity available",
      detail: `${input.eventCount} timeline items are visible in this preview. Open the full timeline for more context.`,
      urgency: "none"
    });
  }

  return alerts;
}

function resolveWorkspaceUrgency(countsBySeverity: Partial<Record<WorkspaceEventSeverity, number>>): WorkspaceUrgency {
  if ((countsBySeverity.critical ?? 0) > 0) {
    return "critical";
  }

  if ((countsBySeverity.error ?? 0) > 0) {
    return "high";
  }

  if ((countsBySeverity.warning ?? 0) > 0) {
    return "medium";
  }

  if ((countsBySeverity.info ?? 0) > 0 || (countsBySeverity.success ?? 0) > 0) {
    return "low";
  }

  return "none";
}

function humanizeWorkspaceKey(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}
