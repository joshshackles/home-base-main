"use server";

import {
  ApplicationStatus,
  AuditAction,
  DocumentCategory,
  DocumentRequestStatus,
  DocumentStatus,
  DocumentVisibility,
  LeasePacketStatus,
  MessageThreadStatus,
  MessageThreadType,
  SignatureRole,
  SignatureStatus,
  TenantPaymentStatus,
  UnitStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  applicantApplicationSubmitSchema,
  applicantDocumentUploadSchema,
  applicationDetailSchema,
  applicantProfileSchema,
  deleteHouseholdMemberSchema,
  deleteIncomeSourceSchema,
  favoriteRentalSchema,
  formDataToObject,
  householdMemberSchema,
  incomeSourceSchema,
  leaseSignatureSchema,
  payrollReminderSchema,
  recordIdSchema,
  tenantPaymentSchema,
  utilityAccountSchema,
  validationMessage,
} from "@/lib/validation";
import { saveUploadedDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import {
  baseSignatureRequestWhere,
  completeSignatureRequest,
} from "@/lib/signature-workflow";
import { buildApplicationReadiness } from "@/lib/application-readiness";

async function requireApplicantAction() {
  return await requireRole(["APPLICANT", "TENANT"], "/applicant");
}

const withdrawableApplicationStatuses: ApplicationStatus[] = [
  ApplicationStatus.STARTED,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
];

const applicantInquirySchema = z.object({
  unitId: z.string().trim().min(1),
  phone: z.string().trim().max(80).optional(),
  message: z.string().trim().min(2).max(2000),
  returnTo: z.string().trim().max(240).optional(),
});

const marketplaceApplicationSchema = z.object({
  unitId: z.string().trim().min(1),
  shareAuthorization: z.coerce.boolean().refine(Boolean, "Authorize sharing your renter packet to apply."),
  message: z.string().trim().max(1200).optional(),
});

async function ensureProfile(userId: string, fallbackName: string | null) {
  return prisma.applicantProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, legalName: fallbackName || "Applicant" },
  });
}

async function assertOwnsApplication(
  applicationId: string,
  userId: string,
  email: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      OR: [{ applicantUserId: userId }, { applicantEmail: email }],
    },
    select: { id: true },
  });

  if (!application)
    throw new Error("This application is not assigned to your account.");
  return application;
}

function revalidateApplicant() {
  revalidatePath("/applicant");
  revalidatePath("/applicant/applications");
  revalidatePath("/applicant/profile");
  revalidatePath("/applicant/favorites");
  revalidatePath("/applicant/home-tools");
  revalidatePath("/marketplace");
}

async function getApplicantApplicationAccess(
  userId: string,
  email: string,
  applicationId: string | null | undefined,
) {
  if (!applicationId) return null;
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      OR: [{ applicantUserId: userId }, { applicantEmail: email }],
    },
    select: { id: true, unitId: true },
  });
  if (!application)
    throw new Error("This application is not assigned to your account.");
  return application;
}

async function getApplicantUnitAccess(
  userId: string,
  email: string,
  unitId: string,
  applicationId?: string | null,
) {
  const application = await getApplicantApplicationAccess(
    userId,
    email,
    applicationId,
  );
  if (application) {
    if (application.unitId !== unitId)
      throw new Error("Selected application does not match the selected unit.");
    return { id: unitId };
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      OR: [
        { status: UnitStatus.AVAILABLE, property: { isArchived: false } },
        {
          applications: {
            some: {
              OR: [{ applicantUserId: userId }, { applicantEmail: email }],
            },
          },
        },
        { tenantUserId: userId },
      ],
    },
    select: { id: true },
  });

  if (!unit) throw new Error("This unit is not available to your account.");
  return unit;
}

export async function saveApplicantProfile(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantProfileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const applicantPacketSignedAt =
    parsed.data.consentToScreening &&
    parsed.data.informationCertified &&
    parsed.data.applicantSignature &&
    parsed.data.applicantSignature.trim().length > 0
      ? new Date()
      : null;

  await prisma.applicantProfile.upsert({
    where: { userId: user.userId },
    update: { ...parsed.data, applicantPacketSignedAt },
    create: { ...parsed.data, applicantPacketSignedAt, userId: user.userId },
  });

  revalidateApplicant();
  redirect("/applicant/profile?saved=1");
}

export async function saveFavoriteRental(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = favoriteRentalSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await getApplicantUnitAccess(user.userId, user.email, parsed.data.unitId);

  await prisma.favoriteRental.upsert({
    where: {
      userId_unitId: { userId: user.userId, unitId: parsed.data.unitId },
    },
    update: { notes: parsed.data.notes },
    create: {
      userId: user.userId,
      unitId: parsed.data.unitId,
      notes: parsed.data.notes,
    },
  });

  revalidateApplicant();
  revalidatePath(`/marketplace/${parsed.data.unitId}`);
  redirect("/applicant/favorites");
}

export async function removeFavoriteRental(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = favoriteRentalSchema
    .pick({ unitId: true })
    .safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.favoriteRental.deleteMany({
    where: { userId: user.userId, unitId: parsed.data.unitId },
  });
  revalidateApplicant();
  revalidatePath(`/marketplace/${parsed.data.unitId}`);
}

export async function messagePotentialLandlord(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantInquirySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await prisma.unit.findFirst({
    where: {
      id: parsed.data.unitId,
      status: UnitStatus.AVAILABLE,
      property: { isArchived: false },
    },
    select: { id: true },
  });
  if (!unit) throw new Error("This unit is no longer available for inquiries.");

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.userId },
    select: { legalName: true, preferredName: true, phone: true },
  });
  const duplicateCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const duplicate = await prisma.lead.findFirst({
    where: {
      unitId: unit.id,
      email: user.email.toLowerCase(),
      createdAt: { gte: duplicateCutoff },
    },
    select: { id: true },
  });

  if (!duplicate) {
    await prisma.lead.create({
      data: {
        unitId: unit.id,
        name:
          profile?.preferredName ||
          profile?.legalName ||
          user.name ||
          user.email,
        email: user.email.toLowerCase(),
        phone: parsed.data.phone || profile?.phone || null,
        message: parsed.data.message,
      },
    });
  }

  await prisma.favoriteRental.upsert({
    where: { userId_unitId: { userId: user.userId, unitId: unit.id } },
    update: {},
    create: { userId: user.userId, unitId: unit.id },
  });

  revalidateApplicant();
  revalidatePath("/landlord/leads");
  if (parsed.data.returnTo?.startsWith("/marketplace/")) redirect(`${parsed.data.returnTo}?question=sent`);
  redirect("/applicant/favorites?message=sent");
}

export async function startMarketplaceApplication(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = marketplaceApplicationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await prisma.unit.findFirst({
    where: {
      id: parsed.data.unitId,
      status: UnitStatus.AVAILABLE,
      marketingStatus: "ACTIVE",
      property: { isArchived: false },
    },
    include: { property: true },
  });
  if (!unit) throw new Error("This rental is no longer available for applications.");

  const profile = await ensureProfile(user.userId, user.name);
  const existing = await prisma.application.findFirst({
    where: {
      unitId: unit.id,
      OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email.toLowerCase() }],
      status: { not: ApplicationStatus.WITHDRAWN },
    },
    select: { id: true, applicantUserId: true },
  });
  const applicantName = profile.preferredName || profile.legalName || user.name || user.email;
  const message = parsed.data.message?.trim();

  const application = existing
    ? await prisma.application.update({
        where: { id: existing.id },
        data: { applicantUserId: existing.applicantUserId ?? user.userId },
        select: { id: true },
      })
    : await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.findFirst({
          where: { unitId: unit.id, email: user.email.toLowerCase() },
          orderBy: { createdAt: "desc" },
          select: { id: true, application: { select: { id: true } } },
        });
        return tx.application.create({
          data: {
            unitId: unit.id,
            leadId: lead && !lead.application ? lead.id : undefined,
            applicantUserId: user.userId,
            applicantName,
            applicantEmail: user.email.toLowerCase(),
            applicantPhone: profile.phone,
            status: ApplicationStatus.STARTED,
            summary: message || "Applicant authorized sharing their saved renter packet from the marketplace listing.",
            applicationDetail: {
              create: {
                requestedMoveInDate: profile.desiredMoveInDate,
                dateOfBirth: profile.dateOfBirth,
                governmentIdType: profile.governmentIdType,
                driversLicenseState: profile.driversLicenseState,
                driversLicenseNumber: profile.driversLicenseNumber,
                emergencyContactName: profile.emergencyContactName,
                emergencyContactPhone: profile.emergencyContactPhone,
                emergencyContactRelation: profile.emergencyContactRelation,
                currentHousingStartDate: profile.currentHousingStartDate,
                previousAddress: profile.previousAddress || [profile.currentAddress, profile.city, profile.state, profile.zip].filter(Boolean).join(", ") || null,
                previousLandlordName: profile.previousLandlordName,
                previousLandlordPhone: profile.previousLandlordPhone,
                petDetails: profile.pets,
                voucherProgram: profile.voucherProgram || (profile.voucherHolder ? "Voucher holder" : null),
                voucherAgency: profile.voucherAgency,
                voucherCaseWorker: profile.voucherCaseWorker,
                voucherCaseWorkerContact: profile.voucherCaseWorkerContact,
                reasonForMoving: profile.reasonForMoving || profile.renterBio,
                vehicleInfo: profile.vehicleInfo,
                vehicleMake: profile.vehicleMake,
                vehicleModel: profile.vehicleModel,
                vehicleColor: profile.vehicleColor,
                vehicleYear: profile.vehicleYear,
                licensePlateNumber: profile.licensePlateNumber,
                licensePlateState: profile.licensePlateState,
                serviceAnimalAccommodation: profile.serviceAnimalAccommodation || profile.accessibilityNeeds,
                hasPriorEviction: profile.hasPriorEviction,
                priorEvictionExplanation: profile.priorEvictionExplanation,
                hasCriminalHistory: profile.hasCriminalHistory,
                criminalHistoryExplanation: profile.criminalHistoryExplanation,
                hasOutstandingUtilities: profile.hasOutstandingUtilities,
                outstandingUtilitiesExplanation: profile.outstandingUtilitiesExplanation,
                consentToScreening: profile.consentToScreening,
                informationCertified: profile.informationCertified,
                applicantSignature: profile.applicantSignature,
                signedAt: profile.applicantPacketSignedAt,
              },
            },
            notes: {
              create: {
                note: `[Applicant] Authorized HomeBase to share saved renter profile, household, income, reusable documents, and contact details for this rental.${message ? `\n\nApplicant note: ${message}` : ""}`,
              },
            },
            messageThreads: {
              create: {
                type: MessageThreadType.APPLICATION,
                status: MessageThreadStatus.WAITING_ON_STAFF,
                subject: `Application started: ${unit.property.name} #${unit.unitNumber}`,
                createdById: user.userId,
                lastMessageAt: new Date(),
                messages: {
                  create: {
                    senderId: user.userId,
                    body: message || "I authorized sharing my saved renter packet and would like to apply for this home.",
                  },
                },
              },
            },
          },
          select: { id: true },
        });
      });

  if (existing) {
    await prisma.applicationNote.create({
      data: {
        applicationId: application.id,
        note: `[Applicant] Re-authorized marketplace packet sharing for ${unit.property.name} #${unit.unitNumber}.${message ? `\n\nApplicant note: ${message}` : ""}`,
      },
    });
  }

  await prisma.favoriteRental.upsert({
    where: { userId_unitId: { userId: user.userId, unitId: unit.id } },
    update: {},
    create: { userId: user.userId, unitId: unit.id },
  });

  revalidateApplicant();
  revalidatePath("/landlord/applications");
  revalidatePath("/landlord/inbox");
  revalidatePath(`/marketplace/${unit.id}`);
  redirect(`/applicant/applications/${application.id}?applied=1`);
}

export async function addHouseholdMember(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = householdMemberSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const profile = await ensureProfile(user.userId, user.name);
  await prisma.householdMember.create({
    data: { profileId: profile.id, ...parsed.data },
  });

  revalidateApplicant();
  redirect("/applicant/profile");
}

export async function deleteHouseholdMember(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = deleteHouseholdMemberSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.householdMember.deleteMany({
    where: { id: parsed.data.id, profile: { userId: user.userId } },
  });

  revalidateApplicant();
}

export async function addIncomeSource(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = incomeSourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const profile = await ensureProfile(user.userId, user.name);
  await prisma.incomeSource.create({
    data: { profileId: profile.id, ...parsed.data },
  });

  revalidateApplicant();
  redirect("/applicant/profile");
}

export async function deleteIncomeSource(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = deleteIncomeSourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.incomeSource.deleteMany({
    where: { id: parsed.data.id, profile: { userId: user.userId } },
  });

  revalidateApplicant();
}

export async function saveUtilityAccount(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = utilityAccountSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await getApplicantApplicationAccess(
    user.userId,
    user.email,
    parsed.data.applicationId,
  );
  const unitId = parsed.data.unitId ?? application?.unitId ?? null;
  if (unitId)
    await getApplicantUnitAccess(
      user.userId,
      user.email,
      unitId,
      application?.id,
    );

  const { id, ...payload } = parsed.data;
  const data = { ...payload, unitId, userId: user.userId };

  if (id) {
    await prisma.utilityAccount.updateMany({
      where: { id, userId: user.userId },
      data,
    });
  } else {
    await prisma.utilityAccount.create({ data });
  }

  revalidateApplicant();
  redirect("/applicant/home-tools");
}

export async function deleteUtilityAccount(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = recordIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await prisma.utilityAccount.deleteMany({
    where: { id: parsed.data.id, userId: user.userId },
  });
  revalidateApplicant();
}

export async function savePayrollReminder(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = payrollReminderSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const { id, ...payload } = parsed.data;
  const data = { ...payload, userId: user.userId };
  if (id) {
    await prisma.payrollReminder.updateMany({
      where: { id, userId: user.userId },
      data,
    });
  } else {
    await prisma.payrollReminder.create({ data });
  }

  revalidateApplicant();
  redirect("/applicant/home-tools");
}

export async function deletePayrollReminder(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = recordIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await prisma.payrollReminder.deleteMany({
    where: { id: parsed.data.id, userId: user.userId },
  });
  revalidateApplicant();
}

export async function saveTenantPayment(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = tenantPaymentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await getApplicantUnitAccess(
    user.userId,
    user.email,
    parsed.data.unitId,
    parsed.data.applicationId,
  );
  const submittedAt =
    parsed.data.status === TenantPaymentStatus.SUBMITTED &&
    !parsed.data.submittedAt
      ? new Date()
      : parsed.data.submittedAt;
  const { id, ...payload } = parsed.data;
  const data = { ...payload, submittedAt, userId: user.userId };

  if (id) {
    await prisma.tenantPayment.updateMany({
      where: { id, userId: user.userId },
      data,
    });
  } else {
    await prisma.tenantPayment.create({ data });
  }

  revalidateApplicant();
  redirect("/applicant/home-tools");
}

export async function deleteTenantPayment(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = recordIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await prisma.tenantPayment.deleteMany({
    where: { id: parsed.data.id, userId: user.userId },
  });
  revalidateApplicant();
}

export async function claimMatchingApplications() {
  const user = await requireApplicantAction();

  await prisma.application.updateMany({
    where: { applicantUserId: null, applicantEmail: user.email },
    data: { applicantUserId: user.userId },
  });

  revalidateApplicant();
}


export async function saveApplicationDetail(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicationDetailSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(parsed.data.applicationId, user.userId, user.email);

  const { applicationId, applicantSignature, ...payload } = parsed.data;
  const signedAt =
    parsed.data.consentToScreening &&
    parsed.data.informationCertified &&
    applicantSignature &&
    applicantSignature.trim().length > 0
      ? new Date()
      : null;

  await prisma.applicationDetail.upsert({
    where: { applicationId },
    update: { ...payload, applicantSignature, signedAt },
    create: { applicationId, ...payload, applicantSignature, signedAt },
  });

  await prisma.applicantProfile.updateMany({
    where: { userId: user.userId },
    data: {
      dateOfBirth: payload.dateOfBirth,
      governmentIdType: payload.governmentIdType,
      driversLicenseState: payload.driversLicenseState,
      driversLicenseNumber: payload.driversLicenseNumber,
      emergencyContactName: payload.emergencyContactName,
      emergencyContactPhone: payload.emergencyContactPhone,
      emergencyContactRelation: payload.emergencyContactRelation,
      currentHousingStartDate: payload.currentHousingStartDate,
      previousAddress: payload.previousAddress,
      previousLandlordName: payload.previousLandlordName,
      previousLandlordPhone: payload.previousLandlordPhone,
      reasonForMoving: payload.reasonForMoving,
      desiredMoveInDate: payload.requestedMoveInDate,
      voucherProgram: payload.voucherProgram,
      voucherAgency: payload.voucherAgency,
      voucherCaseWorker: payload.voucherCaseWorker,
      voucherCaseWorkerContact: payload.voucherCaseWorkerContact,
      vehicleInfo: payload.vehicleInfo,
      vehicleMake: payload.vehicleMake,
      vehicleModel: payload.vehicleModel,
      vehicleColor: payload.vehicleColor,
      vehicleYear: payload.vehicleYear,
      licensePlateNumber: payload.licensePlateNumber,
      licensePlateState: payload.licensePlateState,
      pets: payload.petDetails,
      serviceAnimalAccommodation: payload.serviceAnimalAccommodation,
      hasPriorEviction: payload.hasPriorEviction,
      priorEvictionExplanation: payload.priorEvictionExplanation,
      hasCriminalHistory: payload.hasCriminalHistory,
      criminalHistoryExplanation: payload.criminalHistoryExplanation,
      hasOutstandingUtilities: payload.hasOutstandingUtilities,
      outstandingUtilitiesExplanation: payload.outstandingUtilitiesExplanation,
      consentToScreening: payload.consentToScreening,
      informationCertified: payload.informationCertified,
      applicantSignature,
      applicantPacketSignedAt: signedAt,
    },
  });

  await prisma.applicationNote.create({
    data: {
      applicationId,
      note: "[Applicant] Structured application details updated.",
    },
  });

  revalidateApplicant();
  revalidatePath(`/applicant/applications/${applicationId}`);
  redirect(`/applicant/applications/${applicationId}?details=saved#application-details`);
}

export async function submitApplicantApplication(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantApplicationSubmitSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(
    parsed.data.applicationId,
    user.userId,
    user.email,
  );

  const [profile, documentRequests, applicationDetail] = await Promise.all([
    prisma.applicantProfile.findUnique({
      where: { userId: user.userId },
      include: { householdMembers: true, incomeSources: true },
    }),
    prisma.documentRequest.findMany({
      where: { applicationId: parsed.data.applicationId },
      select: { status: true },
    }),
    prisma.applicationDetail.findUnique({
      where: { applicationId: parsed.data.applicationId },
    }),
  ]);

  const readiness = buildApplicationReadiness(profile, documentRequests, applicationDetail);
  if (!readiness.canSubmit) {
    const missing = readiness.requiredMissing
      .map((item) => item.label)
      .join(", ");
    throw new Error(
      `Complete the required application checklist before submitting: ${missing}.`,
    );
  }

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { applicantUserId: user.userId, status: ApplicationStatus.SUBMITTED },
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: "[Applicant] Application submitted for review.",
    },
  });

  revalidateApplicant();
  redirect("/applicant/applications?submitted=1");
}

export async function withdrawApplicantApplication(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantApplicationSubmitSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await prisma.application.findFirst({
    where: {
      id: parsed.data.applicationId,
      OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }],
    },
    select: { id: true, status: true },
  });

  if (!application)
    throw new Error("This application is not assigned to your account.");
  if (!withdrawableApplicationStatuses.includes(application.status)) {
    throw new Error(
      "This application can no longer be withdrawn from the applicant portal.",
    );
  }

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { applicantUserId: user.userId, status: ApplicationStatus.WITHDRAWN },
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: "[Applicant] Application withdrawn by applicant.",
    },
  });

  await writeAuditLog({
    actor: user,
    action: AuditAction.STATUS_CHANGE,
    entityType: "Application",
    entityId: parsed.data.applicationId,
    message: "Applicant withdrew application.",
    metadata: {
      previousStatus: application.status,
      nextStatus: ApplicationStatus.WITHDRAWN,
    },
  });

  revalidateApplicant();
  revalidatePath(`/applicant/applications/${parsed.data.applicationId}`);
  redirect("/applicant/applications?withdrawn=1");
}

export async function uploadApplicantDocument(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantDocumentUploadSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(
    parsed.data.applicationId,
    user.userId,
    user.email,
  );

  let request = null as null | {
    id: string;
    title: string;
    category: DocumentCategory;
  };
  if (parsed.data.requestId) {
    request = await prisma.documentRequest.findFirst({
      where: {
        id: parsed.data.requestId,
        applicationId: parsed.data.applicationId,
        status: {
          in: [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED],
        },
      },
      select: { id: true, title: true, category: true },
    });
    if (!request)
      throw new Error(
        "This document request is no longer open or is not assigned to this application.",
      );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("A document file is required.");

  const stored = await saveUploadedDocument(file);

  const document = await prisma.document.create({
    data: {
      title: request?.title ?? parsed.data.title,
      category: request?.category ?? parsed.data.category,
      applicationId: parsed.data.applicationId,
      visibility: DocumentVisibility.APPLICANT,
      status: DocumentStatus.UPLOADED,
      notes: parsed.data.notes,
      uploadedById: user.userId,
      ...stored,
    },
  });

  if (request) {
    await prisma.documentRequest.update({
      where: { id: request.id },
      data: {
        status: DocumentRequestStatus.SUBMITTED,
        fulfilledDocumentId: document.id,
        reviewNotes: null,
      },
    });

    await prisma.applicationNote.create({
      data: {
        applicationId: parsed.data.applicationId,
        note: `[Applicant] Uploaded requested document: ${request.title}.`,
      },
    });
  }

  revalidateApplicant();
  revalidatePath(`/applicant/applications/${parsed.data.applicationId}`);
  redirect(`/applicant/applications/${parsed.data.applicationId}`);
}

export async function signApplicantLease(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = leaseSignatureSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const signature = await completeSignatureRequest({
    actor: user,
    actorLabel: "Tenant",
    signatureText: parsed.data.signatureText,
    requestWhere: baseSignatureRequestWhere({
      requestId: parsed.data.requestId,
      userId: user.userId,
      email: user.email,
      role: SignatureRole.TENANT,
      leasePacketWhere: {
        application: {
          OR: [
            { applicantUserId: user.userId },
            { applicantEmail: user.email },
          ],
        },
      },
    }),
  });

  await completeLeaseIfReadyAndFinalize({
    leasePacketId: signature.leasePacketId,
    actor: user,
  });

  revalidateApplicant();
  revalidatePath(`/applicant/leases/${signature.leasePacketId}`);
  redirect(`/applicant/leases/${signature.leasePacketId}`);
}
