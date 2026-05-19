import { AccountAccessType, ApplicationStatus, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility, HouseholdRelationship, InspectionChecklistStatus, InspectionStatus, IncomeFrequency, LedgerEntryType, PaymentMethod, PaymentPlanInstallmentStatus, PaymentPlanStatus, RecurringChargeFrequency, LeadStatus, LeasePacketStatus, PayrollFrequency, SignatureNotificationType, SignatureStatus, TenantPaymentMethod, TenantPaymentStatus, RentalMarketingStatus, RentalPropertyType, UnitStatus, UserRole, UtilityAccountStatus } from "@prisma/client";
import { z } from "zod";
import { MIN_PASSWORD_LENGTH, validatePasswordStrength } from "@/lib/password";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const requiredText = (label: string, max = 160) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

const optionalInteger = z.preprocess(
  (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
  z.coerce.number().int().min(0).nullable()
);

const optionalId = z.preprocess(
  (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
  z.string().trim().min(1).nullable()
).optional();

export const propertySchema = z.object({
  name: requiredText("Property name"),
  addressLine: requiredText("Address"),
  city: requiredText("City", 80),
  state: z.string().trim().length(2, "State must use the two-letter abbreviation.").transform((value) => value.toUpperCase()),
  zip: z.string().trim().min(5, "ZIP is required.").max(10, "ZIP must be 10 characters or fewer."),
  description: optionalText,
  ownerId: z.preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.string().trim().min(1).nullable()
  ),
  isArchived: z.coerce.boolean().default(false)
});

export const unitSchema = z.object({
  propertyId: requiredText("Property ID"),
  unitNumber: requiredText("Rental number/name", 40),
  rentalType: z.nativeEnum(RentalPropertyType).default(RentalPropertyType.APARTMENT),
  marketingStatus: z.nativeEnum(RentalMarketingStatus).default(RentalMarketingStatus.ACTIVE),
  marketingHeadline: optionalText,
  marketingHighlights: optionalText,
  virtualTourUrl: optionalText,
  videoTourUrl: optionalText,
  walkScore: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).max(100).nullable()),
  transitScore: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(0).max(100).nullable()),
  tenantUserId: optionalId,
  currentApplicationId: optionalId,
  bedrooms: z.coerce.number().int().min(0, "Bedrooms cannot be negative.").max(20, "Bedrooms looks too high."),
  bathrooms: z.coerce.number().min(0, "Bathrooms cannot be negative.").max(20, "Bathrooms looks too high."),
  rentAmount: z.coerce.number().int().min(0, "Rent cannot be negative.").max(100000, "Rent looks too high."),
  deposit: optionalInteger,
  squareFeet: optionalInteger,
  voucherFriendly: z.coerce.boolean().default(false),
  utilitiesNote: optionalText,
  accessibility: optionalText,
  petPolicy: optionalText,
  schoolDistrict: optionalText,
  neighborhood: optionalText,
  nearbyFeatures: optionalText,
  yearBuilt: z.preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).nullable()
  ),
  roofAgeYears: z.preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.coerce.number().int().min(0).max(150).nullable()
  ),
  averageUtilityBill: optionalInteger,
  parkingInfo: optionalText,
  laundryInfo: optionalText,
  appliancesIncluded: optionalText,
  flooringInfo: optionalText,
  yardInfo: optionalText,
  smokingPolicy: optionalText,
  leaseTermsNote: optionalText,
  moveInFeesNote: optionalText,
  rentDueDay: z.preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.coerce.number().int().min(1).max(31).nullable()
  ),
  lateFeePolicy: optionalText,
  previousTenantNotes: optionalText,
  status: z.nativeEnum(UnitStatus),
  description: optionalText,
  clientNotes: optionalText,
  importantContacts: optionalText
});

export const leadSchema = z.object({
  unitId: requiredText("Unit ID"),
  name: requiredText("Name", 120),
  email: z.string().trim().email("A valid email address is required.").max(180),
  phone: optionalText,
  message: optionalText
});

export const loginSchema = z.object({
  email: z.string().trim().email("A valid email address is required.").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required."),
  next: z.string().trim().default("/applicant")
});


export const applicantSignupSchema = z.object({
  name: requiredText("Name", 120),
  email: z.string().trim().email("A valid email address is required.").max(180).transform((value) => value.toLowerCase()),
  phone: optionalText,
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
  confirmPassword: z.string().min(1, "Confirm your password."),
  next: z.string().trim().default("/applicant")
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }

  const result = validatePasswordStrength(value.password, { email: value.email, name: value.name });
  for (const message of result.errors) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
  }
});

export const accountAccessRequestSchema = z.object({
  type: z.nativeEnum(AccountAccessType),
  organization: optionalText,
  reason: z.string().trim().min(10, "Tell us a little more about why you need this access.").max(1200, "Reason must be 1200 characters or fewer.")
});

export const accountAccessReviewSchema = z.object({
  id: requiredText("Access request ID"),
  status: z.enum(["APPROVED", "DECLINED"]),
  reviewNote: optionalText
});

export const applicationClaimSchema = z.object({
  token: requiredText("Claim token", 300),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`).optional(),
  confirmPassword: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.password || value.confirmPassword) {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
    }
    if (value.password) {
      const result = validatePasswordStrength(value.password);
      for (const message of result.errors) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
      }
    }
  }
});

export const generateApplicationClaimLinkSchema = z.object({
  applicationId: requiredText("Application ID"),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7)
});

export const leadStatusSchema = z.object({
  id: requiredText("Lead ID"),
  status: z.nativeEnum(LeadStatus)
});

export const leadNoteSchema = z.object({
  leadId: requiredText("Lead ID"),
  note: requiredText("Note", 2000)
});

export const convertLeadSchema = z.object({
  leadId: requiredText("Lead ID"),
  summary: optionalText
});

export const applicationStatusSchema = z.object({
  id: requiredText("Application ID"),
  status: z.nativeEnum(ApplicationStatus)
});

export const applicationNoteSchema = z.object({
  applicationId: requiredText("Application ID"),
  note: requiredText("Note", 2000)
});

export const createUserSchema = z.object({
  name: requiredText("Name", 120),
  email: z.string().trim().email("A valid email address is required.").max(180).transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
  isActive: z.coerce.boolean().default(true)
}).superRefine((value, ctx) => {
  const result = validatePasswordStrength(value.password, { email: value.email, name: value.name });
  for (const message of result.errors) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
  }
});

export const updateUserSchema = z.object({
  id: requiredText("User ID"),
  name: requiredText("Name", 120),
  email: z.string().trim().email("A valid email address is required.").max(180).transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole),
  password: z.string().trim().optional().transform((value) => (value && value.length > 0 ? value : null)),
  isActive: z.coerce.boolean().default(false)
}).superRefine((value, ctx) => {
  if (value.password) {
    const result = validatePasswordStrength(value.password, { email: value.email, name: value.name });
    for (const message of result.errors) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
    }
  }
});


export const applicantProfileSchema = z.object({
  legalName: requiredText("Legal name", 160),
  preferredName: optionalText,
  phone: optionalText,
  currentAddress: optionalText,
  city: optionalText,
  state: z.string().trim().max(2, "State must use the two-letter abbreviation.").transform((value) => value ? value.toUpperCase() : null).nullable().optional(),
  zip: optionalText,
  householdSize: optionalInteger,
  rentalHistory: optionalText,
  desiredBedrooms: optionalInteger,
  desiredBathrooms: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().min(0).max(20).nullable()),
  maxRent: optionalInteger,
  desiredMoveInDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  voucherHolder: z.coerce.boolean().default(false),
  pets: optionalText,
  accessibilityNeeds: optionalText,
  landlordReferences: optionalText,
  employmentSummary: optionalText,
  renterBio: optionalText
});

export const favoriteRentalSchema = z.object({
  unitId: requiredText("Unit ID"),
  notes: optionalText
});

export const householdMemberSchema = z.object({
  name: requiredText("Household member name", 160),
  relationship: z.nativeEnum(HouseholdRelationship),
  age: optionalInteger
});

export const deleteHouseholdMemberSchema = z.object({
  id: requiredText("Household member ID")
});

export const incomeSourceSchema = z.object({
  sourceName: requiredText("Income source", 160),
  amount: z.coerce.number().int().min(0, "Income amount cannot be negative.").max(10000000, "Income amount looks too high."),
  frequency: z.nativeEnum(IncomeFrequency)
});

export const deleteIncomeSourceSchema = z.object({
  id: requiredText("Income source ID")
});

export const applicantApplicationSubmitSchema = z.object({
  applicationId: requiredText("Application ID")
});

export const utilityAccountSchema = z.object({
  id: optionalId,
  unitId: optionalId,
  applicationId: optionalId,
  providerName: requiredText("Provider", 160),
  serviceType: requiredText("Service type", 80),
  accountNumber: optionalText,
  status: z.nativeEnum(UtilityAccountStatus).default(UtilityAccountStatus.SETUP_NEEDED),
  dueDayOfMonth: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.number().int().min(1).max(31).nullable()),
  averageAmount: optionalInteger,
  autopayEnabled: z.coerce.boolean().default(false),
  notes: optionalText
});

export const payrollReminderSchema = z.object({
  id: optionalId,
  employerName: requiredText("Employer", 160),
  frequency: z.nativeEnum(PayrollFrequency).default(PayrollFrequency.BIWEEKLY),
  nextPayDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  typicalAmount: optionalInteger,
  notes: optionalText
});

export const tenantPaymentSchema = z.object({
  id: optionalId,
  unitId: requiredText("Unit"),
  applicationId: optionalId,
  ledgerEntryId: optionalId,
  amount: z.coerce.number().int().min(1, "Payment amount must be at least $1.").max(1000000, "Payment amount looks too high."),
  method: z.nativeEnum(TenantPaymentMethod).default(TenantPaymentMethod.ACH),
  status: z.nativeEnum(TenantPaymentStatus).default(TenantPaymentStatus.PLANNED),
  dueDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  submittedAt: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  confirmation: optionalText,
  notes: optionalText
});

export const recordIdSchema = z.object({
  id: requiredText("Record ID")
});

export const adminApplicationLinkSchema = z.object({
  applicationId: requiredText("Application ID"),
  applicantEmail: z.string().trim().email("A valid applicant email address is required.").max(180).transform((value) => value.toLowerCase())
});




export const leaseTemplateSchema = z.object({
  name: requiredText("Template name", 160),
  description: optionalText,
  body: requiredText("Template body", 20000),
  isActive: z.coerce.boolean().default(false)
});

export const createLeasePacketSchema = z.object({
  applicationId: requiredText("Application ID"),
  templateId: requiredText("Lease template"),
  leaseStartDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  leaseEndDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  monthlyRent: z.coerce.number().int().min(0, "Monthly rent cannot be negative."),
  securityDeposit: optionalInteger,
  terms: optionalText,
  notes: optionalText
});

export const updateLeasePacketSchema = z.object({
  leasePacketId: requiredText("Lease packet ID"),
  leaseStartDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  leaseEndDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  monthlyRent: z.coerce.number().int().min(0, "Monthly rent cannot be negative."),
  securityDeposit: optionalInteger,
  terms: optionalText,
  notes: optionalText
});

export const leasePacketStatusSchema = z.object({
  leasePacketId: requiredText("Lease packet ID"),
  status: z.nativeEnum(LeasePacketStatus)
});

export const leaseNoteSchema = z.object({
  leasePacketId: requiredText("Lease packet ID"),
  note: requiredText("Lease note", 2000)
});

export const leaseSignaturePrepareSchema = z.object({
  leasePacketId: requiredText("Lease packet ID"),
  expiresInDays: z.coerce.number().int().min(1, "Expiration must be at least 1 day.").max(60, "Expiration cannot be more than 60 days.").default(7)
});

export const leaseSignatureSchema = z.object({
  requestId: requiredText("Signature request ID"),
  signatureText: requiredText("Typed signature", 160),
  electronicConsentAccepted: z.coerce.boolean().refine((value) => value === true, "You must consent to electronic signatures before signing.")
});

export const leaseSignatureStatusSchema = z.object({
  requestId: requiredText("Signature request ID"),
  status: z.nativeEnum(SignatureStatus)
});

export const signatureReminderSchema = z.object({
  requestId: requiredText("Signature request ID"),
  type: z.nativeEnum(SignatureNotificationType).default(SignatureNotificationType.REMINDER)
});

export const signatureExpirationSchema = z.object({
  requestId: requiredText("Signature request ID"),
  extendDays: z.coerce.number().int().min(1, "Extension must be at least 1 day.").max(60, "Extension cannot be more than 60 days.").default(7)
});

export const leaseReissueSchema = z.object({
  leasePacketId: requiredText("Lease packet ID"),
  reason: requiredText("Reissue reason", 1000)
});

export const documentRequestSchema = z.object({
  applicationId: requiredText("Application ID"),
  title: requiredText("Document request title", 160),
  category: z.nativeEnum(DocumentCategory),
  visibility: z.nativeEnum(DocumentVisibility).default(DocumentVisibility.APPLICANT),
  instructions: optionalText,
  dueDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable())
});

export const documentRequestStatusSchema = z.object({
  requestId: requiredText("Document request ID"),
  status: z.nativeEnum(DocumentRequestStatus),
  reviewNotes: optionalText
});

export const documentUploadSchema = z.object({
  title: requiredText("Document title", 160),
  category: z.nativeEnum(DocumentCategory),
  visibility: z.nativeEnum(DocumentVisibility),
  applicationId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  propertyId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  unitId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  leasePacketId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  notes: optionalText
});

export const applicantDocumentUploadSchema = z.object({
  title: requiredText("Document title", 160),
  category: z.nativeEnum(DocumentCategory),
  applicationId: requiredText("Application ID"),
  requestId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  notes: optionalText
});

export const documentStatusSchema = z.object({
  documentId: requiredText("Document ID"),
  status: z.nativeEnum(DocumentStatus),
  notes: optionalText
});

export const deleteDocumentSchema = z.object({
  documentId: requiredText("Document ID")
});

export function formDataToObject(formData: FormData) {
  const data: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  data.isArchived = formData.get("isArchived") === "on";
  data.voucherFriendly = formData.get("voucherFriendly") === "on";
  data.isActive = formData.get("isActive") === "on";
  data.voucherHolder = formData.get("voucherHolder") === "on";
  data.autopayEnabled = formData.get("autopayEnabled") === "on";

  return data;
}

export function validationMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong. Please check the form and try again.";
}

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
  confirmPassword: z.string().min(1, "Please confirm the new password.")
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "New passwords do not match." });
  }
  const result = validatePasswordStrength(value.newPassword);
  for (const message of result.errors) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newPassword"], message });
  }
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("A valid email address is required.").max(180).transform((value) => value.toLowerCase())
});

export const passwordResetSchema = z.object({
  token: requiredText("Reset token", 300),
  password: z.string().min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
  confirmPassword: z.string().min(1, "Please confirm the new password.")
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "New passwords do not match." });
  }
  const result = validatePasswordStrength(value.password);
  for (const message of result.errors) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
  }
});

export const adminPasswordResetLinkSchema = z.object({
  userId: requiredText("User ID")
});


export const inspectionSchema = z.object({
  unitId: requiredText("Unit ID"),
  applicationId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  assignedToId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  scheduledFor: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  inspectorName: optionalText,
  notes: optionalText
});

export const inspectionStatusSchema = z.object({
  inspectionId: requiredText("Inspection ID"),
  status: z.nativeEnum(InspectionStatus),
  resultSummary: optionalText,
  notes: optionalText
});

export const inspectionChecklistItemSchema = z.object({
  inspectionId: requiredText("Inspection ID"),
  label: requiredText("Checklist item", 180),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0)
});

export const inspectionChecklistStatusSchema = z.object({
  itemId: requiredText("Checklist item ID"),
  status: z.nativeEnum(InspectionChecklistStatus),
  notes: optionalText
});



export const recurringChargeScheduleSchema = z.object({
  applicationId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  unitId: requiredText("Unit ID"),
  tenantUserId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  name: requiredText("Schedule name", 160),
  description: requiredText("Ledger description", 180),
  frequency: z.nativeEnum(RecurringChargeFrequency).default(RecurringChargeFrequency.MONTHLY),
  amount: z.coerce.number().int().min(1, "Amount must be at least $1.").max(1000000, "Amount looks too high."),
  tenantPortionAmount: optionalInteger,
  subsidyPortionAmount: optionalInteger,
  dayOfMonth: z.coerce.number().int().min(1, "Day of month must be 1-28.").max(28, "Use days 1-28 so every month can run safely."),
  startDate: z.coerce.date(),
  endDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable())
}).superRefine((value, ctx) => {
  const tenant = value.tenantPortionAmount ?? 0;
  const subsidy = value.subsidyPortionAmount ?? 0;
  if ((tenant > 0 || subsidy > 0) && tenant + subsidy !== value.amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tenantPortionAmount"], message: "Tenant and subsidy portions must add up to the full schedule amount." });
  }
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after the start date." });
  }
});

export const generateRecurringChargesSchema = z.object({
  runThroughDate: z.coerce.date()
});

export const recurringChargeScheduleIdSchema = z.object({
  scheduleId: requiredText("Schedule ID")
});


export const paymentPlanSchema = z.object({
  applicationId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  unitId: requiredText("Unit ID"),
  tenantUserId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  name: requiredText("Plan name", 160),
  totalAmount: z.coerce.number().int().min(1, "Total amount must be at least $1.").max(1000000, "Total amount looks too high."),
  installmentAmount: z.coerce.number().int().min(1, "Installment amount must be at least $1.").max(1000000, "Installment amount looks too high."),
  dueDayOfMonth: z.coerce.number().int().min(1, "Day of month must be 1-28.").max(28, "Use days 1-28 so every month can run safely."),
  startDate: z.coerce.date(),
  notes: optionalText
}).superRefine((value, ctx) => {
  if (value.installmentAmount > value.totalAmount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["installmentAmount"], message: "Installment amount cannot be greater than the total plan amount." });
  }
});

export const paymentPlanStatusSchema = z.object({
  paymentPlanId: requiredText("Payment plan ID"),
  status: z.nativeEnum(PaymentPlanStatus),
  note: optionalText
});

export const paymentPlanInstallmentStatusSchema = z.object({
  installmentId: requiredText("Installment ID"),
  status: z.nativeEnum(PaymentPlanInstallmentStatus),
  paidAt: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  notes: optionalText
});

export const ledgerEntrySchema = z.object({
  applicationId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  unitId: requiredText("Unit ID"),
  tenantUserId: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.string().trim().min(1).nullable()),
  type: z.nativeEnum(LedgerEntryType),
  amount: z.coerce.number().int().min(1, "Amount must be at least $1.").max(1000000, "Amount looks too high."),
  description: requiredText("Description", 180),
  memo: optionalText,
  dueDate: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  paidAt: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.coerce.date().nullable()),
  paymentMethod: z.preprocess((value) => (value === "" || value === null || typeof value === "undefined" ? null : value), z.nativeEnum(PaymentMethod).nullable())
});

export const ledgerVoidSchema = z.object({
  ledgerEntryId: requiredText("Ledger entry ID"),
  voidReason: requiredText("Void reason", 1000)
});
