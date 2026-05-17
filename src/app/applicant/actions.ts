"use server";

import { ApplicationStatus, AuditAction, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility, LeasePacketStatus, SignatureRole, SignatureStatus, TenantPaymentStatus, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  applicantApplicationSubmitSchema,
  applicantDocumentUploadSchema,
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
  validationMessage
} from "@/lib/validation";
import { saveUploadedDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import { baseSignatureRequestWhere, completeSignatureRequest } from "@/lib/signature-workflow";

async function requireApplicantAction() {
  return await requireRole(["APPLICANT", "TENANT"], "/applicant");
}

const applicantInquirySchema = z.object({
  unitId: z.string().trim().min(1),
  phone: z.string().trim().max(80).optional(),
  message: z.string().trim().min(2).max(2000)
});

async function ensureProfile(userId: string, fallbackName: string | null) {
  return prisma.applicantProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, legalName: fallbackName || "Applicant" }
  });
}

async function assertOwnsApplication(applicationId: string, userId: string, email: string) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      OR: [{ applicantUserId: userId }, { applicantEmail: email }]
    },
    select: { id: true }
  });

  if (!application) throw new Error("This application is not assigned to your account.");
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

async function getApplicantApplicationAccess(userId: string, email: string, applicationId: string | null | undefined) {
  if (!applicationId) return null;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, OR: [{ applicantUserId: userId }, { applicantEmail: email }] },
    select: { id: true, unitId: true }
  });
  if (!application) throw new Error("This application is not assigned to your account.");
  return application;
}

async function getApplicantUnitAccess(userId: string, email: string, unitId: string, applicationId?: string | null) {
  const application = await getApplicantApplicationAccess(userId, email, applicationId);
  if (application) {
    if (application.unitId !== unitId) throw new Error("Selected application does not match the selected unit.");
    return { id: unitId };
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      OR: [
        { status: UnitStatus.AVAILABLE, property: { isArchived: false } },
        { applications: { some: { OR: [{ applicantUserId: userId }, { applicantEmail: email }] } } },
        { tenantUserId: userId }
      ]
    },
    select: { id: true }
  });

  if (!unit) throw new Error("This unit is not available to your account.");
  return unit;
}

export async function saveApplicantProfile(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantProfileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.applicantProfile.upsert({
    where: { userId: user.userId },
    update: parsed.data,
    create: { ...parsed.data, userId: user.userId }
  });

  revalidateApplicant();
  redirect("/applicant/profile");
}

export async function saveFavoriteRental(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = favoriteRentalSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await getApplicantUnitAccess(user.userId, user.email, parsed.data.unitId);

  await prisma.favoriteRental.upsert({
    where: { userId_unitId: { userId: user.userId, unitId: parsed.data.unitId } },
    update: { notes: parsed.data.notes },
    create: { userId: user.userId, unitId: parsed.data.unitId, notes: parsed.data.notes }
  });

  revalidateApplicant();
  revalidatePath(`/marketplace/${parsed.data.unitId}`);
  redirect("/applicant/favorites");
}

export async function removeFavoriteRental(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = favoriteRentalSchema.pick({ unitId: true }).safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.favoriteRental.deleteMany({ where: { userId: user.userId, unitId: parsed.data.unitId } });
  revalidateApplicant();
  revalidatePath(`/marketplace/${parsed.data.unitId}`);
}

export async function messagePotentialLandlord(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantInquirySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await prisma.unit.findFirst({
    where: { id: parsed.data.unitId, status: UnitStatus.AVAILABLE, property: { isArchived: false } },
    select: { id: true }
  });
  if (!unit) throw new Error("This unit is no longer available for inquiries.");

  const profile = await prisma.applicantProfile.findUnique({ where: { userId: user.userId }, select: { legalName: true, preferredName: true, phone: true } });
  const duplicateCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const duplicate = await prisma.lead.findFirst({
    where: { unitId: unit.id, email: user.email.toLowerCase(), createdAt: { gte: duplicateCutoff } },
    select: { id: true }
  });

  if (!duplicate) {
    await prisma.lead.create({
      data: {
        unitId: unit.id,
        name: profile?.preferredName || profile?.legalName || user.name || user.email,
        email: user.email.toLowerCase(),
        phone: parsed.data.phone || profile?.phone || null,
        message: parsed.data.message
      }
    });
  }

  await prisma.favoriteRental.upsert({
    where: { userId_unitId: { userId: user.userId, unitId: unit.id } },
    update: {},
    create: { userId: user.userId, unitId: unit.id }
  });

  revalidateApplicant();
  revalidatePath("/landlord/leads");
  redirect("/applicant/favorites?message=sent");
}

export async function addHouseholdMember(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = householdMemberSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const profile = await ensureProfile(user.userId, user.name);
  await prisma.householdMember.create({ data: { profileId: profile.id, ...parsed.data } });

  revalidateApplicant();
  redirect("/applicant/profile");
}

export async function deleteHouseholdMember(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = deleteHouseholdMemberSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.householdMember.deleteMany({
    where: { id: parsed.data.id, profile: { userId: user.userId } }
  });

  revalidateApplicant();
}

export async function addIncomeSource(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = incomeSourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const profile = await ensureProfile(user.userId, user.name);
  await prisma.incomeSource.create({ data: { profileId: profile.id, ...parsed.data } });

  revalidateApplicant();
  redirect("/applicant/profile");
}

export async function deleteIncomeSource(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = deleteIncomeSourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.incomeSource.deleteMany({
    where: { id: parsed.data.id, profile: { userId: user.userId } }
  });

  revalidateApplicant();
}

export async function saveUtilityAccount(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = utilityAccountSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await getApplicantApplicationAccess(user.userId, user.email, parsed.data.applicationId);
  const unitId = parsed.data.unitId ?? application?.unitId ?? null;
  if (unitId) await getApplicantUnitAccess(user.userId, user.email, unitId, application?.id);

  const { id, ...payload } = parsed.data;
  const data = { ...payload, unitId, userId: user.userId };

  if (id) {
    await prisma.utilityAccount.updateMany({ where: { id, userId: user.userId }, data });
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
  await prisma.utilityAccount.deleteMany({ where: { id: parsed.data.id, userId: user.userId } });
  revalidateApplicant();
}

export async function savePayrollReminder(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = payrollReminderSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const { id, ...payload } = parsed.data;
  const data = { ...payload, userId: user.userId };
  if (id) {
    await prisma.payrollReminder.updateMany({ where: { id, userId: user.userId }, data });
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
  await prisma.payrollReminder.deleteMany({ where: { id: parsed.data.id, userId: user.userId } });
  revalidateApplicant();
}

export async function saveTenantPayment(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = tenantPaymentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await getApplicantUnitAccess(user.userId, user.email, parsed.data.unitId, parsed.data.applicationId);
  const submittedAt = parsed.data.status === TenantPaymentStatus.SUBMITTED && !parsed.data.submittedAt ? new Date() : parsed.data.submittedAt;
  const { id, ...payload } = parsed.data;
  const data = { ...payload, submittedAt, userId: user.userId };

  if (id) {
    await prisma.tenantPayment.updateMany({ where: { id, userId: user.userId }, data });
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
  await prisma.tenantPayment.deleteMany({ where: { id: parsed.data.id, userId: user.userId } });
  revalidateApplicant();
}

export async function claimMatchingApplications() {
  const user = await requireApplicantAction();

  await prisma.application.updateMany({
    where: { applicantUserId: null, applicantEmail: user.email },
    data: { applicantUserId: user.userId }
  });

  revalidateApplicant();
}

export async function submitApplicantApplication(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantApplicationSubmitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(parsed.data.applicationId, user.userId, user.email);

  const unresolvedRequests = await prisma.documentRequest.count({
    where: {
      applicationId: parsed.data.applicationId,
      status: { in: [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED] }
    }
  });

  if (unresolvedRequests > 0) {
    throw new Error("Complete or replace all requested documents before submitting this application.");
  }

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { applicantUserId: user.userId, status: ApplicationStatus.SUBMITTED }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: "[Applicant] Application submitted for review."
    }
  });

  revalidateApplicant();
  redirect(`/applicant/applications/${parsed.data.applicationId}`);
}

export async function withdrawApplicantApplication(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantApplicationSubmitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await prisma.application.findFirst({
    where: {
      id: parsed.data.applicationId,
      OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }]
    },
    select: { id: true, status: true }
  });

  if (!application) throw new Error("This application is not assigned to your account.");
  if (![ApplicationStatus.STARTED, ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW].includes(application.status)) {
    throw new Error("This application can no longer be withdrawn from the applicant portal.");
  }

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { applicantUserId: user.userId, status: ApplicationStatus.WITHDRAWN }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: "[Applicant] Application withdrawn by applicant."
    }
  });

  await writeAuditLog({
    actor: user,
    action: AuditAction.STATUS_CHANGE,
    entityType: "Application",
    entityId: parsed.data.applicationId,
    message: "Applicant withdrew application.",
    metadata: { previousStatus: application.status, nextStatus: ApplicationStatus.WITHDRAWN }
  });

  revalidateApplicant();
  revalidatePath(`/applicant/applications/${parsed.data.applicationId}`);
  redirect("/applicant/applications?withdrawn=1");
}


export async function uploadApplicantDocument(formData: FormData) {
  const user = await requireApplicantAction();
  const parsed = applicantDocumentUploadSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await assertOwnsApplication(parsed.data.applicationId, user.userId, user.email);

  let request = null as null | { id: string; title: string; category: DocumentCategory };
  if (parsed.data.requestId) {
    request = await prisma.documentRequest.findFirst({
      where: { id: parsed.data.requestId, applicationId: parsed.data.applicationId, status: { in: [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.REJECTED] } },
      select: { id: true, title: true, category: true }
    });
    if (!request) throw new Error("This document request is no longer open or is not assigned to this application.");
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
      ...stored
    }
  });

  if (request) {
    await prisma.documentRequest.update({
      where: { id: request.id },
      data: {
        status: DocumentRequestStatus.SUBMITTED,
        fulfilledDocumentId: document.id,
        reviewNotes: null
      }
    });

    await prisma.applicationNote.create({
      data: {
        applicationId: parsed.data.applicationId,
        note: `[Applicant] Uploaded requested document: ${request.title}.`
      }
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
        application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }
      }
    })
  });

  await completeLeaseIfReadyAndFinalize({ leasePacketId: signature.leasePacketId, actor: user });

  revalidateApplicant();
  revalidatePath(`/applicant/leases/${signature.leasePacketId}`);
  redirect(`/applicant/leases/${signature.leasePacketId}`);
}
