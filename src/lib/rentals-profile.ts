import { RentalLifecycleStatus, UnitStatus } from "@prisma/client";

export type RentalHealthInput = {
  status: UnitStatus;
  lifecycleStatus?: RentalLifecycleStatus | null;
  photosCount: number;
  rentAmount: number;
  deposit?: number | null;
  description?: string | null;
  marketingHeadline?: string | null;
  marketingHighlights?: string | null;
  petPolicy?: string | null;
  utilitiesNote?: string | null;
  leaseTermsNote?: string | null;
  tenantUserId?: string | null;
  currentApplicationId?: string | null;
  openMaintenanceCount?: number;
  balance?: number;
};

export const rentalLifecycleSteps: Array<{ status: RentalLifecycleStatus; label: string; description: string }> = [
  { status: RentalLifecycleStatus.DRAFT, label: "Draft", description: "Internal setup before marketing." },
  { status: RentalLifecycleStatus.COMING_SOON, label: "Coming soon", description: "Pre-market, collecting media and terms." },
  { status: RentalLifecycleStatus.ACTIVE, label: "Active", description: "Publicly available and accepting leads." },
  { status: RentalLifecycleStatus.LEAD_ACTIVITY, label: "Lead activity", description: "Prospects are asking questions or touring." },
  { status: RentalLifecycleStatus.APPLICATION_PENDING, label: "Application pending", description: "Applicant review is underway." },
  { status: RentalLifecycleStatus.LEASE_PENDING, label: "Lease pending", description: "Approved applicant is awaiting lease execution." },
  { status: RentalLifecycleStatus.MOVE_IN_SCHEDULED, label: "Move-in scheduled", description: "Move-in plan and billing should be finalized." },
  { status: RentalLifecycleStatus.OCCUPIED, label: "Occupied", description: "Tenant is attached and workflow is active." },
  { status: RentalLifecycleStatus.RENEWAL_PENDING, label: "Renewal pending", description: "Lease renewal or notice decision is needed." },
  { status: RentalLifecycleStatus.NOTICE_GIVEN, label: "Notice given", description: "Tenant has given notice or move-out is planned." },
  { status: RentalLifecycleStatus.TURNOVER, label: "Turnover", description: "Prepare, repair, clean, and relist." },
  { status: RentalLifecycleStatus.MAINTENANCE_HOLD, label: "Maintenance hold", description: "Temporarily unavailable due to repair or inspection." },
  { status: RentalLifecycleStatus.ARCHIVED, label: "Archived", description: "Removed from active operations." },
];

export function rentalLifecycleLabel(status?: RentalLifecycleStatus | null) {
  return rentalLifecycleSteps.find((step) => step.status === status)?.label ?? "Active";
}

export function estimateRentalHealth(input: RentalHealthInput) {
  const checks = [
    input.photosCount >= 5,
    Boolean(input.marketingHeadline || input.description),
    Boolean(input.marketingHighlights),
    input.rentAmount > 0,
    Boolean(input.deposit !== null && typeof input.deposit !== "undefined"),
    Boolean(input.petPolicy),
    Boolean(input.utilitiesNote),
    Boolean(input.leaseTermsNote),
    input.status !== UnitStatus.ARCHIVED,
    (input.openMaintenanceCount ?? 0) === 0,
    (input.balance ?? 0) <= 0,
    Boolean(input.tenantUserId || input.currentApplicationId || input.status === UnitStatus.AVAILABLE),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const riskFlags: string[] = [];
  if (input.photosCount < 5) riskFlags.push("Add more photos");
  if (!input.marketingHeadline && !input.description) riskFlags.push("Add a stronger description");
  if (!input.leaseTermsNote) riskFlags.push("Clarify lease terms");
  if ((input.openMaintenanceCount ?? 0) > 0) riskFlags.push("Resolve open maintenance");
  if ((input.balance ?? 0) > 0) riskFlags.push("Review outstanding balance");
  return {
    score,
    label: score >= 85 ? "Healthy" : score >= 65 ? "Needs polish" : "Needs attention",
    riskFlags,
  };
}

export function deriveRentalLifecycle(input: { lifecycleStatus?: RentalLifecycleStatus | null; status: UnitStatus; tenantUserId?: string | null; currentApplicationId?: string | null; openMaintenanceCount?: number }) {
  if (input.lifecycleStatus) return input.lifecycleStatus;
  if (input.status === UnitStatus.OCCUPIED || input.tenantUserId) return RentalLifecycleStatus.OCCUPIED;
  if (input.status === UnitStatus.PENDING || input.currentApplicationId) return RentalLifecycleStatus.APPLICATION_PENDING;
  if (input.status === UnitStatus.UNAVAILABLE || (input.openMaintenanceCount ?? 0) > 0) return RentalLifecycleStatus.MAINTENANCE_HOLD;
  if (input.status === UnitStatus.ARCHIVED) return RentalLifecycleStatus.ARCHIVED;
  return RentalLifecycleStatus.ACTIVE;
}

export function buildRentalTimeline(events: Array<{ type: string; label: string; at: Date; detail?: string | null; href?: string }>) {
  return events
    .filter((event) => event.at)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 14);
}
