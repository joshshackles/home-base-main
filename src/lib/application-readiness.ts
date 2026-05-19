import {
  DocumentRequestStatus,
  type ApplicantProfile,
  type ApplicationDetail,
  type HouseholdMember,
  type IncomeSource,
} from "@prisma/client";

type ProfileWithDetails =
  | (ApplicantProfile & {
      householdMembers: HouseholdMember[];
      incomeSources: IncomeSource[];
    })
  | null;

type DocumentRequestLike = {
  status: DocumentRequestStatus | string;
};

export type ApplicationReadinessItem = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  actionHref?: string;
  actionLabel?: string;
  required: boolean;
};

export type ApplicationReadiness = {
  score: number;
  completedCount: number;
  totalCount: number;
  requiredMissingCount: number;
  requiredMissing: ApplicationReadinessItem[];
  optionalMissing: ApplicationReadinessItem[];
  items: ApplicationReadinessItem[];
  canSubmit: boolean;
};

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function unresolvedDocumentRequestCount(
  requests: DocumentRequestLike[],
) {
  const unresolvedStatuses = new Set<DocumentRequestStatus | string>([
    DocumentRequestStatus.REQUESTED,
    DocumentRequestStatus.REJECTED,
  ]);
  return requests.filter((request) => unresolvedStatuses.has(request.status))
    .length;
}

export function buildApplicationReadiness(
  profile: ProfileWithDetails,
  documentRequests: DocumentRequestLike[],
  applicationDetail?: ApplicationDetail | null,
): ApplicationReadiness {
  const unresolvedRequests = unresolvedDocumentRequestCount(documentRequests);
  const householdCount = profile?.householdMembers.length ?? 0;
  const incomeCount = profile?.incomeSources.length ?? 0;

  const items: ApplicationReadinessItem[] = [
    {
      id: "profile",
      label: "Applicant profile started",
      description: profile
        ? "Your application is connected to your applicant profile."
        : "Create your applicant profile so staff can identify and contact you.",
      complete: Boolean(profile),
      actionHref: "/applicant/profile",
      actionLabel: profile ? "Review profile" : "Start profile",
      required: true,
    },
    {
      id: "contact",
      label: "Contact information",
      description: hasText(profile?.phone)
        ? "Phone number is on file."
        : "Add a phone number so the housing team can reach you quickly.",
      complete: hasText(profile?.phone),
      actionHref: "/applicant/profile",
      actionLabel: "Update contact info",
      required: true,
    },
    {
      id: "address",
      label: "Current address",
      description:
        hasText(profile?.currentAddress) &&
        hasText(profile?.city) &&
        hasText(profile?.state) &&
        hasText(profile?.zip)
          ? "Current address is complete."
          : "Add your current street address, city, state, and ZIP code.",
      complete:
        hasText(profile?.currentAddress) &&
        hasText(profile?.city) &&
        hasText(profile?.state) &&
        hasText(profile?.zip),
      actionHref: "/applicant/profile",
      actionLabel: "Update address",
      required: true,
    },
    {
      id: "household",
      label: "Household members",
      description:
        householdCount > 0
          ? `${householdCount} household member(s) listed.`
          : "Add every person who will live in the unit, including yourself if appropriate.",
      complete: householdCount > 0,
      actionHref: "/applicant/profile",
      actionLabel: "Manage household",
      required: true,
    },
    {
      id: "income",
      label: "Income sources",
      description:
        incomeCount > 0
          ? `${incomeCount} income source(s) listed.`
          : "Add employment, benefits, voucher, or other income sources used to support the application.",
      complete: incomeCount > 0,
      actionHref: "/applicant/profile",
      actionLabel: "Add income",
      required: true,
    },
    {
      id: "rental-history",
      label: "Rental history",
      description: hasText(profile?.rentalHistory)
        ? "Rental history has been provided."
        : "Add recent rental history, housing background, or an explanation if you do not have rental history.",
      complete: hasText(profile?.rentalHistory),
      actionHref: "/applicant/profile",
      actionLabel: "Add rental history",
      required: true,
    },
    {
      id: "landlord-references",
      label: "Landlord references",
      description: hasText(profile?.landlordReferences)
        ? "Landlord references are listed."
        : "Add landlord reference names and contact information, or explain if none are available.",
      complete: hasText(profile?.landlordReferences),
      actionHref: "/applicant/profile",
      actionLabel: "Add references",
      required: true,
    },
    {
      id: "application-details",
      label: "Structured application details",
      description:
        applicationDetail &&
        hasText(applicationDetail.emergencyContactName) &&
        hasText(applicationDetail.reasonForMoving)
          ? "Emergency contact and moving details are on file."
          : "Complete the application details section with emergency contact and moving information.",
      complete: Boolean(
        applicationDetail &&
          hasText(applicationDetail.emergencyContactName) &&
          hasText(applicationDetail.reasonForMoving),
      ),
      actionHref: "/applicant/applications",
      actionLabel: "Open application",
      required: true,
    },
    {
      id: "screening-consent",
      label: "Screening acknowledgements",
      description:
        applicationDetail?.consentToScreening &&
        applicationDetail?.informationCertified &&
        hasText(applicationDetail?.applicantSignature)
          ? "Screening consent and certification are signed."
          : "Review the screening authorization, certify that the information is accurate, and type your signature.",
      complete: Boolean(
        applicationDetail?.consentToScreening &&
          applicationDetail?.informationCertified &&
          hasText(applicationDetail?.applicantSignature),
      ),
      actionHref: "/applicant/applications",
      actionLabel: "Sign application",
      required: true,
    },
    {
      id: "documents",
      label: "Requested documents",
      description:
        unresolvedRequests === 0
          ? "No requested documents are missing or rejected."
          : `${unresolvedRequests} requested document(s) still need attention.`,
      complete: unresolvedRequests === 0,
      required: true,
    },
    {
      id: "move-in",
      label: "Desired move-in date",
      description: profile?.desiredMoveInDate
        ? "Desired move-in timing is on file."
        : "Add a desired move-in date to help staff prioritize scheduling.",
      complete: Boolean(profile?.desiredMoveInDate),
      actionHref: "/applicant/profile",
      actionLabel: "Add move-in date",
      required: false,
    },
    {
      id: "renter-bio",
      label: "Applicant notes",
      description: hasText(profile?.renterBio)
        ? "Applicant notes are included."
        : "Optional, but helpful: add a short note about your housing goals, preferences, or circumstances.",
      complete: hasText(profile?.renterBio),
      actionHref: "/applicant/profile",
      actionLabel: "Add notes",
      required: false,
    },
  ];

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const requiredMissing = items.filter(
    (item) => item.required && !item.complete,
  );
  const optionalMissing = items.filter(
    (item) => !item.required && !item.complete,
  );

  return {
    score: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
    requiredMissingCount: requiredMissing.length,
    requiredMissing,
    optionalMissing,
    items,
    canSubmit: requiredMissing.length === 0,
  };
}
