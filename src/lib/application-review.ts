import {
  ApplicationStatus,
  DocumentCategory,
  DocumentRequestStatus,
  DocumentVisibility,
  type ApplicantProfile,
  type ApplicationDetail,
  type DocumentRequest,
  type HouseholdMember,
  type IncomeSource,
  type LeasePacket,
  type Occupancy,
} from "@prisma/client";
import { buildApplicationReadiness, type ApplicationReadiness } from "@/lib/application-readiness";

type ProfileWithDetails =
  | (ApplicantProfile & {
      householdMembers: HouseholdMember[];
      incomeSources: IncomeSource[];
    })
  | null;

type ApplicationForReview = {
  id: string;
  status: ApplicationStatus;
  applicantUserId: string | null;
  applicantPhone: string | null;
  applicationDetail: ApplicationDetail | null;
  applicantUser?: { applicantProfile: ProfileWithDetails } | null;
  documentRequests: Pick<DocumentRequest, "id" | "title" | "category" | "status">[];
  leasePackets?: Pick<LeasePacket, "id" | "status">[];
  occupancies?: Pick<Occupancy, "id" | "status">[];
};

export type ApplicationReviewChecklistItem = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  severity: "required" | "review" | "optional";
};

export type ApplicationDocumentRecommendation = {
  key: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  instructions: string;
  reason: string;
  requiredForApproval: boolean;
  alreadyRequested: boolean;
};

export type ApplicationStaffReview = {
  readiness: ApplicationReadiness;
  checklist: ApplicationReviewChecklistItem[];
  recommendations: ApplicationDocumentRecommendation[];
  requiredIncompleteCount: number;
  reviewWarningCount: number;
  canApprove: boolean;
  approvalBlockedReasons: string[];
  nextBestAction: string;
};

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function requestExists(requests: Pick<DocumentRequest, "title" | "category" | "status">[], category: DocumentCategory, titleIncludes?: string) {
  return requests.some((request) => {
    const activeStatus = request.status !== DocumentRequestStatus.WAIVED;
    const categoryMatches = request.category === category;
    const titleMatches = titleIncludes ? request.title.toLowerCase().includes(titleIncludes.toLowerCase()) : true;
    return activeStatus && categoryMatches && titleMatches;
  });
}

export function buildApplicationDocumentRecommendations(application: ApplicationForReview): ApplicationDocumentRecommendation[] {
  const profile = application.applicantUser?.applicantProfile ?? null;
  const detail = application.applicationDetail;
  const incomeCount = profile?.incomeSources.length ?? 0;
  const hasVoucher = Boolean(profile?.voucherHolder || hasText(detail?.voucherProgram));
  const hasPets = hasText(profile?.pets) || hasText(detail?.petDetails) || hasText(detail?.serviceAnimalAccommodation);
  const needsUtilityContext = Boolean(detail?.hasOutstandingUtilities);

  const recommended: ApplicationDocumentRecommendation[] = [
    {
      key: "photo-id",
      title: "Government-issued photo ID",
      category: DocumentCategory.PHOTO_ID,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload a clear photo or scan of a current government-issued ID for the primary applicant.",
      reason: "Identity verification is required before final approval.",
      requiredForApproval: true,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.PHOTO_ID),
    },
    {
      key: "application-certification",
      title: "Signed rental application certification",
      category: DocumentCategory.APPLICATION_PACKET,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload any signed application packet, disclosure, or certification form requested by the landlord or housing provider.",
      reason: "The application should have a complete signed record before lease preparation.",
      requiredForApproval: true,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.APPLICATION_PACKET, "application"),
    },
  ];

  if (incomeCount > 0) {
    recommended.push({
      key: "proof-of-income",
      title: "Proof of income",
      category: DocumentCategory.PROOF_OF_INCOME,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload recent pay stubs, benefit letters, award letters, or other documentation for the income sources listed on the application.",
      reason: "Income sources are listed and should be verified before approval.",
      requiredForApproval: true,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.PROOF_OF_INCOME),
    });
  }

  if (hasVoucher) {
    recommended.push({
      key: "voucher-rfta",
      title: "Voucher or subsidy paperwork",
      category: DocumentCategory.RFTA,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload voucher, subsidy, caseworker, RFTA, or program paperwork that applies to this rental application.",
      reason: "The applicant reported voucher or subsidy involvement.",
      requiredForApproval: true,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.RFTA) || requestExists(application.documentRequests, DocumentCategory.UTILITY_ALLOWANCE),
    });
  }

  if (hasPets) {
    recommended.push({
      key: "pet-service-animal",
      title: "Pet or assistance animal documentation",
      category: DocumentCategory.TENANT_DOCUMENT,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload pet records, assistance animal accommodation documentation, or other animal-related paperwork if required by the property policy.",
      reason: "The application includes pet or assistance animal information.",
      requiredForApproval: false,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.TENANT_DOCUMENT, "animal") || requestExists(application.documentRequests, DocumentCategory.TENANT_DOCUMENT, "pet"),
    });
  }

  if (needsUtilityContext) {
    recommended.push({
      key: "utility-balance",
      title: "Utility balance resolution plan",
      category: DocumentCategory.OTHER,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload documentation or a written explanation showing the status of any outstanding utility balance and how it will be resolved before move-in.",
      reason: "The applicant reported an outstanding utility balance.",
      requiredForApproval: false,
      alreadyRequested: requestExists(application.documentRequests, DocumentCategory.OTHER, "utility"),
    });
  }

  return recommended;
}

export function buildStaffApplicationReview(application: ApplicationForReview): ApplicationStaffReview {
  const profile = application.applicantUser?.applicantProfile ?? null;
  const readiness = buildApplicationReadiness(profile, application.documentRequests, application.applicationDetail);
  const recommendations = buildApplicationDocumentRecommendations(application);
  const submittedRequests = application.documentRequests.filter((request) => request.status === DocumentRequestStatus.SUBMITTED).length;
  const rejectedRequests = application.documentRequests.filter((request) => request.status === DocumentRequestStatus.REJECTED).length;
  const openRequests = application.documentRequests.filter((request) => request.status === DocumentRequestStatus.REQUESTED || request.status === DocumentRequestStatus.REJECTED).length;
  const unrequestedRequiredDocs = recommendations.filter((item) => item.requiredForApproval && !item.alreadyRequested).length;
  const activeOccupancies = application.occupancies?.filter((occupancy) => occupancy.status !== "FORMER" && occupancy.status !== "CANCELLED").length ?? 0;

  const checklist: ApplicationReviewChecklistItem[] = [
    {
      id: "portal-account",
      label: "Applicant portal connected",
      description: application.applicantUserId ? "The application is connected to an applicant user account." : "Connect this application to the applicant portal before approval or tenant activation.",
      complete: Boolean(application.applicantUserId),
      severity: "required",
    },
    {
      id: "submitted",
      label: "Application submitted for review",
      description: new Set<ApplicationStatus>([ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED]).has(application.status) ? "The applicant has submitted the application or staff has moved it into review." : "Move the application into submitted or under review before making a final decision.",
      complete: new Set<ApplicationStatus>([ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED]).has(application.status),
      severity: "review",
    },
    {
      id: "readiness",
      label: "Applicant readiness complete",
      description: readiness.canSubmit ? "Required applicant readiness items are complete." : `${readiness.requiredMissingCount} required applicant readiness item(s) still need attention.`,
      complete: readiness.canSubmit,
      severity: "required",
    },
    {
      id: "structured-signature",
      label: "Screening consent signed",
      description: application.applicationDetail?.signedAt ? "The structured application details have been certified and signed." : "The applicant still needs to certify and sign the structured application details.",
      complete: Boolean(application.applicationDetail?.signedAt),
      severity: "required",
    },
    {
      id: "recommended-docs",
      label: "Recommended document requests created",
      description: unrequestedRequiredDocs === 0 ? "Required recommended document requests have already been created or waived." : `${unrequestedRequiredDocs} recommended required document request(s) have not been created yet.`,
      complete: unrequestedRequiredDocs === 0,
      severity: "review",
    },
    {
      id: "open-docs",
      label: "No open or rejected document requests",
      description: openRequests === 0 ? "No requested documents are currently missing or rejected." : `${openRequests} document request(s) are still open or rejected.`,
      complete: openRequests === 0,
      severity: "required",
    },
    {
      id: "submitted-docs",
      label: "Uploaded documents reviewed",
      description: submittedRequests === 0 ? "No uploaded document requests are waiting for review." : `${submittedRequests} uploaded document request(s) are waiting for staff review.`,
      complete: submittedRequests === 0,
      severity: "required",
    },
    {
      id: "lease-ready",
      label: "Lease is ready after approval",
      description: application.leasePackets && application.leasePackets.length > 0 ? "At least one lease packet exists for this application." : "No lease packet exists yet. This can be created after approval.",
      complete: Boolean(application.leasePackets && application.leasePackets.length > 0),
      severity: "optional",
    },
    {
      id: "occupancy-check",
      label: "Tenant activation status checked",
      description: activeOccupancies > 0 ? "This application already has an active or pending occupancy record." : "No active occupancy has been created yet.",
      complete: true,
      severity: "optional",
    },
  ];

  const requiredIncomplete = checklist.filter((item) => item.severity === "required" && !item.complete);
  const reviewWarnings = checklist.filter((item) => item.severity === "review" && !item.complete);
  const approvalBlockedReasons = requiredIncomplete.map((item) => item.description);
  const canApprove = requiredIncomplete.length === 0;

  const nextBestAction =
    requiredIncomplete[0]?.description ??
    reviewWarnings[0]?.description ??
    (application.status === ApplicationStatus.APPROVED ? "This application is approved. Continue with lease execution and move-in steps." : "This application is ready for a final staff decision.");

  return {
    readiness,
    checklist,
    recommendations,
    requiredIncompleteCount: requiredIncomplete.length,
    reviewWarningCount: reviewWarnings.length,
    canApprove,
    approvalBlockedReasons,
    nextBestAction,
  };
}

export function assertApplicationCanApprove(application: ApplicationForReview) {
  const review = buildStaffApplicationReview(application);
  if (!review.canApprove) {
    throw new Error(`Application is not ready for approval: ${review.approvalBlockedReasons.join(" ")}`);
  }
  return review;
}
