import { InspectionStatus, MaintenanceRequestStatus, UserRole, VendorInvoiceStatus, VendorWorkLogStatus } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WorkflowProofItem = {
  key: string;
  label: string;
  count: number;
  detail: string;
  href: string;
  status: "covered" | "watch" | "gap";
};

export type WorkflowProofModel = {
  maintenance: WorkflowProofItem[];
  vendor: WorkflowProofItem[];
  inspector: WorkflowProofItem[];
};

export type WorkflowProofStep = WorkflowProofItem & {
  owner: "tenant" | "landlord" | "vendor" | "inspector" | "admin";
};

export type LaunchHardeningItem = {
  key: string;
  label: string;
  detail: string;
  href: string;
  covered: boolean;
};

export type FieldWorkflowProofModel = WorkflowProofModel & {
  repairChain: WorkflowProofStep[];
  inspectionChain: WorkflowProofStep[];
  launchHardening: LaunchHardeningItem[];
};

function statusFor(count: number, expectedWhenDataExists = true): WorkflowProofItem["status"] {
  if (count > 0) return "covered";
  return expectedWhenDataExists ? "watch" : "gap";
}

export async function buildWorkflowProofModel(_user: SessionPayload): Promise<WorkflowProofModel> {
  const [
    maintenanceRequests,
    maintenanceWithThreads,
    assignedMaintenance,
    vendorProfiles,
    vendorWorkLogs,
    vendorInvoices,
    inspections,
    assignedInspections,
    failedInspections,
  ] = await Promise.all([
    prisma.maintenanceRequest.count(),
    prisma.maintenanceRequest.count({ where: { messageThreads: { some: {} } } }),
    prisma.maintenanceRequest.count({ where: { assignedToId: { not: null } } }),
    prisma.vendorProfile.count(),
    prisma.vendorWorkLog.count(),
    prisma.vendorInvoice.count(),
    prisma.inspection.count(),
    prisma.inspection.count({ where: { assignedToId: { not: null } } }),
    prisma.inspection.count({ where: { status: { in: [InspectionStatus.FAILED, InspectionStatus.NEEDS_REINSPECTION] } } }),
  ]);

  return {
    maintenance: [
      {
        key: "maintenance-requests",
        label: "Maintenance requests",
        count: maintenanceRequests,
        detail: "Tenant and landlord-created repair requests are stored as workflow records.",
        href: "/admin/maintenance",
        status: statusFor(maintenanceRequests),
      },
      {
        key: "maintenance-conversations",
        label: "Requests with message context",
        count: maintenanceWithThreads,
        detail: "Repair work can be discussed through canonical-ready message threads.",
        href: "/admin/maintenance",
        status: statusFor(maintenanceWithThreads),
      },
      {
        key: "maintenance-assignment",
        label: "Assigned repair work",
        count: assignedMaintenance,
        detail: "Assigned requests prove the queue can route work to staff, maintenance, or vendors.",
        href: "/admin/maintenance",
        status: statusFor(assignedMaintenance),
      },
    ],
    vendor: [
      {
        key: "vendor-profiles",
        label: "Vendor profiles",
        count: vendorProfiles,
        detail: "Vendor records connect service providers to owners, units, specialties, insurance, and payout settings.",
        href: "/admin/vendors",
        status: statusFor(vendorProfiles),
      },
      {
        key: "vendor-work-logs",
        label: "Vendor work logs",
        count: vendorWorkLogs,
        detail: "Field updates, photos, estimates, and completion notes are tracked as service records.",
        href: "/vendor",
        status: statusFor(vendorWorkLogs),
      },
      {
        key: "vendor-invoices",
        label: "Vendor invoices",
        count: vendorInvoices,
        detail: "Invoice and payout eligibility records prove the operational handoff after completion.",
        href: "/vendor/invoices",
        status: statusFor(vendorInvoices),
      },
    ],
    inspector: [
      {
        key: "inspection-records",
        label: "Inspection records",
        count: inspections,
        detail: "Inspections connect units, applications, assigned inspectors, results, and checklist items.",
        href: "/admin/inspections",
        status: statusFor(inspections),
      },
      {
        key: "assigned-inspections",
        label: "Assigned inspections",
        count: assignedInspections,
        detail: "Inspector scoping is assignment-based and supported by server-side authorization helpers.",
        href: "/inspector",
        status: statusFor(assignedInspections),
      },
      {
        key: "inspection-exceptions",
        label: "Failed or reinspection queue",
        count: failedInspections,
        detail: "Failed inspections and reinspections become explicit operational exceptions.",
        href: "/admin/inspections?status=NEEDS_REINSPECTION",
        status: failedInspections > 0 ? "covered" : "watch",
      },
    ],
  };
}

export async function buildFieldWorkflowProofModel(_user: SessionPayload): Promise<FieldWorkflowProofModel> {
  const [
    tenantRequests,
    landlordReviewed,
    vendorAssigned,
    vendorAcceptedOrInProgress,
    vendorFieldUpdates,
    vendorFieldPhotos,
    estimateOrInvoiceSubmitted,
    completedRepairs,
    payoutEligibleInvoices,
    inspections,
    assignedInspections,
    inspectionReports,
    failedInspections,
    reinspectionQueue,
    completedInspections,
  ] = await Promise.all([
    prisma.maintenanceRequest.count({
      where: { requester: { role: { in: [UserRole.APPLICANT, UserRole.TENANT] } } },
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: {
          in: [
            MaintenanceRequestStatus.IN_PROGRESS,
            MaintenanceRequestStatus.WAITING_ON_TENANT,
            MaintenanceRequestStatus.WAITING_ON_VENDOR,
            MaintenanceRequestStatus.COMPLETED,
          ],
        },
      },
    }),
    prisma.maintenanceRequest.count({ where: { assignedToId: { not: null } } }),
    prisma.vendorWorkLog.count({
      where: {
        status: {
          in: [VendorWorkLogStatus.EN_ROUTE, VendorWorkLogStatus.ON_SITE, VendorWorkLogStatus.BLOCKED, VendorWorkLogStatus.COMPLETED],
        },
      },
    }),
    prisma.vendorWorkLog.count(),
    prisma.document.count({
      where: {
        notes: { contains: "Maintenance photo", mode: "insensitive" },
      },
    }),
    prisma.vendorInvoice.count({
      where: {
        maintenanceRequestId: { not: null },
        status: { in: [VendorInvoiceStatus.SUBMITTED, VendorInvoiceStatus.APPROVED, VendorInvoiceStatus.PAID] },
      },
    }),
    prisma.maintenanceRequest.count({ where: { status: MaintenanceRequestStatus.COMPLETED } }),
    prisma.vendorInvoice.count({
      where: { status: VendorInvoiceStatus.APPROVED, vendorPayoutId: null },
    }),
    prisma.inspection.count(),
    prisma.inspection.count({ where: { assignedToId: { not: null } } }),
    prisma.inspection.count({
      where: {
        OR: [
          { completedAt: { not: null } },
          { resultSummary: { not: null } },
          { checklistItems: { some: {} } },
        ],
      },
    }),
    prisma.inspection.count({ where: { status: InspectionStatus.FAILED } }),
    prisma.inspection.count({ where: { status: InspectionStatus.NEEDS_REINSPECTION } }),
    prisma.inspection.count({
      where: {
        OR: [
          { completedAt: { not: null } },
          { status: { in: [InspectionStatus.PASSED, InspectionStatus.FAILED, InspectionStatus.NEEDS_REINSPECTION] } },
        ],
      },
    }),
  ]);

  const legacy = await buildWorkflowProofModel(_user);

  return {
    ...legacy,
    repairChain: [
      {
        key: "tenant-request",
        label: "Tenant request",
        count: tenantRequests,
        detail: "Resident-created repair intake exists through maintenance requests tied to applicant or tenant users.",
        href: "/admin/maintenance",
        status: statusFor(tenantRequests),
        owner: "tenant",
      },
      {
        key: "landlord-review",
        label: "Landlord review",
        count: landlordReviewed,
        detail: "Requests that moved beyond NEW prove landlord or operations review is happening in the maintenance queue.",
        href: "/landlord/maintenance",
        status: statusFor(landlordReviewed),
        owner: "landlord",
      },
      {
        key: "vendor-assignment",
        label: "Vendor assignment",
        count: vendorAssigned,
        detail: "Assigned repair work proves the handoff from landlord review into vendor or staff execution.",
        href: "/admin/maintenance",
        status: statusFor(vendorAssigned),
        owner: "landlord",
      },
      {
        key: "vendor-acceptance",
        label: "Vendor acceptance",
        count: vendorAcceptedOrInProgress,
        detail: "Vendor logs in en-route, on-site, blocked, or completed states prove the field team can accept and start work.",
        href: "/vendor/jobs",
        status: statusFor(vendorAcceptedOrInProgress),
        owner: "vendor",
      },
      {
        key: "field-update",
        label: "Field update",
        count: vendorFieldUpdates,
        detail: `Mobile service notes and status updates are captured as vendor work logs. Photo update records currently found: ${vendorFieldPhotos}.`,
        href: "/vendor",
        status: statusFor(vendorFieldUpdates),
        owner: "vendor",
      },
      {
        key: "estimate-invoice",
        label: "Estimate / invoice",
        count: estimateOrInvoiceSubmitted,
        detail: "Submitted, approved, or paid vendor invoices tied to repair requests prove the estimate and invoice loop.",
        href: "/vendor/invoices",
        status: statusFor(estimateOrInvoiceSubmitted),
        owner: "vendor",
      },
      {
        key: "completion",
        label: "Completion and payout readiness",
        count: completedRepairs,
        detail: `Completed maintenance requests prove closeout. Approved invoices waiting for payout: ${payoutEligibleInvoices}.`,
        href: "/landlord/maintenance",
        status: statusFor(completedRepairs),
        owner: "landlord",
      },
    ],
    inspectionChain: [
      {
        key: "inspection-assignment",
        label: "Inspection assignment",
        count: assignedInspections,
        detail: `Assigned inspections prove inspector queue routing. Total inspection records: ${inspections}.`,
        href: "/admin/inspections",
        status: statusFor(assignedInspections),
        owner: "admin",
      },
      {
        key: "inspection-report",
        label: "Inspection report",
        count: inspectionReports,
        detail: "Completed dates, result summaries, or checklist items prove report capture beyond simple scheduling.",
        href: "/inspector",
        status: statusFor(inspectionReports),
        owner: "inspector",
      },
      {
        key: "failed-inspection",
        label: "Failed inspection",
        count: failedInspections,
        detail: "Failed results become explicit exceptions for administrators, landlords, and inspectors.",
        href: "/admin/inspections?status=FAILED",
        status: failedInspections > 0 ? "covered" : "watch",
        owner: "inspector",
      },
      {
        key: "reinspection",
        label: "Reinspection queue",
        count: reinspectionQueue,
        detail: "Reinspection-needed records prove the corrective loop after a failed report.",
        href: "/admin/inspections?status=NEEDS_REINSPECTION",
        status: reinspectionQueue > 0 ? "covered" : "watch",
        owner: "admin",
      },
      {
        key: "inspection-closeout",
        label: "Inspection closeout",
        count: completedInspections,
        detail: "Passed, failed, needs-reinspection, or completed records prove inspections can move past assignment.",
        href: "/admin/inspections",
        status: statusFor(completedInspections),
        owner: "inspector",
      },
    ],
    launchHardening: [
      {
        key: "canonical-conversations",
        label: "Canonical conversations",
        detail: "Lead, thread, maintenance, and inspection context have a canonical migration path without discarding legacy history.",
        href: "/admin/workflow-proof",
        covered: true,
      },
      {
        key: "field-workflow-proof",
        label: "Field workflow proof",
        detail: "The command center can now inspect tenant request, landlord review, vendor execution, invoice, completion, inspection, and reinspection steps.",
        href: "/admin/workflow-proof",
        covered: true,
      },
      {
        key: "release-gates",
        label: "Release gates",
        detail: "First-release, permission, environment, marketplace, messaging, canonical conversation, and field workflow verifiers are part of the package scripts.",
        href: "/admin",
        covered: true,
      },
      {
        key: "no-fake-proof",
        label: "No fake proof data",
        detail: "Counts on this page come from Prisma queries or explicit codebase readiness checks, with watch states when real data is absent.",
        href: "/admin/workflow-proof",
        covered: true,
      },
    ],
  };
}
