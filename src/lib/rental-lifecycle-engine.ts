import {
  ApplicationStatus,
  FormalNoticeStatus,
  LeasePacketStatus,
  OccupancyStatus,
  RentalLifecycleStatus,
  UnitStatus
} from "@prisma/client";

export type RentalLifecycleSignalInput = {
  unitStatus: UnitStatus;
  storedLifecycleStatus?: RentalLifecycleStatus | null;
  tenantUserId?: string | null;
  currentApplicationId?: string | null;
  leadCount?: number;
  applicationStatuses?: ApplicationStatus[];
  leasePacketStatuses?: LeasePacketStatus[];
  occupancyStatuses?: OccupancyStatus[];
  noticeStatuses?: FormalNoticeStatus[];
  openMaintenanceCount?: number;
  photoCount?: number;
  hasDescription?: boolean;
  hasTerms?: boolean;
};

export type RentalLifecycleRecommendation = {
  status: RentalLifecycleStatus;
  confidence: number;
  reason: string;
  unitStatus: UnitStatus;
  signals: string[];
  nextActions: Array<{ label: string; href: string; tone: "primary" | "neutral" | "warning" | "danger" }>;
};

export const rentalLifecycleEngineSteps: Array<{
  status: RentalLifecycleStatus;
  label: string;
  lane: "Setup" | "Market" | "Lease" | "Resident" | "Exit" | "Hold";
  description: string;
}> = [
  { status: RentalLifecycleStatus.DRAFT, label: "Draft", lane: "Setup", description: "Internal setup before the rental is ready for public discovery." },
  { status: RentalLifecycleStatus.COMING_SOON, label: "Coming soon", lane: "Market", description: "Media, terms, and marketing are nearly ready." },
  { status: RentalLifecycleStatus.ACTIVE, label: "Active", lane: "Market", description: "Public, available, and accepting leads." },
  { status: RentalLifecycleStatus.LEAD_ACTIVITY, label: "Lead activity", lane: "Market", description: "Prospects are asking questions, saving, or touring." },
  { status: RentalLifecycleStatus.APPLICATION_PENDING, label: "Application pending", lane: "Lease", description: "Applicant review is underway." },
  { status: RentalLifecycleStatus.LEASE_PENDING, label: "Lease pending", lane: "Lease", description: "Approved applicant is waiting on lease execution." },
  { status: RentalLifecycleStatus.MOVE_IN_SCHEDULED, label: "Move-in scheduled", lane: "Lease", description: "Move-in, deposit, and first payment should be coordinated." },
  { status: RentalLifecycleStatus.OCCUPIED, label: "Occupied", lane: "Resident", description: "Tenant relationship is active." },
  { status: RentalLifecycleStatus.RENEWAL_PENDING, label: "Renewal pending", lane: "Resident", description: "Renewal decision, lease update, or non-renewal notice is needed." },
  { status: RentalLifecycleStatus.NOTICE_GIVEN, label: "Notice given", lane: "Exit", description: "Tenant notice, landlord notice, or move-out plan is active." },
  { status: RentalLifecycleStatus.TURNOVER, label: "Turnover", lane: "Exit", description: "Prepare, repair, clean, inspect, and relist." },
  { status: RentalLifecycleStatus.MAINTENANCE_HOLD, label: "Maintenance hold", lane: "Hold", description: "Unavailable until repairs, inspection, or compliance blockers are cleared." },
  { status: RentalLifecycleStatus.ARCHIVED, label: "Archived", lane: "Hold", description: "Removed from active operations." }
];

const activeApplicationStatuses = new Set<ApplicationStatus>([
  ApplicationStatus.STARTED,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW
]);

const approvedApplicationStatuses = new Set<ApplicationStatus>([ApplicationStatus.APPROVED]);
const pendingLeaseStatuses = new Set<LeasePacketStatus>([LeasePacketStatus.DRAFT, LeasePacketStatus.READY_FOR_REVIEW, LeasePacketStatus.APPROVED, LeasePacketStatus.SENT_FOR_SIGNATURE]);
const signedLeaseStatuses = new Set<LeasePacketStatus>([LeasePacketStatus.COMPLETED]);
const activeOccupancyStatuses = new Set<OccupancyStatus>([
  OccupancyStatus.PENDING_MOVE_IN,
  OccupancyStatus.ACTIVE,
  OccupancyStatus.RENEWAL_PENDING,
  OccupancyStatus.NOTICE_GIVEN,
  OccupancyStatus.MOVE_OUT_SCHEDULED
]);
const noticeGivenStatuses = new Set<OccupancyStatus>([OccupancyStatus.NOTICE_GIVEN, OccupancyStatus.MOVE_OUT_SCHEDULED]);

export function lifecycleLabel(status: RentalLifecycleStatus) {
  return rentalLifecycleEngineSteps.find((step) => step.status === status)?.label ?? status;
}

export function lifecycleLane(status: RentalLifecycleStatus) {
  return rentalLifecycleEngineSteps.find((step) => step.status === status)?.lane ?? "Market";
}

export function lifecycleToUnitStatus(status: RentalLifecycleStatus): UnitStatus {
  if (status === RentalLifecycleStatus.OCCUPIED || status === RentalLifecycleStatus.RENEWAL_PENDING || status === RentalLifecycleStatus.NOTICE_GIVEN) return UnitStatus.OCCUPIED;
  if (status === RentalLifecycleStatus.ARCHIVED) return UnitStatus.ARCHIVED;
  if (status === RentalLifecycleStatus.MAINTENANCE_HOLD || status === RentalLifecycleStatus.TURNOVER) return UnitStatus.UNAVAILABLE;
  if (status === RentalLifecycleStatus.APPLICATION_PENDING || status === RentalLifecycleStatus.LEASE_PENDING || status === RentalLifecycleStatus.MOVE_IN_SCHEDULED) return UnitStatus.PENDING;
  return UnitStatus.AVAILABLE;
}

export function recommendRentalLifecycle(input: RentalLifecycleSignalInput): RentalLifecycleRecommendation {
  const signals: string[] = [];
  const applications = input.applicationStatuses ?? [];
  const leases = input.leasePacketStatuses ?? [];
  const occupancies = input.occupancyStatuses ?? [];
  const notices = input.noticeStatuses ?? [];
  const openMaintenanceCount = input.openMaintenanceCount ?? 0;
  const leadCount = input.leadCount ?? 0;

  let status = input.storedLifecycleStatus ?? RentalLifecycleStatus.ACTIVE;
  let confidence = input.storedLifecycleStatus ? 72 : 58;
  let reason = input.storedLifecycleStatus ? "Using stored lifecycle unless stronger workflow signals override it." : "Derived from current rental workflow signals.";

  if (input.unitStatus === UnitStatus.ARCHIVED) {
    status = RentalLifecycleStatus.ARCHIVED;
    confidence = 98;
    reason = "Unit is archived.";
    signals.push("Archived unit status");
  } else if (openMaintenanceCount > 0 && !input.tenantUserId && input.unitStatus !== UnitStatus.OCCUPIED) {
    status = RentalLifecycleStatus.MAINTENANCE_HOLD;
    confidence = 86;
    reason = "Open maintenance exists before an active tenancy.";
    signals.push(`${openMaintenanceCount} open maintenance request${openMaintenanceCount === 1 ? "" : "s"}`);
  } else if (occupancies.some((item) => item === OccupancyStatus.FORMER) && !occupancies.some((item) => activeOccupancyStatuses.has(item)) && input.unitStatus !== UnitStatus.AVAILABLE) {
    status = RentalLifecycleStatus.TURNOVER;
    confidence = 82;
    reason = "Prior tenancy has ended and the rental needs turnover handling.";
    signals.push("Former occupancy history");
  } else if (occupancies.some((item) => noticeGivenStatuses.has(item))) {
    status = RentalLifecycleStatus.NOTICE_GIVEN;
    confidence = 92;
    reason = "Active occupancy has notice or move-out scheduling.";
    signals.push("Notice or move-out occupancy state");
  } else if (occupancies.some((item) => item === OccupancyStatus.RENEWAL_PENDING)) {
    status = RentalLifecycleStatus.RENEWAL_PENDING;
    confidence = 90;
    reason = "Active occupancy is in renewal review.";
    signals.push("Renewal pending occupancy");
  } else if (occupancies.some((item) => item === OccupancyStatus.PENDING_MOVE_IN)) {
    status = RentalLifecycleStatus.MOVE_IN_SCHEDULED;
    confidence = 92;
    reason = "Tenant relationship exists with a future or pending move-in.";
    signals.push("Pending move-in occupancy");
  } else if (input.tenantUserId || occupancies.some((item) => item === OccupancyStatus.ACTIVE)) {
    status = RentalLifecycleStatus.OCCUPIED;
    confidence = 94;
    reason = "Tenant relationship is active.";
    signals.push("Active tenant assignment");
  } else if (leases.some((item) => signedLeaseStatuses.has(item))) {
    status = RentalLifecycleStatus.MOVE_IN_SCHEDULED;
    confidence = 86;
    reason = "Lease is signed and move-in coordination should be next.";
    signals.push("Signed lease packet");
  } else if (leases.some((item) => pendingLeaseStatuses.has(item)) || applications.some((item) => approvedApplicationStatuses.has(item))) {
    status = RentalLifecycleStatus.LEASE_PENDING;
    confidence = 84;
    reason = "Approved application or lease packet is waiting on execution.";
    signals.push("Approved application or pending lease");
  } else if (applications.some((item) => activeApplicationStatuses.has(item)) || input.currentApplicationId) {
    status = RentalLifecycleStatus.APPLICATION_PENDING;
    confidence = 82;
    reason = "Application review is active.";
    signals.push("Application in progress");
  } else if (leadCount > 0) {
    status = RentalLifecycleStatus.LEAD_ACTIVITY;
    confidence = 76;
    reason = "Marketplace lead activity exists.";
    signals.push(`${leadCount} lead${leadCount === 1 ? "" : "s"}`);
  } else if ((input.photoCount ?? 0) === 0 || !input.hasDescription || !input.hasTerms) {
    status = input.unitStatus === UnitStatus.AVAILABLE ? RentalLifecycleStatus.COMING_SOON : RentalLifecycleStatus.DRAFT;
    confidence = 68;
    reason = "Listing setup is incomplete.";
    signals.push("Missing listing media, description, or terms");
  } else {
    status = RentalLifecycleStatus.ACTIVE;
    confidence = 78;
    reason = "Rental appears ready and available.";
    signals.push("Ready for public discovery");
  }

  if (notices.some((item) => item === FormalNoticeStatus.READY || item === FormalNoticeStatus.SENT)) {
    signals.push("Formal notice activity");
  }

  return {
    status,
    confidence,
    reason,
    unitStatus: lifecycleToUnitStatus(status),
    signals,
    nextActions: buildLifecycleNextActions(status)
  };
}

export function buildLifecycleNextActions(status: RentalLifecycleStatus): RentalLifecycleRecommendation["nextActions"] {
  switch (status) {
    case RentalLifecycleStatus.DRAFT:
    case RentalLifecycleStatus.COMING_SOON:
      return [
        { label: "Finish listing details", href: "edit", tone: "primary" },
        { label: "Upload photos", href: "photos", tone: "neutral" }
      ];
    case RentalLifecycleStatus.ACTIVE:
    case RentalLifecycleStatus.LEAD_ACTIVITY:
      return [
        { label: "Review leads", href: "leads", tone: "primary" },
        { label: "Open public listing", href: "public", tone: "neutral" }
      ];
    case RentalLifecycleStatus.APPLICATION_PENDING:
      return [
        { label: "Review applications", href: "applications", tone: "primary" },
        { label: "Request documents", href: "documents", tone: "neutral" }
      ];
    case RentalLifecycleStatus.LEASE_PENDING:
      return [
        { label: "Prepare lease", href: "leases", tone: "primary" },
        { label: "Message applicant", href: "inbox", tone: "neutral" }
      ];
    case RentalLifecycleStatus.MOVE_IN_SCHEDULED:
      return [
        { label: "Confirm move-in ledger", href: "ledger", tone: "primary" },
        { label: "Schedule inspection", href: "inspections", tone: "neutral" }
      ];
    case RentalLifecycleStatus.OCCUPIED:
    case RentalLifecycleStatus.RENEWAL_PENDING:
      return [
        { label: "Review ledger", href: "ledger", tone: "primary" },
        { label: "Plan renewal", href: "notices", tone: "neutral" }
      ];
    case RentalLifecycleStatus.NOTICE_GIVEN:
      return [
        { label: "Coordinate move-out", href: "calendar", tone: "warning" },
        { label: "Prepare turnover", href: "maintenance", tone: "neutral" }
      ];
    case RentalLifecycleStatus.TURNOVER:
    case RentalLifecycleStatus.MAINTENANCE_HOLD:
      return [
        { label: "Resolve maintenance", href: "maintenance", tone: "warning" },
        { label: "Relist when ready", href: "edit", tone: "neutral" }
      ];
    case RentalLifecycleStatus.ARCHIVED:
      return [{ label: "Review records", href: "documents", tone: "neutral" }];
  }
}

export function summarizeLifecycleRecommendations(recommendations: RentalLifecycleRecommendation[]) {
  const total = recommendations.length;
  const byStatus = rentalLifecycleEngineSteps.map((step) => ({
    ...step,
    count: recommendations.filter((item) => item.status === step.status).length
  }));
  const needsAttentionStatuses = new Set<RentalLifecycleStatus>([
    RentalLifecycleStatus.DRAFT,
    RentalLifecycleStatus.COMING_SOON,
    RentalLifecycleStatus.MAINTENANCE_HOLD,
    RentalLifecycleStatus.TURNOVER,
    RentalLifecycleStatus.NOTICE_GIVEN
  ]);
  const occupiedStatuses = new Set<RentalLifecycleStatus>([RentalLifecycleStatus.OCCUPIED, RentalLifecycleStatus.RENEWAL_PENDING, RentalLifecycleStatus.NOTICE_GIVEN]);
  const readyStatuses = new Set<RentalLifecycleStatus>([RentalLifecycleStatus.ACTIVE, RentalLifecycleStatus.LEAD_ACTIVITY]);

  const needsAttention = recommendations.filter((item) => needsAttentionStatuses.has(item.status)).length;
  const occupied = recommendations.filter((item) => occupiedStatuses.has(item.status)).length;
  const ready = recommendations.filter((item) => readyStatuses.has(item.status)).length;

  return {
    total,
    occupied,
    ready,
    needsAttention,
    byStatus
  };
}
