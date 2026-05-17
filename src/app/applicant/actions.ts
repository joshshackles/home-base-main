"use server";

import { ApplicationStatus, AuditAction, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility, LeasePacketStatus, SignatureRole, SignatureStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  applicantApplicationSubmitSchema,
  applicantDocumentUploadSchema,
  applicantProfileSchema,
  deleteHouseholdMemberSchema,
  deleteIncomeSourceSchema,
  formDataToObject,
  householdMemberSchema,
  incomeSourceSchema,
  leaseSignatureSchema,
  validationMessage
} from "@/lib/validation";
import { saveUploadedDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { completeLeaseIfReadyAndFinalize } from "@/lib/signed-lease";
import { ELECTRONIC_SIGNATURE_CONSENT_TEXT, buildSignatureEvidenceHash, leaseTextHash } from "@/lib/e-signature";

async function requireApplicantAction() {
  return await requireRole(["APPLICANT", "TENANT"], "/applicant");
}

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

  const request = await prisma.signatureRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      signerRole: SignatureRole.TENANT,
      status: SignatureStatus.PENDING,
      leasePacket: { status: LeasePacketStatus.SENT_FOR_SIGNATURE },
      OR: [{ signerUserId: user.userId }, { signerEmail: user.email }]
    },
    include: {
      leasePacket: {
        include: {
          template: true,
          application: { include: { applicantUser: true, unit: { include: { property: { include: { owner: true } } } } } }
        }
      }
    }
  });

  if (!request) throw new Error("This signature request is not available for your account.");
  if (request.expiresAt && request.expiresAt < new Date()) {
    await prisma.signatureRequest.update({ where: { id: request.id }, data: { status: SignatureStatus.EXPIRED } });
    throw new Error("This signature request has expired. Please ask the administrator to resend or extend it.");
  }

  const h = headers();
  const signedAt = new Date();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;
  const documentTextHash = leaseTextHash(request.leasePacket);
  const signatureEvidenceHash = buildSignatureEvidenceHash({
    leasePacketId: request.leasePacketId,
    signatureRequestId: request.id,
    signerEmail: request.signerEmail,
    signerRole: request.signerRole,
    signatureText: parsed.data.signatureText,
    signedAt,
    documentTextHash,
    consentText: ELECTRONIC_SIGNATURE_CONSENT_TEXT,
    ipAddress,
    userAgent
  });

  await prisma.signatureRequest.update({
    where: { id: request.id },
    data: {
      signerUserId: user.userId,
      signatureText: parsed.data.signatureText,
      status: SignatureStatus.SIGNED,
      signedAt,
      ipAddress,
      userAgent,
      electronicConsentAccepted: true,
      electronicConsentText: ELECTRONIC_SIGNATURE_CONSENT_TEXT,
      electronicConsentAcceptedAt: signedAt,
      documentTextHash,
      signatureEvidenceHash
    }
  });

  await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[Tenant] ${user.email} signed the lease packet.` } });
  await writeAuditLog({ actor: user, action: AuditAction.SIGN, entityType: "SignatureRequest", entityId: request.id, message: `Tenant signature completed by ${user.email}.`, metadata: { leasePacketId: request.leasePacketId, documentTextHash, signatureEvidenceHash, electronicConsentAccepted: true } });
  await completeLeaseIfReadyAndFinalize({ leasePacketId: request.leasePacketId, actor: user });

  revalidateApplicant();
  revalidatePath(`/applicant/leases/${request.leasePacketId}`);
  redirect(`/applicant/leases/${request.leasePacketId}`);
}
