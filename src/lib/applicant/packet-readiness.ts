type PacketProfile = {
  legalName?: string | null;
  phone?: string | null;
  currentAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  householdSize?: number | null;
  rentalHistory?: string | null;
  desiredBedrooms?: number | null;
  desiredMoveInDate?: Date | null;
  maxRent?: number | null;
  emergencyContactName?: string | null;
  reasonForMoving?: string | null;
  consentToScreening?: boolean | null;
  informationCertified?: boolean | null;
  applicantSignature?: string | null;
  applicantPacketSignedAt?: Date | null;
  householdMembers?: unknown[];
  incomeSources?: unknown[];
} | null;

export type PacketReadinessItem = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  required: boolean;
  href: string;
};

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function buildReusablePacketReadiness(profile: PacketProfile, reusableDocumentCount = 0) {
  const householdCount = profile?.householdMembers?.length ?? 0;
  const incomeCount = profile?.incomeSources?.length ?? 0;
  const items: PacketReadinessItem[] = [
    {
      id: "identity",
      label: "Identity and contact",
      detail: hasText(profile?.legalName) && hasText(profile?.phone) ? "Name and phone are ready." : "Add legal name and phone number.",
      complete: hasText(profile?.legalName) && hasText(profile?.phone),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "address",
      label: "Current address",
      detail: hasText(profile?.currentAddress) && hasText(profile?.city) && hasText(profile?.state) && hasText(profile?.zip) ? "Current address is complete." : "Add street, city, state, and ZIP.",
      complete: hasText(profile?.currentAddress) && hasText(profile?.city) && hasText(profile?.state) && hasText(profile?.zip),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "household",
      label: "Household",
      detail: householdCount > 0 || Boolean(profile?.householdSize) ? "Household information is available." : "Add household size or members.",
      complete: householdCount > 0 || Boolean(profile?.householdSize),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "income",
      label: "Income",
      detail: incomeCount > 0 ? `${incomeCount} income source${incomeCount === 1 ? "" : "s"} saved.` : "Add income, benefit, or voucher details.",
      complete: incomeCount > 0,
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "rental-goals",
      label: "Rental goals",
      detail: profile?.desiredBedrooms || profile?.desiredMoveInDate || profile?.maxRent ? "Rental preferences are saved." : "Add move-in timing, bedrooms, or max rent.",
      complete: Boolean(profile?.desiredBedrooms || profile?.desiredMoveInDate || profile?.maxRent),
      required: false,
      href: "/applicant/profile"
    },
    {
      id: "rental-history",
      label: "Rental history",
      detail: hasText(profile?.rentalHistory) ? "Rental history is saved." : "Add recent housing or landlord history.",
      complete: hasText(profile?.rentalHistory),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "application-details",
      label: "Application details",
      detail: hasText(profile?.emergencyContactName) && hasText(profile?.reasonForMoving) ? "Emergency contact and moving reason are ready." : "Add emergency contact and reason for moving.",
      complete: hasText(profile?.emergencyContactName) && hasText(profile?.reasonForMoving),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "signature",
      label: "Reusable signature",
      detail: profile?.consentToScreening && profile?.informationCertified && hasText(profile?.applicantSignature) ? "Authorization and certification are signed." : "Sign reusable packet acknowledgements.",
      complete: Boolean(profile?.consentToScreening && profile?.informationCertified && hasText(profile?.applicantSignature)),
      required: true,
      href: "/applicant/profile"
    },
    {
      id: "documents",
      label: "Reusable documents",
      detail: reusableDocumentCount > 0 ? `${reusableDocumentCount} reusable document${reusableDocumentCount === 1 ? "" : "s"} available.` : "Upload supporting documents when requested.",
      complete: reusableDocumentCount > 0,
      required: false,
      href: "/applicant/documents"
    }
  ];
  const completedCount = items.filter((item) => item.complete).length;
  const requiredMissing = items.filter((item) => item.required && !item.complete);

  return {
    score: Math.round((completedCount / items.length) * 100),
    completedCount,
    totalCount: items.length,
    requiredMissing,
    optionalMissing: items.filter((item) => !item.required && !item.complete),
    items,
    signed: Boolean(profile?.applicantPacketSignedAt || (profile?.consentToScreening && profile?.informationCertified && hasText(profile?.applicantSignature)))
  };
}
