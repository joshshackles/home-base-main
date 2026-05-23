import {
  getWorkspaceEntityDefinition,
  getWorkspaceEntityRelationships,
  workspaceEntityTypes
} from "@/lib/workspace/entity-registry";
import type {
  WorkspaceEntityType,
  WorkspaceRelationshipDefinition,
  WorkspaceRelationshipDirection,
  WorkspaceRelationshipEdge,
  WorkspaceRelationshipPath,
  WorkspaceRelationshipSummary
} from "@/lib/workspace/types";

const HIGH_VALUE_RELATIONSHIP_KEYS = new Set([
  "unit.property",
  "unit.currentTenant",
  "unit.applications",
  "unit.lease",
  "unit.ledger",
  "unit.maintenanceRequests",
  "unit.inspections",
  "application.applicant",
  "application.unit",
  "lease.tenant",
  "lease.documents",
  "ledger.payments",
  "maintenanceRequest.workOrder",
  "workOrder.invoice",
  "inspection.workOrders",
  "programCase.voucher",
  "programCase.hapContract",
  "programCase.inspections",
  "hapContract.ledger"
]);

const outboundRelationships = workspaceEntityTypes.flatMap((type) => getWorkspaceEntityRelationships(type));

const inboundRelationshipIndex = outboundRelationships.reduce(
  (index, relationship) => {
    index[relationship.to] = [...(index[relationship.to] ?? []), relationship];
    return index;
  },
  {} as Partial<Record<WorkspaceEntityType, WorkspaceRelationshipDefinition[]>>
);

function toOutboundEdge(relationship: WorkspaceRelationshipDefinition): WorkspaceRelationshipEdge {
  return {
    ...relationship,
    direction: "outbound",
    source: relationship.from,
    target: relationship.to
  };
}

function toInboundEdge(relationship: WorkspaceRelationshipDefinition): WorkspaceRelationshipEdge {
  return {
    ...relationship,
    direction: "inbound",
    source: relationship.to,
    target: relationship.from
  };
}

function edgeKey(edge: WorkspaceRelationshipEdge): string {
  return `${edge.source}:${edge.target}:${edge.key}:${edge.direction}`;
}

export function getWorkspaceOutboundRelationships(type: WorkspaceEntityType): WorkspaceRelationshipDefinition[] {
  return getWorkspaceEntityRelationships(type);
}

export function getWorkspaceInboundRelationships(type: WorkspaceEntityType): WorkspaceRelationshipDefinition[] {
  return inboundRelationshipIndex[type] ?? [];
}

export function getWorkspaceRelationshipEdges(
  type: WorkspaceEntityType,
  direction: WorkspaceRelationshipDirection = "both"
): WorkspaceRelationshipEdge[] {
  const outbound = getWorkspaceOutboundRelationships(type).map(toOutboundEdge);
  const inbound = getWorkspaceInboundRelationships(type).map(toInboundEdge);

  if (direction === "outbound") {
    return outbound;
  }

  if (direction === "inbound") {
    return inbound;
  }

  return [...outbound, ...inbound];
}

export function getWorkspaceRelationshipByKey(key: string): WorkspaceRelationshipDefinition | undefined {
  return outboundRelationships.find((relationship) => relationship.key === key);
}

export function getWorkspaceRelationshipsBetween(
  from: WorkspaceEntityType,
  to: WorkspaceEntityType,
  direction: WorkspaceRelationshipDirection = "both"
): WorkspaceRelationshipEdge[] {
  return getWorkspaceRelationshipEdges(from, direction).filter((relationship) => relationship.target === to);
}

export function getWorkspaceAdjacentEntityTypes(
  type: WorkspaceEntityType,
  direction: WorkspaceRelationshipDirection = "both"
): WorkspaceEntityType[] {
  return Array.from(new Set(getWorkspaceRelationshipEdges(type, direction).map((relationship) => relationship.target)));
}

export function hasWorkspaceRelationshipPath(
  from: WorkspaceEntityType,
  to: WorkspaceEntityType,
  maxDepth = 3
): boolean {
  return Boolean(findWorkspaceRelationshipPath(from, to, maxDepth));
}

export function findWorkspaceRelationshipPath(
  from: WorkspaceEntityType,
  to: WorkspaceEntityType,
  maxDepth = 3
): WorkspaceRelationshipPath | undefined {
  if (from === to) {
    return { from, to, edges: [] };
  }

  const queue: WorkspaceRelationshipPath[] = [{ from, to, edges: [] }];
  const visited = new Set<WorkspaceEntityType>([from]);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (!currentPath) {
      continue;
    }

    const currentType = currentPath.edges.at(-1)?.target ?? from;
    if (currentPath.edges.length >= maxDepth) {
      continue;
    }

    for (const edge of getWorkspaceRelationshipEdges(currentType)) {
      const nextType = edge.target;
      const nextPath = { from, to, edges: [...currentPath.edges, edge] };

      if (nextType === to) {
        return nextPath;
      }

      if (!visited.has(nextType)) {
        visited.add(nextType);
        queue.push(nextPath);
      }
    }
  }

  return undefined;
}

export function getWorkspaceRelationshipSummaries(): WorkspaceRelationshipSummary[] {
  return workspaceEntityTypes.map((entityType) => getWorkspaceRelationshipSummary(entityType));
}

export function getWorkspaceRelationshipSummary(entityType: WorkspaceEntityType): WorkspaceRelationshipSummary {
  const definition = getWorkspaceEntityDefinition(entityType);
  const outbound = getWorkspaceOutboundRelationships(entityType);
  const inbound = getWorkspaceInboundRelationships(entityType);
  const relatedTypes = Array.from(new Set([...outbound.map((item) => item.to), ...inbound.map((item) => item.from)]));
  const relationshipKeys = [...outbound, ...inbound]
    .map((relationship) => relationship.key)
    .filter((key) => HIGH_VALUE_RELATIONSHIP_KEYS.has(key));

  return {
    entityType,
    label: definition.label,
    pluralLabel: definition.pluralLabel,
    outboundCount: outbound.length,
    inboundCount: inbound.length,
    relatedTypes,
    highValueRelationshipKeys: Array.from(new Set(relationshipKeys))
  };
}

export function createWorkspaceRelationshipSignature(type: WorkspaceEntityType): string {
  return getWorkspaceRelationshipEdges(type)
    .map(edgeKey)
    .sort()
    .join("|");
}
