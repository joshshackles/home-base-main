import { getWorkspaceEntityLabel, getWorkspaceEntityRoute } from "@/lib/workspace/entity-registry";
import type {
  WorkspaceActivityItem,
  WorkspaceEntityRef,
  WorkspaceEntityType,
  WorkspaceEvent,
  WorkspaceEventAudience,
  WorkspaceEventCategory,
  WorkspaceEventDefinition,
  WorkspaceEventSeverity
} from "@/lib/workspace/types";
import type { PlatformActor } from "@/lib/platform/types";

type EventOptions = {
  label: string;
  description: string;
  category: WorkspaceEventCategory;
  severity?: WorkspaceEventSeverity;
  entityTypes: WorkspaceEntityType[];
  relatedEntityTypes?: WorkspaceEntityType[];
  audiences?: WorkspaceEventAudience[];
  createsAuditEvidence?: boolean;
  createsTimelineItem?: boolean;
  canTriggerAutomation?: boolean;
  sensitive?: boolean;
};

type CreateWorkspaceEventInput = {
  type: WorkspaceEventType;
  entity: WorkspaceEntityRef;
  actor?: Pick<PlatformActor, "userId" | "email" | "name" | "role"> | null;
  occurredAt?: Date;
  title?: string;
  detail?: string;
  relatedEntities?: WorkspaceEntityRef[];
  metadata?: Record<string, unknown>;
};

const event = (type: WorkspaceEventType, options: EventOptions): WorkspaceEventDefinition => ({
  type,
  label: options.label,
  description: options.description,
  category: options.category,
  severity: options.severity ?? "info",
  entityTypes: options.entityTypes,
  relatedEntityTypes: options.relatedEntityTypes,
  audiences: options.audiences ?? ["admin"],
  createsAuditEvidence: options.createsAuditEvidence ?? false,
  createsTimelineItem: options.createsTimelineItem ?? true,
  canTriggerAutomation: options.canTriggerAutomation ?? true,
  sensitive: options.sensitive ?? false
});

export const workspaceEventTypes = [
  "listing.created",
  "listing.updated",
  "listing.published",
  "listing.unpublished",
  "lead.created",
  "lead.contacted",
  "showing.requested",
  "showing.scheduled",
  "application.started",
  "application.submitted",
  "application.updated",
  "application.approved",
  "application.denied",
  "lease.generated",
  "lease.sent_for_signature",
  "lease.signed",
  "lease.renewal_due",
  "tenant.assigned",
  "tenant.move_out_started",
  "payment.posted",
  "payment.failed",
  "rent.overdue",
  "ledger.adjusted",
  "subsidy.receipt_posted",
  "maintenance.created",
  "maintenance.assigned",
  "work_order.status_changed",
  "work_order.completed",
  "vendor_invoice.submitted",
  "vendor_invoice.approved",
  "inspection.scheduled",
  "inspection.completed",
  "inspection.failed",
  "inspection.correction_created",
  "document.uploaded",
  "document.shared",
  "document.revoked",
  "message.received",
  "message.resolved",
  "program_case.created",
  "rfta.submitted",
  "rfta.needs_correction",
  "voucher.expiring",
  "hap.hold_created",
  "certification.created",
  "certification.approved",
  "integration.degraded",
  "api_key.created",
  "admin.action_recorded"
] as const;

export type WorkspaceEventType = (typeof workspaceEventTypes)[number];

export const workspaceEventRegistry = {
  "listing.created": event("listing.created", {
    label: "Listing created",
    description: "A draft listing was created for a unit.",
    category: "leasing",
    entityTypes: ["unit"],
    relatedEntityTypes: ["property"],
    audiences: ["landlord", "admin"]
  }),
  "listing.updated": event("listing.updated", {
    label: "Listing updated",
    description: "Listing details, media, pricing, or visibility settings changed.",
    category: "leasing",
    entityTypes: ["unit"],
    relatedEntityTypes: ["document"],
    audiences: ["landlord", "admin"]
  }),
  "listing.published": event("listing.published", {
    label: "Listing published",
    description: "A listing became publicly visible.",
    category: "leasing",
    severity: "success",
    entityTypes: ["unit"],
    audiences: ["public", "landlord", "admin"]
  }),
  "listing.unpublished": event("listing.unpublished", {
    label: "Listing unpublished",
    description: "A listing was removed from public search.",
    category: "leasing",
    severity: "warning",
    entityTypes: ["unit"],
    audiences: ["landlord", "admin"]
  }),
  "lead.created": event("lead.created", {
    label: "Lead created",
    description: "A renter submitted an inquiry or guest card.",
    category: "leasing",
    entityTypes: ["lead"],
    relatedEntityTypes: ["unit", "message_thread"],
    audiences: ["applicant", "landlord", "admin"]
  }),
  "lead.contacted": event("lead.contacted", {
    label: "Lead contacted",
    description: "A leasing user contacted a lead.",
    category: "leasing",
    entityTypes: ["lead"],
    relatedEntityTypes: ["message_thread"],
    audiences: ["landlord", "admin"]
  }),
  "showing.requested": event("showing.requested", {
    label: "Tour requested",
    description: "A renter requested a showing or tour.",
    category: "leasing",
    entityTypes: ["lead"],
    relatedEntityTypes: ["unit"],
    audiences: ["applicant", "landlord", "admin"]
  }),
  "showing.scheduled": event("showing.scheduled", {
    label: "Tour scheduled",
    description: "A showing or tour was scheduled.",
    category: "leasing",
    severity: "success",
    entityTypes: ["lead"],
    relatedEntityTypes: ["unit"],
    audiences: ["applicant", "landlord", "admin"]
  }),
  "application.started": event("application.started", {
    label: "Application started",
    description: "A renter began an application.",
    category: "application",
    entityTypes: ["application"],
    relatedEntityTypes: ["applicant", "unit"],
    audiences: ["applicant", "landlord", "admin"]
  }),
  "application.submitted": event("application.submitted", {
    label: "Application submitted",
    description: "An application was submitted for review.",
    category: "application",
    severity: "success",
    entityTypes: ["application"],
    relatedEntityTypes: ["applicant", "unit", "document"],
    audiences: ["applicant", "landlord", "admin"],
    createsAuditEvidence: true
  }),
  "application.updated": event("application.updated", {
    label: "Application updated",
    description: "An application was updated or missing items changed.",
    category: "application",
    entityTypes: ["application"],
    relatedEntityTypes: ["document"],
    audiences: ["applicant", "landlord", "admin"]
  }),
  "application.approved": event("application.approved", {
    label: "Application approved",
    description: "An application decision approved the applicant for the unit.",
    category: "application",
    severity: "success",
    entityTypes: ["application"],
    relatedEntityTypes: ["applicant", "unit", "lease"],
    audiences: ["applicant", "landlord", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "application.denied": event("application.denied", {
    label: "Application denied",
    description: "An application decision denied the application.",
    category: "application",
    severity: "warning",
    entityTypes: ["application"],
    relatedEntityTypes: ["applicant", "unit"],
    audiences: ["applicant", "landlord", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "lease.generated": event("lease.generated", {
    label: "Lease generated",
    description: "A lease packet or uploaded lease was prepared.",
    category: "lease",
    entityTypes: ["lease"],
    relatedEntityTypes: ["unit", "tenant", "document"],
    audiences: ["tenant", "landlord", "admin"]
  }),
  "lease.sent_for_signature": event("lease.sent_for_signature", {
    label: "Lease sent for signature",
    description: "A lease or lease document was sent for signature.",
    category: "lease",
    entityTypes: ["lease"],
    relatedEntityTypes: ["tenant", "document"],
    audiences: ["tenant", "landlord", "admin"],
    createsAuditEvidence: true
  }),
  "lease.signed": event("lease.signed", {
    label: "Lease signed",
    description: "A required lease signature was completed.",
    category: "lease",
    severity: "success",
    entityTypes: ["lease"],
    relatedEntityTypes: ["tenant", "document"],
    audiences: ["tenant", "landlord", "admin"],
    createsAuditEvidence: true
  }),
  "lease.renewal_due": event("lease.renewal_due", {
    label: "Lease renewal due",
    description: "A lease is entering a renewal decision window.",
    category: "lease",
    severity: "warning",
    entityTypes: ["lease"],
    relatedEntityTypes: ["unit", "tenant"],
    audiences: ["tenant", "landlord", "owner", "admin"]
  }),
  "tenant.assigned": event("tenant.assigned", {
    label: "Resident assigned",
    description: "A resident or household was assigned to a unit.",
    category: "lease",
    severity: "success",
    entityTypes: ["tenant"],
    relatedEntityTypes: ["unit", "lease"],
    audiences: ["tenant", "landlord", "admin"],
    createsAuditEvidence: true
  }),
  "tenant.move_out_started": event("tenant.move_out_started", {
    label: "Move-out started",
    description: "A resident move-out workflow began.",
    category: "lease",
    severity: "warning",
    entityTypes: ["tenant"],
    relatedEntityTypes: ["unit", "lease", "inspection"],
    audiences: ["tenant", "landlord", "admin"]
  }),
  "payment.posted": event("payment.posted", {
    label: "Payment posted",
    description: "A tenant, subsidy, or manual payment was posted.",
    category: "financial",
    severity: "success",
    entityTypes: ["payment"],
    relatedEntityTypes: ["ledger", "unit", "tenant"],
    audiences: ["tenant", "landlord", "owner", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "payment.failed": event("payment.failed", {
    label: "Payment failed",
    description: "A payment failed, was returned, or could not be processed.",
    category: "financial",
    severity: "error",
    entityTypes: ["payment"],
    relatedEntityTypes: ["ledger", "tenant"],
    audiences: ["tenant", "landlord", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "rent.overdue": event("rent.overdue", {
    label: "Rent overdue",
    description: "A tenant balance or rent charge is overdue.",
    category: "financial",
    severity: "warning",
    entityTypes: ["ledger"],
    relatedEntityTypes: ["tenant", "unit"],
    audiences: ["tenant", "landlord", "admin"],
    sensitive: true
  }),
  "ledger.adjusted": event("ledger.adjusted", {
    label: "Ledger adjusted",
    description: "A manual charge, credit, void, reversal, or adjustment changed a ledger.",
    category: "financial",
    severity: "warning",
    entityTypes: ["ledger"],
    relatedEntityTypes: ["payment"],
    audiences: ["landlord", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "subsidy.receipt_posted": event("subsidy.receipt_posted", {
    label: "Subsidy receipt posted",
    description: "A subsidy or HAP receipt was posted against expected subsidy.",
    category: "financial",
    severity: "success",
    entityTypes: ["hap_contract"],
    relatedEntityTypes: ["ledger", "program_case", "payment"],
    audiences: ["landlord", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "maintenance.created": event("maintenance.created", {
    label: "Maintenance request created",
    description: "A repair or service request was created.",
    category: "maintenance",
    entityTypes: ["maintenance_request"],
    relatedEntityTypes: ["unit", "tenant", "document"],
    audiences: ["tenant", "landlord", "vendor", "admin"]
  }),
  "maintenance.assigned": event("maintenance.assigned", {
    label: "Maintenance assigned",
    description: "A maintenance request or work order was assigned.",
    category: "maintenance",
    entityTypes: ["work_order"],
    relatedEntityTypes: ["maintenance_request", "unit"],
    audiences: ["landlord", "vendor", "admin"],
    createsAuditEvidence: true
  }),
  "work_order.status_changed": event("work_order.status_changed", {
    label: "Work order status changed",
    description: "A work order moved to a new lifecycle state.",
    category: "maintenance",
    entityTypes: ["work_order"],
    relatedEntityTypes: ["maintenance_request", "unit"],
    audiences: ["tenant", "landlord", "vendor", "admin"]
  }),
  "work_order.completed": event("work_order.completed", {
    label: "Work order completed",
    description: "Assigned maintenance work was marked complete.",
    category: "maintenance",
    severity: "success",
    entityTypes: ["work_order"],
    relatedEntityTypes: ["maintenance_request", "unit", "vendor_invoice"],
    audiences: ["tenant", "landlord", "vendor", "owner", "admin"]
  }),
  "vendor_invoice.submitted": event("vendor_invoice.submitted", {
    label: "Vendor invoice submitted",
    description: "A vendor submitted an invoice for review.",
    category: "financial",
    entityTypes: ["vendor_invoice"],
    relatedEntityTypes: ["work_order", "document"],
    audiences: ["landlord", "vendor", "owner", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "vendor_invoice.approved": event("vendor_invoice.approved", {
    label: "Vendor invoice approved",
    description: "A vendor invoice was approved for payment readiness.",
    category: "financial",
    severity: "success",
    entityTypes: ["vendor_invoice"],
    relatedEntityTypes: ["work_order"],
    audiences: ["landlord", "vendor", "owner", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "inspection.scheduled": event("inspection.scheduled", {
    label: "Inspection scheduled",
    description: "An inspection appointment or assignment was scheduled.",
    category: "inspection",
    entityTypes: ["inspection"],
    relatedEntityTypes: ["unit", "program_case"],
    audiences: ["tenant", "landlord", "program", "admin"]
  }),
  "inspection.completed": event("inspection.completed", {
    label: "Inspection completed",
    description: "An inspection checklist was completed.",
    category: "inspection",
    severity: "success",
    entityTypes: ["inspection"],
    relatedEntityTypes: ["unit", "document"],
    audiences: ["landlord", "owner", "program", "admin"]
  }),
  "inspection.failed": event("inspection.failed", {
    label: "Inspection failed",
    description: "An inspection outcome requires correction or reinspection.",
    category: "inspection",
    severity: "warning",
    entityTypes: ["inspection"],
    relatedEntityTypes: ["unit", "work_order", "program_case"],
    audiences: ["tenant", "landlord", "owner", "program", "admin"]
  }),
  "inspection.correction_created": event("inspection.correction_created", {
    label: "Correction created",
    description: "A failed inspection item created a correction workflow.",
    category: "inspection",
    severity: "warning",
    entityTypes: ["inspection"],
    relatedEntityTypes: ["work_order", "unit"],
    audiences: ["tenant", "landlord", "program", "admin"]
  }),
  "document.uploaded": event("document.uploaded", {
    label: "Document uploaded",
    description: "A document, media item, or report was uploaded.",
    category: "document",
    entityTypes: ["document"],
    relatedEntityTypes: ["unit", "application", "lease", "maintenance_request", "inspection", "program_case"],
    audiences: ["applicant", "tenant", "landlord", "vendor", "owner", "program", "admin"]
  }),
  "document.shared": event("document.shared", {
    label: "Document shared",
    description: "Document access was shared with another role or user.",
    category: "document",
    entityTypes: ["document"],
    audiences: ["applicant", "tenant", "landlord", "owner", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "document.revoked": event("document.revoked", {
    label: "Document access revoked",
    description: "Document sharing access was revoked.",
    category: "document",
    severity: "warning",
    entityTypes: ["document"],
    audiences: ["landlord", "owner", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "message.received": event("message.received", {
    label: "Message received",
    description: "A message was received in a conversation.",
    category: "communication",
    entityTypes: ["message_thread"],
    relatedEntityTypes: ["lead", "application", "tenant", "work_order", "program_case"],
    audiences: ["applicant", "tenant", "landlord", "vendor", "owner", "program", "admin"]
  }),
  "message.resolved": event("message.resolved", {
    label: "Conversation resolved",
    description: "A conversation was marked resolved or closed.",
    category: "communication",
    severity: "success",
    entityTypes: ["message_thread"],
    audiences: ["landlord", "vendor", "program", "admin"]
  }),
  "program_case.created": event("program_case.created", {
    label: "Program case created",
    description: "An affordable housing or assistance program case was created.",
    category: "program",
    entityTypes: ["program_case"],
    relatedEntityTypes: ["tenant", "voucher"],
    audiences: ["tenant", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "rfta.submitted": event("rfta.submitted", {
    label: "RFTA submitted",
    description: "An RFTA or landlord packet was submitted for review.",
    category: "program",
    entityTypes: ["program_case"],
    relatedEntityTypes: ["unit", "document", "voucher"],
    audiences: ["tenant", "landlord", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "rfta.needs_correction": event("rfta.needs_correction", {
    label: "RFTA needs correction",
    description: "An RFTA packet requires corrections or missing items.",
    category: "program",
    severity: "warning",
    entityTypes: ["program_case"],
    relatedEntityTypes: ["document", "unit"],
    audiences: ["tenant", "landlord", "program", "admin"]
  }),
  "voucher.expiring": event("voucher.expiring", {
    label: "Voucher expiring",
    description: "A voucher or assistance authorization is nearing expiration.",
    category: "program",
    severity: "warning",
    entityTypes: ["voucher"],
    relatedEntityTypes: ["program_case"],
    audiences: ["tenant", "program", "admin"],
    sensitive: true
  }),
  "hap.hold_created": event("hap.hold_created", {
    label: "Subsidy hold created",
    description: "A subsidy or HAP payment hold was recorded.",
    category: "program",
    severity: "warning",
    entityTypes: ["hap_contract"],
    relatedEntityTypes: ["program_case", "ledger"],
    audiences: ["landlord", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "certification.created": event("certification.created", {
    label: "Certification packet created",
    description: "A certification or recertification packet was created.",
    category: "program",
    entityTypes: ["certification_packet"],
    relatedEntityTypes: ["program_case", "document"],
    audiences: ["tenant", "program", "admin"],
    sensitive: true
  }),
  "certification.approved": event("certification.approved", {
    label: "Certification approved",
    description: "A certification or recertification packet was approved.",
    category: "program",
    severity: "success",
    entityTypes: ["certification_packet"],
    relatedEntityTypes: ["program_case"],
    audiences: ["tenant", "program", "admin"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "integration.degraded": event("integration.degraded", {
    label: "Integration degraded",
    description: "An integration health check or token refresh reported degraded service.",
    category: "integration",
    severity: "error",
    entityTypes: ["organization"],
    audiences: ["admin", "system"],
    createsAuditEvidence: true
  }),
  "api_key.created": event("api_key.created", {
    label: "API key created",
    description: "An API key was created for integration access.",
    category: "admin",
    severity: "warning",
    entityTypes: ["organization"],
    audiences: ["admin", "system"],
    createsAuditEvidence: true,
    sensitive: true
  }),
  "admin.action_recorded": event("admin.action_recorded", {
    label: "Admin action recorded",
    description: "An administrative action was recorded for audit review.",
    category: "admin",
    severity: "warning",
    entityTypes: ["organization"],
    audiences: ["admin", "system"],
    createsAuditEvidence: true,
    sensitive: true
  })
} satisfies Record<WorkspaceEventType, WorkspaceEventDefinition>;

export function getWorkspaceEventDefinition(type: WorkspaceEventType): WorkspaceEventDefinition {
  return workspaceEventRegistry[type];
}

export function getWorkspaceEventsForEntity(entityType: WorkspaceEntityType): WorkspaceEventDefinition[] {
  return workspaceEventTypes
    .map((type) => workspaceEventRegistry[type])
    .filter((definition) => definition.entityTypes.includes(entityType) || definition.relatedEntityTypes?.includes(entityType));
}

export function getWorkspaceEventsByCategory(category: WorkspaceEventCategory): WorkspaceEventDefinition[] {
  return workspaceEventTypes
    .map((type) => workspaceEventRegistry[type])
    .filter((definition) => definition.category === category);
}

export function createWorkspaceEvent(input: CreateWorkspaceEventInput): WorkspaceEvent {
  const definition = getWorkspaceEventDefinition(input.type);
  const entityLabel = getWorkspaceEntityLabel(input.entity.type);

  return {
    type: input.type,
    category: definition.category,
    entity: input.entity,
    actor: input.actor ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    title: input.title ?? definition.label,
    detail: input.detail ?? `${definition.label} for ${entityLabel}.`,
    severity: definition.severity,
    audience: definition.audiences,
    relatedEntities: input.relatedEntities,
    metadata: input.metadata
  };
}

export function workspaceEventToActivityItem(event: WorkspaceEvent): WorkspaceActivityItem {
  const actorLabel = event.actor?.name ?? event.actor?.email ?? event.actor?.role ?? undefined;
  const relatedEntity = event.relatedEntities?.[0];

  return {
    id: event.id ?? createDeterministicActivityId(event),
    eventType: event.type,
    category: event.category,
    title: event.title,
    detail: event.detail,
    occurredAt: event.occurredAt,
    actorLabel,
    entity: event.entity,
    relatedEntity,
    href: getWorkspaceEntityRoute(relatedEntity ?? event.entity),
    severity: event.severity,
    sensitive: isKnownWorkspaceEvent(event.type) ? isSensitiveWorkspaceEvent(event.type) : undefined
  };
}

export function workspaceEventsToActivityItems(events: WorkspaceEvent[]): WorkspaceActivityItem[] {
  return [...events]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .map(workspaceEventToActivityItem);
}

export function shouldWorkspaceEventCreateAuditEvidence(type: WorkspaceEventType): boolean {
  return getWorkspaceEventDefinition(type).createsAuditEvidence ?? false;
}

export function shouldWorkspaceEventCreateTimelineItem(type: WorkspaceEventType): boolean {
  return getWorkspaceEventDefinition(type).createsTimelineItem ?? true;
}

export function canWorkspaceEventTriggerAutomation(type: WorkspaceEventType): boolean {
  return getWorkspaceEventDefinition(type).canTriggerAutomation ?? true;
}

export function isSensitiveWorkspaceEvent(type: WorkspaceEventType): boolean {
  return getWorkspaceEventDefinition(type).sensitive ?? false;
}

function createDeterministicActivityId(event: WorkspaceEvent): string {
  return [
    event.type,
    event.entity.type,
    event.entity.id,
    event.occurredAt.toISOString(),
    event.relatedEntities?.map((entity) => `${entity.type}:${entity.id}`).join(",") ?? "none"
  ].join("|");
}

function isKnownWorkspaceEvent(type: string): type is WorkspaceEventType {
  return workspaceEventTypes.includes(type as WorkspaceEventType);
}
