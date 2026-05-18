"use server";

import { AdminAnalyticsPeriod, AdminBrandingThemeMode, ApplicationStatus, AuditAction, DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility, InspectionStatus, LedgerEntryStatus, LedgerEntryType, PaymentPlanInstallmentStatus, PaymentPlanStatus, LeadStatus, LeasePacketStatus, SecurityEventType, SignatureNotificationStatus, SignatureNotificationType, SignatureRole, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { appUrl, createSecureToken, hashToken } from "@/lib/tokens";
import { writeSecurityEvent } from "@/lib/security-events";
import {
  adminApplicationLinkSchema,
  generateApplicationClaimLinkSchema,
  adminPasswordResetLinkSchema,
  applicationNoteSchema,
  applicationStatusSchema,
  convertLeadSchema,
  createUserSchema,
  deleteDocumentSchema,
  documentRequestSchema,
  documentRequestStatusSchema,
  documentStatusSchema,
  documentUploadSchema,
  inspectionChecklistItemSchema,
  inspectionChecklistStatusSchema,
  inspectionSchema,
  inspectionStatusSchema,
  ledgerEntrySchema,
  ledgerVoidSchema,
  paymentPlanSchema,
  paymentPlanStatusSchema,
  paymentPlanInstallmentStatusSchema,
  recurringChargeScheduleSchema,
  recurringChargeScheduleIdSchema,
  generateRecurringChargesSchema,
  formDataToObject,
  leadNoteSchema,
  leadStatusSchema,
  leaseNoteSchema,
  leasePacketStatusSchema,
  leaseReissueSchema,
  leaseSignaturePrepareSchema,
  leaseSignatureStatusSchema,
  signatureExpirationSchema,
  signatureReminderSchema,
  leaseTemplateSchema,
  createLeasePacketSchema,
  updateLeasePacketSchema,
  propertySchema,
  unitSchema,
  updateUserSchema,
  validationMessage
} from "@/lib/validation";
import { removeStoredDocument, saveGeneratedDocument, saveUploadedDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { createApplicationClaimToken } from "@/lib/applicant-onboarding";
import { renderLeaseTemplate } from "@/lib/lease-render";
import { createTextPdfBuffer } from "@/lib/pdf";
import { generateFinalSignedLeaseDocument, syncLeaseCompletion } from "@/lib/signed-lease";
import { defaultSignatureExpirationDate, queueSignatureNotification } from "@/lib/signature-notifications";
import { sendEmail, sendQueuedSignatureNotificationEmails, sendSignatureNotificationEmail } from "@/lib/email";
import { addMonthsSafe, advanceMonthlyRunDate, isScheduleDue, nextMonthlyRunDate, plannedInstallmentCount, recurringChargePeriodKey } from "@/lib/ledger";
import { importDataSnapshot, type DataSnapshot } from "@/lib/data-portability";
import { captureAnalyticsSnapshot, captureSystemHealthSnapshot, ensureDefaultAutomationRules, markBackupRestoreStarted, saveBrandingSettings, syncOperationalAlertsFromReadiness } from "@/lib/admin-ops";

const LOCKED_LEASE_PACKET_STATUSES: LeasePacketStatus[] = [
  LeasePacketStatus.SENT_FOR_SIGNATURE,
  LeasePacketStatus.COMPLETED,
  LeasePacketStatus.VOIDED
];

const PAID_OR_WAIVED_INSTALLMENT_STATUSES: PaymentPlanInstallmentStatus[] = [
  PaymentPlanInstallmentStatus.PAID,
  PaymentPlanInstallmentStatus.WAIVED
];

async function requireAdminAction() {
  return await requireRole(["ADMIN"]);
}


function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(formData: FormData, key: string, label: string, max = 240) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} is required.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function requiredColor(formData: FormData, key: string, label: string) {
  const value = requiredString(formData, key, label, 24);
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) throw new Error(`${label} must be a valid hex color like #2563EB.`);
  return value.toUpperCase();
}

export async function saveAdminBrandingAction(formData: FormData) {
  const actor = await requireAdminAction();
  const rawThemeMode = formData.get("themeMode");
  const themeMode = Object.values(AdminBrandingThemeMode).includes(rawThemeMode as AdminBrandingThemeMode)
    ? (rawThemeMode as AdminBrandingThemeMode)
    : AdminBrandingThemeMode.SYSTEM;

  await saveBrandingSettings(actor, {
    productName: requiredString(formData, "productName", "Product name", 80),
    shortName: requiredString(formData, "shortName", "Short name", 40),
    tagline: requiredString(formData, "tagline", "Tagline", 160),
    homepageHeadline: requiredString(formData, "homepageHeadline", "Homepage headline", 180),
    homepageSubheadline: requiredString(formData, "homepageSubheadline", "Homepage subheadline", 360),
    primaryColor: requiredColor(formData, "primaryColor", "Primary color"),
    accentColor: requiredColor(formData, "accentColor", "Accent color"),
    surfaceColor: requiredColor(formData, "surfaceColor", "Surface color"),
    logoMarkText: requiredString(formData, "logoMarkText", "Logo mark", 8).toUpperCase(),
    logoUrl: optionalString(formData, "logoUrl"),
    faviconUrl: optionalString(formData, "faviconUrl"),
    supportEmail: optionalString(formData, "supportEmail"),
    themeMode,
    publicSignupEnabled: formData.get("publicSignupEnabled") === "on",
    marketplaceEnabled: formData.get("marketplaceEnabled") === "on"
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/branding");
  redirect("/admin/branding?saved=1");
}


export async function syncOperationalReadinessAction() {
  const actor = await requireAdminAction();
  await syncOperationalAlertsFromReadiness(actor);
  await captureSystemHealthSnapshot(actor);
  revalidatePath("/admin");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/system");
  redirect("/admin/operations?synced=1");
}

export async function captureSystemHealthAction() {
  const actor = await requireAdminAction();
  await captureSystemHealthSnapshot(actor);
  revalidatePath("/admin/operations");
  revalidatePath("/admin/system");
  redirect("/admin/operations?health=1");
}

export async function seedAutomationRulesAction() {
  const actor = await requireAdminAction();
  await ensureDefaultAutomationRules(actor);
  revalidatePath("/admin/operations");
  redirect("/admin/operations?rules=1");
}

export async function captureAdminAnalyticsAction(formData?: FormData) {
  const actor = await requireAdminAction();
  const rawPeriod = formData?.get("period");
  const period = Object.values(AdminAnalyticsPeriod).includes(rawPeriod as AdminAnalyticsPeriod)
    ? (rawPeriod as AdminAnalyticsPeriod)
    : AdminAnalyticsPeriod.DAILY;
  await captureAnalyticsSnapshot(actor, period);
  revalidatePath("/admin/analytics");
  redirect("/admin/analytics?snapshot=1");
}

export async function importDataSnapshotAction(formData: FormData) {
  const actor = await requireAdminAction();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Choose a HomeBase JSON export file to import.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Import file is too large. Use a JSON file under 10 MB.");

  let snapshot: DataSnapshot;
  try {
    snapshot = JSON.parse(await file.text()) as DataSnapshot;
  } catch {
    throw new Error("Import file must be valid JSON.");
  }

  const counts = await importDataSnapshot(snapshot);
  await markBackupRestoreStarted(actor, optionalString(formData, "backupId"), Object.values(counts).reduce((sum, count) => sum + count, 0));
  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "DataSnapshot",
    entityId: "import",
    message: "Imported HomeBase data snapshot.",
    metadata: counts
  });

  revalidatePath("/admin");
  revalidatePath("/admin/system");
  revalidatePath("/admin/users");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/units");
  revalidatePath("/admin/rentals");
  revalidatePath("/marketplace");
  const redirectTo = optionalString(formData, "redirectTo") || "/admin/system";
  const safeRedirectTo = redirectTo.startsWith("/admin/backups") ? "/admin/backups" : "/admin/system";
  redirect(`${safeRedirectTo}?imported=${encodeURIComponent(Object.values(counts).reduce((sum, count) => sum + count, 0).toString())}`);
}

function getRequiredId(formData: FormData, label: string) {
  const value = formData.get("id");
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function propertyPayload(formData: FormData) {
  const parsed = propertySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  return parsed.data;
}

async function unitPayload(formData: FormData) {
  const parsed = unitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, isArchived: false },
    select: { id: true }
  });

  if (!property) {
    throw new Error("Selected property was not found or is archived.");
  }

  return parsed.data;
}

function revalidateInventory() {
  revalidatePath("/admin");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/units");
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/users");
  revalidatePath("/admin/leases");
  revalidatePath("/marketplace");
}

async function ensureActiveLandlord(ownerId: string | null | undefined) {
  if (!ownerId) return;

  const owner = await prisma.user.findFirst({
    where: { id: ownerId, role: UserRole.LANDLORD, isActive: true },
    select: { id: true }
  });

  if (!owner) {
    throw new Error("Selected property owner must be an active landlord account.");
  }
}

export async function createProperty(formData: FormData) {
  const actor = await requireAdminAction();
  const data = propertyPayload(formData);
  await ensureActiveLandlord(data.ownerId);
  const created = await prisma.property.create({ data });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "Property", entityId: created.id, message: `Created property ${created.name}.` });
  revalidateInventory();
  redirect("/admin/properties");
}

export async function updateProperty(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Property ID");
  const data = propertyPayload(formData);
  await ensureActiveLandlord(data.ownerId);
  const updated = await prisma.property.update({ where: { id }, data });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "Property", entityId: updated.id, message: `Updated property ${updated.name}.` });
  revalidateInventory();
  redirect("/admin/properties");
}

export async function archiveProperty(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Property ID");

  await prisma.$transaction([
    prisma.property.update({ where: { id }, data: { isArchived: true } }),
    prisma.unit.updateMany({ where: { propertyId: id }, data: { status: UnitStatus.ARCHIVED } })
  ]);

  await writeAuditLog({ actor, action: AuditAction.ARCHIVE, entityType: "Property", entityId: id, message: "Archived property and its units." });
  revalidateInventory();
}

export async function restoreProperty(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Property ID");
  await prisma.property.update({ where: { id }, data: { isArchived: false } });
  await writeAuditLog({ actor, action: AuditAction.RESTORE, entityType: "Property", entityId: id, message: "Restored property." });
  revalidateInventory();
}

export async function deleteProperty(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Property ID");

  await prisma.$transaction([
    prisma.property.update({ where: { id }, data: { isArchived: true } }),
    prisma.unit.updateMany({ where: { propertyId: id }, data: { status: UnitStatus.ARCHIVED } })
  ]);

  await writeAuditLog({ actor, action: AuditAction.ARCHIVE, entityType: "Property", entityId: id, message: "Soft-deleted property by archiving it and its units." });
  revalidateInventory();
}

export async function createUnit(formData: FormData) {
  const actor = await requireAdminAction();
  const created = await prisma.unit.create({ data: await unitPayload(formData) });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "Rental", entityId: created.id, message: `Created rental ${created.unitNumber}.` });
  revalidateInventory();
  redirect("/admin/rentals");
}

export async function updateUnit(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Unit ID");
  const updated = await prisma.unit.update({ where: { id }, data: await unitPayload(formData) });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "Rental", entityId: updated.id, message: `Updated rental ${updated.unitNumber}.` });
  revalidateInventory();
  redirect("/admin/rentals");
}

export async function archiveUnit(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Unit ID");
  await prisma.unit.update({ where: { id }, data: { status: UnitStatus.ARCHIVED } });
  await writeAuditLog({ actor, action: AuditAction.ARCHIVE, entityType: "Rental", entityId: id, message: "Archived rental." });
  revalidateInventory();
}

export async function restoreUnit(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Unit ID");
  await prisma.unit.update({ where: { id }, data: { status: UnitStatus.PENDING } });
  await writeAuditLog({ actor, action: AuditAction.RESTORE, entityType: "Rental", entityId: id, message: "Restored unit to unavailable status." });
  revalidateInventory();
}

export async function deleteUnit(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Unit ID");
  await prisma.unit.update({ where: { id }, data: { status: UnitStatus.ARCHIVED } });
  await writeAuditLog({ actor, action: AuditAction.ARCHIVE, entityType: "Rental", entityId: id, message: "Soft-deleted unit by archiving it." });
  revalidateInventory();
}

export async function createUser(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = createUserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const { password, ...data } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existingUser) throw new Error("A user with that email already exists.");

  const created = await prisma.user.create({
    data: {
      ...data,
      passwordHash: hashPassword(password),
      forcePasswordReset: true,
      passwordChangedAt: null
    }
  });

  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "User", entityId: created.id, message: `Created ${created.role.toLowerCase()} user ${created.email}.` });
  revalidateInventory();
  redirect("/admin/users");
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdminAction();
  const parsed = updateUserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const { id, password, ...data } = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true }
  });
  if (!target) throw new Error("User was not found.");

  const emailOwner = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== id) throw new Error("Another user already has that email address.");

  const activeAdminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });
  const wouldRemoveLastAdmin =
    target.role === UserRole.ADMIN &&
    target.isActive &&
    (data.role !== UserRole.ADMIN || data.isActive === false) &&
    activeAdminCount <= 1;

  if (wouldRemoveLastAdmin) {
    throw new Error("You cannot deactivate or demote the final active admin account.");
  }

  if (currentUser.userId === id && data.role !== UserRole.ADMIN) {
    throw new Error("You cannot remove your own admin role while signed in.");
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(password ? { passwordHash: hashPassword(password), forcePasswordReset: true, passwordChangedAt: null, failedLoginCount: 0, lockedUntil: null } : {})
    }
  });

  await writeAuditLog({ actor: currentUser, action: AuditAction.UPDATE, entityType: "User", entityId: id, message: `Updated user ${data.email}.` });
  revalidateInventory();
  redirect("/admin/users");
}

export async function deactivateUser(formData: FormData) {
  const currentUser = await requireAdminAction();
  const id = getRequiredId(formData, "User ID");

  if (currentUser.userId === id) {
    throw new Error("You cannot deactivate your own user account.");
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!user) throw new Error("User was not found.");

  if (user.role === UserRole.ADMIN && user.isActive) {
    const activeAdminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });
    if (activeAdminCount <= 1) throw new Error("You cannot deactivate the final active admin account.");
  }

  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ actor: currentUser, action: AuditAction.UPDATE, entityType: "User", entityId: id, message: "Deactivated user account." });
  revalidateInventory();
}

export async function activateUser(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "User ID");
  await prisma.user.update({ where: { id }, data: { isActive: true } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "User", entityId: id, message: "Activated user account." });
  revalidateInventory();
}

export async function createPasswordResetLink(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = adminPasswordResetLinkSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, email: true, isActive: true } });
  if (!user || !user.isActive) throw new Error("Only active users can receive a password reset link.");

  const token = createSecureToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 45 * 60 * 1000)
    }
  });

  const resetLink = `${appUrl()}/reset-password?token=${token}`;
  const emailResult = await sendEmail({
    to: user.email,
    subject: "Password reset link - HomeBase MLS",
    body: `Hello,\n\nAn administrator created a password reset link for your HomeBase MLS account. This link expires in 45 minutes.\n\nReset your password here: ${resetLink}\n\nIf you did not expect this message, contact your HomeBase MLS administrator.`
  });

  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "User", entityId: user.id, message: `Created password reset link for ${user.email}.`, metadata: { emailDeliveryStatus: emailResult.ok ? "SENT" : "FAILED", emailProvider: emailResult.provider, emailError: emailResult.error } });
  await writeSecurityEvent({ type: SecurityEventType.PASSWORD_RESET_LINK_CREATED, userId: user.id, email: user.email, message: "Admin created a password reset link.", metadata: { emailDeliveryStatus: emailResult.ok ? "SENT" : "FAILED", emailProvider: emailResult.provider, emailError: emailResult.error } });

  const params = new URLSearchParams({ resetEmail: emailResult.ok ? "sent" : "failed", provider: emailResult.provider });
  if (!emailResult.ok && emailResult.error) params.set("error", emailResult.error);
  redirect(`/admin/users/${user.id}/edit?${params.toString()}`);
}


export async function updateLeadStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leadStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.lead.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status }
  });

  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "Lead", entityId: parsed.data.id, message: `Changed lead status to ${parsed.data.status}.` });
  revalidateInventory();
  revalidatePath(`/admin/leads/${parsed.data.id}`);
}

export async function addLeadNote(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leadNoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.leadNote.create({
    data: {
      leadId: parsed.data.leadId,
      note: parsed.data.note
    }
  });

  await writeAuditLog({ actor, action: AuditAction.NOTE, entityType: "Lead", entityId: parsed.data.leadId, message: "Added internal lead note." });
  revalidateInventory();
  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
}

export async function convertLeadToApplication(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = convertLeadSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    include: { application: true }
  });

  if (!lead) throw new Error("Lead was not found.");

  if (lead.application) {
    redirect(`/admin/applications/${lead.application.id}`);
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        leadId: lead.id,
        unitId: lead.unitId,
        applicantName: lead.name,
        applicantEmail: lead.email,
        applicantPhone: lead.phone,
        status: ApplicationStatus.STARTED,
        summary: parsed.data.summary ?? lead.message
      }
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.APPLICATION_STARTED }
    });

    if (parsed.data.summary) {
      await tx.applicationNote.create({
        data: {
          applicationId: created.id,
          note: parsed.data.summary
        }
      });
    }

    return created;
  });

  await writeAuditLog({ actor, action: AuditAction.CONVERT, entityType: "Lead", entityId: lead.id, message: `Converted lead to application ${application.id}.`, metadata: { applicationId: application.id } });
  revalidateInventory();
  redirect(`/admin/applications/${application.id}`);
}


export async function generateApplicationClaimLink(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = generateApplicationClaimLinkSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const claim = await createApplicationClaimToken(parsed.data.applicationId, actor, parsed.data.expiresInDays);

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: `[Admin copy link] ${claim.url}`
    }
  });

  revalidateInventory();
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  redirect(`/admin/applications/${parsed.data.applicationId}?claimLink=${encodeURIComponent(claim.url)}`);
}

export async function linkApplicationToApplicant(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = adminApplicationLinkSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const applicant = await prisma.user.findFirst({
    where: { email: parsed.data.applicantEmail, role: { in: [UserRole.APPLICANT, UserRole.TENANT] }, isActive: true },
    select: { id: true, email: true, name: true }
  });

  if (!applicant) {
    throw new Error("No active applicant or tenant user exists with that email address.");
  }

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { applicantUserId: applicant.id, applicantEmail: applicant.email, applicantName: applicant.name || applicant.email }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: `[Admin] Application connected to applicant portal account ${applicant.email}.`
    }
  });

  await writeAuditLog({ actor, action: AuditAction.LINK, entityType: "Application", entityId: parsed.data.applicationId, message: `Connected application to applicant ${applicant.email}.` });
  revalidateInventory();
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
}

export async function updateApplicationStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = applicationStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.application.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status }
  });

  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "Application", entityId: parsed.data.id, message: `Changed application status to ${parsed.data.status}.` });
  revalidateInventory();
  revalidatePath(`/admin/applications/${parsed.data.id}`);
}

export async function addApplicationNote(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = applicationNoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      note: parsed.data.note
    }
  });

  await writeAuditLog({ actor, action: AuditAction.NOTE, entityType: "Application", entityId: parsed.data.applicationId, message: "Added internal application note." });
  revalidateInventory();
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
}


export async function createDocumentRequest(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = documentRequestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.applicationId },
    select: { id: true, applicantName: true, applicantEmail: true }
  });
  if (!application) throw new Error("Application was not found.");

  const request = await prisma.documentRequest.create({
    data: {
      ...parsed.data,
      requestedById: actor.userId
    }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: application.id,
      note: `[Admin] Requested document: ${request.title}.`
    }
  });

  const emailResult = await sendEmail({
    to: application.applicantEmail,
    toName: application.applicantName,
    subject: `Document requested: ${request.title} - HomeBase MLS`,
    body: `Hello ${application.applicantName},\n\nA document has been requested for your HomeBase MLS application.\n\nRequested document: ${request.title}\nCategory: ${request.category.replaceAll("_", " ")}\n${request.instructions ? `Instructions: ${request.instructions}\n` : ""}\nSign in to upload the requested document: ${appUrl()}/applicant/applications/${application.id}\n\nThis message was generated automatically by HomeBase MLS.`
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "DocumentRequest",
    entityId: request.id,
    message: `Requested document ${request.title} for ${application.applicantName}.`,
    metadata: { emailDeliveryStatus: emailResult.ok ? "SENT" : "FAILED", emailProvider: emailResult.provider, emailError: emailResult.error }
  });
  revalidateInventory();
  revalidatePath(`/admin/applications/${application.id}`);
  redirect(`/admin/applications/${application.id}`);
}

export async function updateDocumentRequestStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = documentRequestStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const existing = await prisma.documentRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true, applicationId: true, fulfilledDocumentId: true, title: true }
  });
  if (!existing) throw new Error("Document request was not found.");

  await prisma.$transaction(async (tx) => {
    await tx.documentRequest.update({
      where: { id: parsed.data.requestId },
      data: {
        status: parsed.data.status,
        reviewNotes: parsed.data.reviewNotes
      }
    });

    if (existing.fulfilledDocumentId && parsed.data.status === DocumentRequestStatus.ACCEPTED) {
      await tx.document.update({ where: { id: existing.fulfilledDocumentId }, data: { status: DocumentStatus.ACCEPTED, notes: parsed.data.reviewNotes, reviewedById: actor.userId, reviewedAt: new Date() } });
    }

    if (existing.fulfilledDocumentId && parsed.data.status === DocumentRequestStatus.REJECTED) {
      await tx.document.update({ where: { id: existing.fulfilledDocumentId }, data: { status: DocumentStatus.REJECTED, notes: parsed.data.reviewNotes, reviewedById: actor.userId, reviewedAt: new Date() } });
    }
  });

  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "DocumentRequest", entityId: existing.id, message: `Changed document request ${existing.title} to ${parsed.data.status}.` });
  revalidateInventory();
  revalidatePath(`/admin/applications/${existing.applicationId}`);
  revalidatePath("/admin/documents");
}

export async function uploadAdminDocument(formData: FormData) {
  const user = await requireAdminAction();
  const parsed = documentUploadSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("A document file is required.");

  if (!parsed.data.applicationId && !parsed.data.propertyId && !parsed.data.unitId && !parsed.data.leasePacketId) {
    throw new Error("Attach this document to an application, property, unit, or lease packet.");
  }

  const [application, property, unit, leasePacket] = await Promise.all([
    parsed.data.applicationId
      ? prisma.application.findUnique({ where: { id: parsed.data.applicationId }, select: { id: true, unitId: true, unit: { select: { propertyId: true } } } })
      : null,
    parsed.data.propertyId
      ? prisma.property.findUnique({ where: { id: parsed.data.propertyId }, select: { id: true } })
      : null,
    parsed.data.unitId
      ? prisma.unit.findUnique({ where: { id: parsed.data.unitId }, select: { id: true, propertyId: true } })
      : null,
    parsed.data.leasePacketId
      ? prisma.leasePacket.findUnique({ where: { id: parsed.data.leasePacketId }, select: { id: true, applicationId: true, application: { select: { unitId: true, unit: { select: { propertyId: true } } } } } })
      : null
  ]);

  if (parsed.data.applicationId && !application) throw new Error("Application was not found.");
  if (parsed.data.propertyId && !property) throw new Error("Property was not found.");
  if (parsed.data.unitId && !unit) throw new Error("Unit was not found.");
  if (parsed.data.leasePacketId && !leasePacket) throw new Error("Lease packet was not found.");

  if (application && unit && application.unitId !== unit.id) {
    throw new Error("Selected application and unit do not match.");
  }

  if (application && property && application.unit.propertyId !== property.id) {
    throw new Error("Selected application and property do not match.");
  }

  if (unit && property && unit.propertyId !== property.id) {
    throw new Error("Selected unit and property do not match.");
  }

  if (leasePacket && application && leasePacket.applicationId !== application.id) {
    throw new Error("Selected lease packet and application do not match.");
  }

  if (leasePacket && unit && leasePacket.application.unitId !== unit.id) {
    throw new Error("Selected lease packet and unit do not match.");
  }

  if (leasePacket && property && leasePacket.application.unit.propertyId !== property.id) {
    throw new Error("Selected lease packet and property do not match.");
  }

  const stored = await saveUploadedDocument(file);

  const created = await prisma.document.create({
    data: {
      ...parsed.data,
      status: DocumentStatus.UPLOADED,
      uploadedById: user.userId,
      ...stored
    }
  });

  await writeAuditLog({ actor: user, action: AuditAction.UPLOAD, entityType: "Document", entityId: created.id, message: `Uploaded document ${created.title}.` });
  revalidateInventory();
  revalidatePath("/admin/documents");
  if (parsed.data.applicationId) revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  if (parsed.data.leasePacketId) revalidatePath(`/admin/leases/${parsed.data.leasePacketId}`);
  redirect(parsed.data.leasePacketId ? `/admin/leases/${parsed.data.leasePacketId}` : parsed.data.applicationId ? `/admin/applications/${parsed.data.applicationId}` : "/admin/documents");
}

export async function updateDocumentStatus(formData: FormData) {
  const user = await requireAdminAction();
  const parsed = documentStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const document = await prisma.document.update({
    where: { id: parsed.data.documentId },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      reviewedById: user.userId,
      reviewedAt: new Date()
    },
    select: { applicationId: true, leasePacketId: true }
  });

  await writeAuditLog({ actor: user, action: AuditAction.STATUS_CHANGE, entityType: "Document", entityId: parsed.data.documentId, message: `Changed document status to ${parsed.data.status}.` });
  revalidateInventory();
  revalidatePath("/admin/documents");
  if (document.applicationId) revalidatePath(`/admin/applications/${document.applicationId}`);
  if (document.leasePacketId) revalidatePath(`/admin/leases/${document.leasePacketId}`);
}

export async function deleteDocument(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = deleteDocumentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const document = await prisma.document.findUnique({ where: { id: parsed.data.documentId }, select: { storagePath: true, applicationId: true, leasePacketId: true } });
  if (!document) throw new Error("Document was not found.");

  await prisma.document.delete({ where: { id: parsed.data.documentId } });
  await removeStoredDocument(document.storagePath);

  await writeAuditLog({ actor, action: AuditAction.DELETE, entityType: "Document", entityId: parsed.data.documentId, message: "Deleted document record and removed stored file." });
  revalidateInventory();
  revalidatePath("/admin/documents");
  if (document.applicationId) revalidatePath(`/admin/applications/${document.applicationId}`);
  if (document.leasePacketId) revalidatePath(`/admin/leases/${document.leasePacketId}`);
}


export async function createLeaseTemplate(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leaseTemplateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const template = await prisma.leaseTemplate.create({ data: parsed.data });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "LeaseTemplate", entityId: template.id, message: `Created lease template ${template.name}.` });
  revalidatePath("/admin/leases");
  revalidatePath("/admin/leases/templates");
  redirect("/admin/leases/templates");
}

export async function updateLeaseTemplate(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Lease template ID");
  const parsed = leaseTemplateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const template = await prisma.leaseTemplate.update({ where: { id }, data: parsed.data });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "LeaseTemplate", entityId: template.id, message: `Updated lease template ${template.name}.` });
  revalidatePath("/admin/leases");
  revalidatePath("/admin/leases/templates");
}

export async function createLeaseFromApplication(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = createLeasePacketSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.applicationId },
    include: { unit: { include: { property: true } } }
  });
  if (!application) throw new Error("Application was not found.");
  if (application.status !== ApplicationStatus.APPROVED) {
    throw new Error("A lease packet can only be created after the application is approved.");
  }

  const template = await prisma.leaseTemplate.findFirst({ where: { id: parsed.data.templateId, isActive: true }, select: { id: true, name: true } });
  if (!template) throw new Error("Selected lease template was not found or is inactive.");

  const packet = await prisma.leasePacket.create({
    data: {
      applicationId: parsed.data.applicationId,
      templateId: parsed.data.templateId,
      leaseStartDate: parsed.data.leaseStartDate,
      leaseEndDate: parsed.data.leaseEndDate,
      monthlyRent: parsed.data.monthlyRent,
      securityDeposit: parsed.data.securityDeposit,
      terms: parsed.data.terms,
      notes: parsed.data.notes
    }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: application.id,
      note: `[Admin] Created lease packet from template ${template.name}.`
    }
  });

  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "LeasePacket", entityId: packet.id, message: `Created lease packet for ${application.applicantName}.`, metadata: { applicationId: application.id, templateId: template.id } });
  revalidateInventory();
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/applications/${application.id}`);
  redirect(`/admin/leases/${packet.id}`);
}

export async function updateLeasePacket(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = updateLeasePacketSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const existingPacket = await prisma.leasePacket.findUnique({
    where: { id: parsed.data.leasePacketId },
    select: { id: true, status: true, lockedAt: true }
  });
  if (!existingPacket) throw new Error("Lease packet was not found.");
  if (LOCKED_LEASE_PACKET_STATUSES.includes(existingPacket.status)) {
    throw new Error("This lease packet is locked. Void and reissue it before changing lease terms.");
  }

  const packet = await prisma.leasePacket.update({
    where: { id: parsed.data.leasePacketId },
    data: {
      leaseStartDate: parsed.data.leaseStartDate,
      leaseEndDate: parsed.data.leaseEndDate,
      monthlyRent: parsed.data.monthlyRent,
      securityDeposit: parsed.data.securityDeposit,
      terms: parsed.data.terms,
      notes: parsed.data.notes
    },
    select: { id: true, applicationId: true }
  });

  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "LeasePacket", entityId: packet.id, message: "Updated lease packet terms." });
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${packet.id}`);
  revalidatePath(`/admin/applications/${packet.applicationId}`);
}

export async function updateLeasePacketStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leasePacketStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  if (parsed.data.status === LeasePacketStatus.COMPLETED) {
    throw new Error("Lease packets are completed automatically when required signatures are complete.");
  }

  const existingPacket = await prisma.leasePacket.findUnique({ where: { id: parsed.data.leasePacketId }, select: { status: true } });
  if (!existingPacket) throw new Error("Lease packet was not found.");
  if (existingPacket.status === LeasePacketStatus.COMPLETED && parsed.data.status !== LeasePacketStatus.VOIDED) {
    throw new Error("Completed lease packets can only be voided and reissued.");
  }

  const now = new Date();
  const packet = await prisma.leasePacket.update({
    where: { id: parsed.data.leasePacketId },
    data: {
      status: parsed.data.status,
      approvedAt: parsed.data.status === LeasePacketStatus.APPROVED ? now : null,
      voidedAt: parsed.data.status === LeasePacketStatus.VOIDED ? now : null,
      lockedAt: parsed.data.status === LeasePacketStatus.VOIDED ? now : undefined
    },
    select: { id: true, applicationId: true }
  });

  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "LeasePacket", entityId: packet.id, message: `Changed lease packet status to ${parsed.data.status}.` });
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${packet.id}`);
  revalidatePath(`/admin/applications/${packet.applicationId}`);
}


export async function generateLeasePacketPdf(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Lease packet ID");

  const packet = await prisma.leasePacket.findUnique({
    where: { id },
    include: {
      template: true,
      application: {
        include: {
          applicantUser: true,
          unit: { include: { property: { include: { owner: true } } } }
        }
      }
    }
  });

  if (!packet) throw new Error("Lease packet was not found.");
  if (packet.status === LeasePacketStatus.VOIDED) throw new Error("Voided lease packets cannot generate new PDFs.");

  const renderedLease = renderLeaseTemplate(packet);
  const safeApplicantName = packet.application.applicantName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "applicant";
  const originalName = `lease-packet-${safeApplicantName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdf = await createTextPdfBuffer({
    title: `Lease Packet - ${packet.application.applicantName}`,
    body: renderedLease,
    subject: "Generated lease packet",
    keywords: ["lease", "packet", packet.applicationId]
  });
  const stored = await saveGeneratedDocument(pdf, originalName, "application/pdf");

  const document = await prisma.document.create({
    data: {
      title: `Generated lease packet - ${packet.application.applicantName}`,
      category: DocumentCategory.LEASE,
      status: DocumentStatus.REVIEWED,
      visibility: DocumentVisibility.APPLICANT,
      applicationId: packet.applicationId,
      propertyId: packet.application.unit.propertyId,
      unitId: packet.application.unitId,
      leasePacketId: packet.id,
      uploadedById: actor.userId,
      notes: "System-generated PDF from the current lease packet preview. Regenerate a new version if lease terms change.",
      ...stored
    }
  });

  await prisma.leaseNote.create({
    data: {
      leasePacketId: packet.id,
      note: `[System] Generated lease PDF document ${document.originalName}.`
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "LeasePdf",
    entityId: document.id,
    message: `Generated lease PDF for ${packet.application.applicantName}.`,
    metadata: { leasePacketId: packet.id, applicationId: packet.applicationId, documentId: document.id }
  });

  revalidateInventory();
  revalidatePath("/admin/documents");
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${packet.id}`);
  revalidatePath(`/admin/applications/${packet.applicationId}`);
  redirect(`/admin/leases/${packet.id}`);
}

export async function addLeasePacketNote(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leaseNoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const packet = await prisma.leasePacket.findUnique({ where: { id: parsed.data.leasePacketId }, select: { id: true, applicationId: true } });
  if (!packet) throw new Error("Lease packet was not found.");

  await prisma.leaseNote.create({ data: { leasePacketId: parsed.data.leasePacketId, note: parsed.data.note } });
  await writeAuditLog({ actor, action: AuditAction.NOTE, entityType: "LeasePacket", entityId: parsed.data.leasePacketId, message: "Added internal lease note." });
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${packet.id}`);
  revalidatePath(`/admin/applications/${packet.applicationId}`);
}


export async function prepareLeaseForSignatures(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leaseSignaturePrepareSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const packet = await prisma.leasePacket.findUnique({
    where: { id: parsed.data.leasePacketId },
    include: {
      application: {
        include: {
          applicantUser: true,
          unit: { include: { property: { include: { owner: true } } } }
        }
      },
      signatureRequests: true
    }
  });

  if (!packet) throw new Error("Lease packet was not found.");
  if (packet.status === LeasePacketStatus.VOIDED) throw new Error("Voided lease packets cannot be sent for signature.");
  if (packet.status === LeasePacketStatus.COMPLETED) throw new Error("Completed lease packets cannot be sent again.");
  if (packet.status === LeasePacketStatus.SENT_FOR_SIGNATURE && packet.signatureRequests.some((request) => request.status === SignatureStatus.SIGNED)) {
    throw new Error("This packet already has completed signatures. Reissue the lease packet instead of resending it.");
  }

  const applicant = packet.application.applicantUser;
  const landlord = packet.application.unit.property.owner;
  const expiresAt = defaultSignatureExpirationDate(parsed.data.expiresInDays);
  const preparedRequests = [] as Array<{
    leasePacketId: string;
    signerRole: SignatureRole;
    signerUserId?: string | null;
    signerName: string;
    signerEmail: string;
    expiresAt: Date;
  }>;

  preparedRequests.push({
    leasePacketId: packet.id,
    signerRole: SignatureRole.TENANT,
    signerUserId: applicant?.id ?? null,
    signerName: applicant?.name ?? packet.application.applicantName,
    signerEmail: applicant?.email ?? packet.application.applicantEmail,
    expiresAt
  });

  if (landlord?.email) {
    preparedRequests.push({
      leasePacketId: packet.id,
      signerRole: SignatureRole.LANDLORD,
      signerUserId: landlord.id,
      signerName: landlord.name ?? landlord.email,
      signerEmail: landlord.email,
      expiresAt
    });
  }

  const queuedRequests = [];
  for (const request of preparedRequests) {
    const savedRequest = await prisma.signatureRequest.upsert({
      where: {
        id: packet.signatureRequests.find((existing) => existing.signerRole === request.signerRole && existing.signerEmail === request.signerEmail)?.id ?? "missing"
      },
      update: {
        signerUserId: request.signerUserId,
        signerName: request.signerName,
        status: SignatureStatus.PENDING,
        signatureText: null,
        signedAt: null,
        declinedAt: null,
        ipAddress: null,
        userAgent: null,
        electronicConsentAccepted: false,
        electronicConsentText: null,
        electronicConsentAcceptedAt: null,
        documentTextHash: null,
        signatureEvidenceHash: null,
        finalPdfHash: null,
        expiresAt: request.expiresAt,
        reminderCount: 0,
        lastReminderAt: null
      },
      create: request
    });
    queuedRequests.push(savedRequest);
  }

  for (const request of queuedRequests) {
    await queueSignatureNotification({ request, type: SignatureNotificationType.INITIAL, actor });
  }

  await prisma.leasePacket.update({
    where: { id: packet.id },
    data: { status: LeasePacketStatus.SENT_FOR_SIGNATURE, sentForSignatureAt: new Date(), lockedAt: new Date() }
  });

  await prisma.leaseNote.create({
    data: {
      leasePacketId: packet.id,
      note: `[Admin] Sent lease packet for signature. ${preparedRequests.length} signature request(s) are pending and expire on ${expiresAt.toLocaleDateString()}.`
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.SEND,
    entityType: "LeasePacket",
    entityId: packet.id,
    message: `Sent lease packet for signature for ${packet.application.applicantName}.`,
    metadata: { applicationId: packet.applicationId, signatureRequestCount: preparedRequests.length, expiresAt: expiresAt.toISOString(), lockedAt: new Date().toISOString() }
  });

  await writeSecurityEvent({
    type: SecurityEventType.SIGNATURE_REQUESTED,
    userId: actor.userId,
    email: actor.email,
    message: "Lease packet sent for electronic signature.",
    metadata: { leasePacketId: packet.id, applicationId: packet.applicationId, signatureRequestCount: preparedRequests.length, expiresAt: expiresAt.toISOString() }
  });

  revalidateInventory();
  revalidatePath(`/admin/leases/${packet.id}`);
  revalidatePath(`/admin/applications/${packet.applicationId}`);
  redirect(`/admin/leases/${packet.id}`);
}


export async function queueSignatureReminder(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = signatureReminderSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const request = await prisma.signatureRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { leasePacket: { select: { id: true, applicationId: true, status: true } } }
  });
  if (!request) throw new Error("Signature request was not found.");
  if (request.status !== SignatureStatus.PENDING) throw new Error("Only pending signature requests can receive reminders.");
  if (request.leasePacket.status !== LeasePacketStatus.SENT_FOR_SIGNATURE) throw new Error("This lease packet is not currently awaiting signatures.");

  await queueSignatureNotification({ request, type: parsed.data.type, actor });
  await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[Admin] Queued ${parsed.data.type.toLowerCase().replaceAll("_", " ")} notification for ${request.signerEmail}.` } });

  revalidateInventory();
  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/leases/${request.leasePacketId}`);
}

export async function extendSignatureExpiration(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = signatureExpirationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const request = await prisma.signatureRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { leasePacket: { select: { id: true, applicationId: true, status: true } } }
  });
  if (!request) throw new Error("Signature request was not found.");
  if (request.status !== SignatureStatus.PENDING) throw new Error("Only pending signature requests can be extended.");

  const expiresAt = defaultSignatureExpirationDate(parsed.data.extendDays);
  await prisma.signatureRequest.update({ where: { id: request.id }, data: { expiresAt } });
  await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[Admin] Extended signature request for ${request.signerEmail} to ${expiresAt.toLocaleDateString()}.` } });
  await writeSecurityEvent({ type: SecurityEventType.SIGNATURE_EXPIRATION_EXTENDED, userId: actor.userId, email: request.signerEmail, message: `Signature expiration extended for ${request.signerEmail}.`, metadata: { signatureRequestId: request.id, leasePacketId: request.leasePacketId, expiresAt: expiresAt.toISOString() } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "SignatureRequest", entityId: request.id, message: `Extended signature request expiration for ${request.signerEmail}.`, metadata: { leasePacketId: request.leasePacketId, expiresAt: expiresAt.toISOString() } });

  revalidateInventory();
  revalidatePath(`/admin/leases/${request.leasePacketId}`);
}

export async function expireOverdueSignatureRequests() {
  const actor = await requireAdminAction();
  const now = new Date();
  const requests = await prisma.signatureRequest.findMany({
    where: { status: SignatureStatus.PENDING, expiresAt: { lt: now } },
    include: { leasePacket: { select: { id: true, applicationId: true } } }
  });

  for (const request of requests) {
    await prisma.signatureRequest.update({ where: { id: request.id }, data: { status: SignatureStatus.EXPIRED } });
    await queueSignatureNotification({ request, type: SignatureNotificationType.EXPIRED, actor });
    await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[System] Signature request for ${request.signerEmail} expired.` } });
    await writeSecurityEvent({ type: SecurityEventType.SIGNATURE_EXPIRED, userId: actor.userId, email: request.signerEmail, message: `Signature request expired for ${request.signerEmail}.`, metadata: { signatureRequestId: request.id, leasePacketId: request.leasePacketId } });
    await writeAuditLog({ actor, action: AuditAction.EXPIRE, entityType: "SignatureRequest", entityId: request.id, message: `Expired signature request for ${request.signerEmail}.`, metadata: { leasePacketId: request.leasePacketId } });
  }

  revalidateInventory();
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/leases");
}

export async function sendQueuedSignatureNotifications() {
  const actor = await requireAdminAction();
  const results = await sendQueuedSignatureNotificationEmails(50);

  await writeAuditLog({
    actor,
    action: AuditAction.SEND,
    entityType: "SignatureNotification",
    entityId: "batch",
    message: `Attempted email delivery for ${results.length} queued signature notification(s).`,
    metadata: { attempted: results.length, sent: results.filter((item) => item.status === "SENT").length, failed: results.filter((item) => item.status === "FAILED").length }
  });

  revalidatePath("/admin/notifications");
}

export async function requeueFailedSignatureNotifications() {
  const actor = await requireAdminAction();
  const result = await prisma.signatureNotification.updateMany({
    where: { status: SignatureNotificationStatus.FAILED },
    data: { status: SignatureNotificationStatus.QUEUED, failedAt: null, failureReason: null, nextAttemptAt: new Date() }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "SignatureNotification",
    entityId: "failed-batch",
    message: `Requeued ${result.count} failed signature notification(s).`,
    metadata: { requeued: result.count }
  });

  revalidatePath("/admin/notifications");
}

export async function sendSignatureNotificationNow(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Notification ID");
  const notification = await sendSignatureNotificationEmail(id);

  await writeAuditLog({
    actor,
    action: AuditAction.SEND,
    entityType: "SignatureNotification",
    entityId: notification.id,
    message: `Attempted email delivery for ${notification.recipientEmail}.`,
    metadata: { status: notification.status, provider: notification.provider, providerMessageId: notification.providerMessageId, failureReason: notification.failureReason }
  });

  revalidatePath("/admin/notifications");
}


export async function refreshLeaseAutomation(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Lease packet ID");

  await syncLeaseCompletion({ leasePacketId: id, actor });

  revalidateInventory();
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${id}`);
}

export async function renewExpiredSignatureRequest(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = signatureExpirationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const existing = await prisma.signatureRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { leasePacket: true }
  });

  if (!existing) throw new Error("Signature request was not found.");
  if (existing.status === SignatureStatus.SIGNED) throw new Error("Signed requests cannot be renewed.");
  if (existing.leasePacket.status === LeasePacketStatus.VOIDED || existing.leasePacket.status === LeasePacketStatus.COMPLETED) {
    throw new Error("Signature requests on completed or voided lease packets cannot be renewed. Reissue the packet instead.");
  }

  const expiresAt = defaultSignatureExpirationDate(parsed.data.extendDays);
  const request = await prisma.signatureRequest.update({
    where: { id: existing.id },
    data: {
      status: SignatureStatus.PENDING,
      expiresAt,
      signatureText: null,
      signedAt: null,
      declinedAt: null,
      ipAddress: null,
      userAgent: null,
      electronicConsentAccepted: false,
      electronicConsentText: null,
      electronicConsentAcceptedAt: null,
      documentTextHash: null,
      signatureEvidenceHash: null,
      finalPdfHash: null
    }
  });

  await prisma.leasePacket.update({
    where: { id: existing.leasePacketId },
    data: { status: LeasePacketStatus.SENT_FOR_SIGNATURE, completedAt: null, finalDocumentId: null, finalPdfGeneratedAt: null }
  });

  await queueSignatureNotification({ request, type: SignatureNotificationType.INITIAL, actor });
  await prisma.leaseNote.create({ data: { leasePacketId: request.leasePacketId, note: `[Admin] Renewed signature request for ${request.signerEmail}. New expiration: ${expiresAt.toLocaleDateString()}.` } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "SignatureRequest", entityId: request.id, message: `Renewed signature request for ${request.signerEmail}.`, metadata: { leasePacketId: request.leasePacketId, expiresAt: expiresAt.toISOString() } });

  revalidatePath("/admin/leases");
  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/leases/${request.leasePacketId}`);
}

export async function generateFinalSignedLeasePdf(formData: FormData) {
  const actor = await requireAdminAction();
  const id = getRequiredId(formData, "Lease packet ID");

  await generateFinalSignedLeaseDocument({ leasePacketId: id, actor });

  revalidateInventory();
  revalidatePath("/admin/documents");
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${id}`);
  redirect(`/admin/leases/${id}`);
}

export async function reissueLeasePacket(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leaseReissueSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const oldPacket = await prisma.leasePacket.findUnique({
    where: { id: parsed.data.leasePacketId },
    include: { signatureRequests: true }
  });
  if (!oldPacket) throw new Error("Lease packet was not found.");
  if (oldPacket.status === LeasePacketStatus.DRAFT) throw new Error("Draft packets do not need to be reissued.");

  const replacement = await prisma.$transaction(async (tx) => {
    await tx.signatureRequest.updateMany({
      where: { leasePacketId: oldPacket.id, status: SignatureStatus.PENDING },
      data: { status: SignatureStatus.VOIDED }
    });

    await tx.leasePacket.update({
      where: { id: oldPacket.id },
      data: { status: LeasePacketStatus.VOIDED, voidedAt: new Date(), lockedAt: oldPacket.lockedAt ?? new Date(), reissueReason: parsed.data.reason }
    });

    const created = await tx.leasePacket.create({
      data: {
        applicationId: oldPacket.applicationId,
        templateId: oldPacket.templateId,
        status: LeasePacketStatus.DRAFT,
        leaseStartDate: oldPacket.leaseStartDate,
        leaseEndDate: oldPacket.leaseEndDate,
        monthlyRent: oldPacket.monthlyRent,
        securityDeposit: oldPacket.securityDeposit,
        terms: oldPacket.terms,
        notes: oldPacket.notes,
        reissuedFromId: oldPacket.id,
        reissueReason: parsed.data.reason
      }
    });

    await tx.leaseNote.create({ data: { leasePacketId: oldPacket.id, note: `[Admin] Lease packet voided and reissued. Reason: ${parsed.data.reason}` } });
    await tx.leaseNote.create({ data: { leasePacketId: created.id, note: `[System] Reissued from lease packet ${oldPacket.id}. Reason: ${parsed.data.reason}` } });
    return created;
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "LeaseReissue",
    entityId: replacement.id,
    message: "Voided old lease packet and created replacement draft.",
    metadata: { oldLeasePacketId: oldPacket.id, replacementLeasePacketId: replacement.id, reason: parsed.data.reason }
  });

  await writeSecurityEvent({
    type: SecurityEventType.LEASE_REISSUED,
    userId: actor.userId,
    email: actor.email,
    message: "Lease packet was voided and reissued.",
    metadata: { oldLeasePacketId: oldPacket.id, replacementLeasePacketId: replacement.id }
  });

  revalidateInventory();
  revalidatePath("/admin/leases");
  revalidatePath(`/admin/applications/${oldPacket.applicationId}`);
  redirect(`/admin/leases/${replacement.id}`);
}

export async function voidSignatureRequest(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = leaseSignatureStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  if (parsed.data.status !== SignatureStatus.VOIDED) throw new Error("Admin signature request action currently only supports voiding.");

  const request = await prisma.signatureRequest.update({
    where: { id: parsed.data.requestId },
    data: { status: SignatureStatus.VOIDED },
    include: { leasePacket: true }
  });

  await prisma.signatureNotification.updateMany({
    where: { signatureRequestId: request.id, status: "QUEUED" },
    data: { status: "CANCELLED" }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "SignatureRequest",
    entityId: request.id,
    message: `Voided ${request.signerRole.toLowerCase()} signature request for ${request.signerEmail}.`,
    metadata: { leasePacketId: request.leasePacketId }
  });

  revalidatePath("/admin/leases");
  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/leases/${request.leasePacketId}`);
}

export async function createInspection(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = inspectionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitId }, include: { property: true } });
  if (!unit || unit.status === UnitStatus.ARCHIVED || unit.property.isArchived) throw new Error("Selected unit is not available for inspection scheduling.");

  if (parsed.data.applicationId) {
    const app = await prisma.application.findFirst({ where: { id: parsed.data.applicationId, unitId: unit.id }, select: { id: true } });
    if (!app) throw new Error("Selected application does not match the selected unit.");
  }

  const inspection = await prisma.inspection.create({
    data: {
      unitId: parsed.data.unitId,
      applicationId: parsed.data.applicationId,
      assignedToId: parsed.data.assignedToId,
      scheduledFor: parsed.data.scheduledFor,
      inspectorName: parsed.data.inspectorName,
      notes: parsed.data.notes,
      checklistItems: {
        create: [
          { label: "Unit is safe, sanitary, and ready for occupancy", sortOrder: 10 },
          { label: "Smoke/CO detectors are present and functional", sortOrder: 20 },
          { label: "Utilities and major systems are functional", sortOrder: 30 },
          { label: "No visible health or safety hazards", sortOrder: 40 }
        ]
      }
    }
  });

  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "Inspection", entityId: inspection.id, message: `Scheduled inspection for Unit ${unit.unitNumber}.` });
  await writeSecurityEvent({ type: SecurityEventType.INSPECTION_SCHEDULED, userId: actor.userId, email: actor.email, message: `Inspection scheduled for ${unit.property.name} Unit ${unit.unitNumber}.` });
  revalidatePath("/admin/inspections");
  revalidatePath(`/admin/inspections/${inspection.id}`);
  redirect(`/admin/inspections/${inspection.id}`);
}

export async function updateInspectionStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = inspectionStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const completedStatuses: InspectionStatus[] = [InspectionStatus.PASSED, InspectionStatus.FAILED, InspectionStatus.NEEDS_REINSPECTION, InspectionStatus.CANCELLED];
  const inspection = await prisma.inspection.update({
    where: { id: parsed.data.inspectionId },
    data: {
      status: parsed.data.status,
      resultSummary: parsed.data.resultSummary,
      notes: parsed.data.notes,
      completedAt: completedStatuses.includes(parsed.data.status) ? new Date() : null
    },
    include: { unit: { include: { property: true } } }
  });

  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "Inspection", entityId: inspection.id, message: `Updated inspection status to ${parsed.data.status}.` });
  if (completedStatuses.includes(parsed.data.status)) {
    await writeSecurityEvent({ type: SecurityEventType.INSPECTION_COMPLETED, userId: actor.userId, email: actor.email, message: `Inspection ${inspection.id} completed with status ${parsed.data.status}.` });
  }
  revalidatePath("/admin/inspections");
  revalidatePath(`/admin/inspections/${inspection.id}`);
}

export async function addInspectionChecklistItem(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = inspectionChecklistItemSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const item = await prisma.inspectionChecklistItem.create({ data: parsed.data });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "InspectionChecklistItem", entityId: item.id, message: `Added inspection checklist item.` });
  revalidatePath(`/admin/inspections/${parsed.data.inspectionId}`);
}

export async function updateInspectionChecklistItem(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = inspectionChecklistStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const item = await prisma.inspectionChecklistItem.update({ where: { id: parsed.data.itemId }, data: { status: parsed.data.status, notes: parsed.data.notes } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "InspectionChecklistItem", entityId: item.id, message: `Updated inspection checklist item.` });
  revalidatePath(`/admin/inspections/${item.inspectionId}`);
}


function revalidateLedgerPaths(applicationId?: string | null, unitId?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/ledger");
  revalidatePath("/landlord/ledger");
  revalidatePath("/applicant/ledger");
  if (applicationId) {
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath(`/applicant/applications/${applicationId}`);
    revalidatePath(`/landlord/applications/${applicationId}`);
  }
  if (unitId) {
    revalidatePath(`/admin/units/${unitId}/edit`);
    revalidatePath(`/landlord/units/${unitId}/edit`);
  }
}

async function validateLedgerRelationships(applicationId: string | null, unitId: string, tenantUserId: string | null) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { property: true } });
  if (!unit || unit.status === UnitStatus.ARCHIVED || unit.property.isArchived) {
    throw new Error("Selected unit is not available for ledger entries.");
  }

  if (applicationId) {
    const application = await prisma.application.findFirst({ where: { id: applicationId, unitId }, select: { id: true, applicantUserId: true } });
    if (!application) throw new Error("Selected application must match the selected unit.");
    if (tenantUserId && application.applicantUserId && tenantUserId !== application.applicantUserId) {
      throw new Error("Selected tenant/applicant user does not match the selected application.");
    }
  }

  if (tenantUserId) {
    const user = await prisma.user.findFirst({ where: { id: tenantUserId, role: { in: [UserRole.APPLICANT, UserRole.TENANT] }, isActive: true }, select: { id: true } });
    if (!user) throw new Error("Selected tenant/applicant user must be an active applicant or tenant account.");
  }
}

export async function createLedgerEntry(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = ledgerEntrySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await validateLedgerRelationships(parsed.data.applicationId, parsed.data.unitId, parsed.data.tenantUserId);

  const entry = await prisma.ledgerEntry.create({
    data: {
      applicationId: parsed.data.applicationId,
      unitId: parsed.data.unitId,
      tenantUserId: parsed.data.tenantUserId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description,
      memo: parsed.data.memo,
      dueDate: parsed.data.dueDate,
      paidAt: parsed.data.paidAt,
      paymentMethod: parsed.data.paymentMethod,
      createdById: actor.userId
    },
    include: { unit: { include: { property: true } }, application: true }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "LedgerEntry",
    entityId: entry.id,
    message: `Created ${entry.type.toLowerCase()} ledger entry for ${entry.unit.property.name} Unit ${entry.unit.unitNumber}.`,
    metadata: { amount: entry.amount, applicationId: entry.applicationId, unitId: entry.unitId }
  });

  revalidateLedgerPaths(entry.applicationId, entry.unitId);
  redirect("/admin/ledger");
}

export async function voidLedgerEntry(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = ledgerVoidSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const entry = await prisma.ledgerEntry.update({
    where: { id: parsed.data.ledgerEntryId },
    data: { status: LedgerEntryStatus.VOIDED, voidedAt: new Date(), voidReason: parsed.data.voidReason },
    include: { unit: { include: { property: true } } }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "LedgerEntry",
    entityId: entry.id,
    message: `Voided ledger entry for ${entry.unit.property.name} Unit ${entry.unit.unitNumber}.`,
    metadata: { amount: entry.amount, type: entry.type, reason: parsed.data.voidReason }
  });

  revalidateLedgerPaths(entry.applicationId, entry.unitId);
  revalidatePath(`/admin/ledger/${entry.id}`);
}

function revalidateRecurringChargePaths(scheduleId?: string | null) {
  revalidatePath("/admin/ledger");
  revalidatePath("/admin/ledger/schedules");
  revalidatePath("/landlord/ledger");
  revalidatePath("/applicant/ledger");
  if (scheduleId) revalidatePath(`/admin/ledger/schedules/${scheduleId}`);
}

export async function createRecurringChargeSchedule(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = recurringChargeScheduleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await validateLedgerRelationships(parsed.data.applicationId, parsed.data.unitId, parsed.data.tenantUserId);

  const firstRunCandidate = new Date(parsed.data.startDate.getFullYear(), parsed.data.startDate.getMonth(), parsed.data.dayOfMonth);
  const nextRunDate = firstRunCandidate >= parsed.data.startDate ? firstRunCandidate : nextMonthlyRunDate(parsed.data.startDate, parsed.data.dayOfMonth);

  const schedule = await prisma.recurringChargeSchedule.create({
    data: {
      applicationId: parsed.data.applicationId,
      unitId: parsed.data.unitId,
      tenantUserId: parsed.data.tenantUserId,
      name: parsed.data.name,
      description: parsed.data.description,
      frequency: parsed.data.frequency,
      amount: parsed.data.amount,
      tenantPortionAmount: parsed.data.tenantPortionAmount,
      subsidyPortionAmount: parsed.data.subsidyPortionAmount,
      dayOfMonth: parsed.data.dayOfMonth,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      nextRunDate,
      createdById: actor.userId
    },
    include: { unit: { include: { property: true } } }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "RecurringChargeSchedule",
    entityId: schedule.id,
    message: `Created recurring charge schedule for ${schedule.unit.property.name} Unit ${schedule.unit.unitNumber}.`,
    metadata: { amount: schedule.amount, dayOfMonth: schedule.dayOfMonth, applicationId: schedule.applicationId }
  });

  revalidateRecurringChargePaths(schedule.id);
  redirect("/admin/ledger/schedules");
}

export async function pauseRecurringChargeSchedule(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = recurringChargeScheduleIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const schedule = await prisma.recurringChargeSchedule.update({ where: { id: parsed.data.scheduleId }, data: { isActive: false } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "RecurringChargeSchedule", entityId: schedule.id, message: `Paused recurring charge schedule ${schedule.name}.` });
  revalidateRecurringChargePaths(schedule.id);
}

export async function resumeRecurringChargeSchedule(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = recurringChargeScheduleIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const schedule = await prisma.recurringChargeSchedule.findUnique({ where: { id: parsed.data.scheduleId } });
  if (!schedule) throw new Error("Recurring charge schedule was not found.");
  const nextRunDate = schedule.nextRunDate < new Date() ? nextMonthlyRunDate(new Date(), schedule.dayOfMonth) : schedule.nextRunDate;
  const updated = await prisma.recurringChargeSchedule.update({ where: { id: schedule.id }, data: { isActive: true, nextRunDate } });
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "RecurringChargeSchedule", entityId: updated.id, message: `Resumed recurring charge schedule ${updated.name}.` });
  revalidateRecurringChargePaths(updated.id);
}

export async function generateRecurringCharges(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = generateRecurringChargesSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const schedules = await prisma.recurringChargeSchedule.findMany({
    where: { isActive: true, nextRunDate: { lte: parsed.data.runThroughDate } },
    include: { unit: { include: { property: true } }, application: true, tenantUser: true }
  });

  let createdCount = 0;
  for (const schedule of schedules) {
    let cursor = schedule.nextRunDate;
    let lastRunDate: Date | null = null;
    while (isScheduleDue({ isActive: schedule.isActive, nextRunDate: cursor, endDate: schedule.endDate }, parsed.data.runThroughDate)) {
      const generatedForPeriod = recurringChargePeriodKey(cursor);
      const existing = await prisma.ledgerEntry.findFirst({
        where: {
          OR: [
            { generatedFromScheduleId: schedule.id, generatedForPeriod },
            {
              unitId: schedule.unitId,
              applicationId: schedule.applicationId,
              tenantUserId: schedule.tenantUserId,
              type: LedgerEntryType.CHARGE,
              dueDate: cursor,
              description: schedule.description,
              status: { not: LedgerEntryStatus.VOIDED }
            }
          ]
        },
        select: { id: true }
      });

      if (!existing) {
        try {
          await prisma.ledgerEntry.create({
            data: {
              applicationId: schedule.applicationId,
              unitId: schedule.unitId,
              tenantUserId: schedule.tenantUserId,
              type: LedgerEntryType.CHARGE,
              status: LedgerEntryStatus.POSTED,
              amount: schedule.amount,
              description: schedule.description,
              memo: `Generated from recurring schedule: ${schedule.name}${schedule.tenantPortionAmount !== null || schedule.subsidyPortionAmount !== null ? `
Tenant portion: $${((schedule.tenantPortionAmount ?? 0) / 100).toFixed(2)}
Subsidy portion: $${((schedule.subsidyPortionAmount ?? 0) / 100).toFixed(2)}` : ""}`,
              dueDate: cursor,
              generatedFromScheduleId: schedule.id,
              generatedForPeriod,
              createdById: actor.userId
            }
          });
          createdCount += 1;
        } catch (error: any) {
          if (error?.code !== "P2002") throw error;
        }
      }
      lastRunDate = cursor;
      cursor = advanceMonthlyRunDate(cursor, schedule.dayOfMonth);
    }

    await prisma.recurringChargeSchedule.update({ where: { id: schedule.id }, data: { lastRunDate, nextRunDate: cursor } });
  }

  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "LedgerEntry", entityId: "recurring-charge-run", message: `Generated ${createdCount} recurring charge ledger entr${createdCount === 1 ? "y" : "ies"}.`, metadata: { runThroughDate: parsed.data.runThroughDate.toISOString(), scheduleCount: schedules.length } });
  revalidateRecurringChargePaths();
  redirect("/admin/ledger/schedules");
}

function revalidatePaymentPlanPaths(planId?: string | null, applicationId?: string | null) {
  revalidatePath("/admin/ledger");
  revalidatePath("/admin/ledger/plans");
  revalidatePath("/admin/ledger/aging");
  revalidatePath("/applicant/ledger");
  revalidatePath("/landlord/ledger");
  if (planId) revalidatePath(`/admin/ledger/plans/${planId}`);
  if (applicationId) {
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath(`/applicant/applications/${applicationId}`);
    revalidatePath(`/landlord/applications/${applicationId}`);
  }
}

export async function createPaymentPlan(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = paymentPlanSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await validateLedgerRelationships(parsed.data.applicationId, parsed.data.unitId, parsed.data.tenantUserId);

  const count = plannedInstallmentCount(parsed.data.totalAmount, parsed.data.installmentAmount);
  if (count <= 0 || count > 60) throw new Error("Payment plans must create between 1 and 60 installments.");

  const plan = await prisma.paymentPlan.create({
    data: {
      applicationId: parsed.data.applicationId,
      unitId: parsed.data.unitId,
      tenantUserId: parsed.data.tenantUserId,
      name: parsed.data.name,
      totalAmount: parsed.data.totalAmount,
      installmentAmount: parsed.data.installmentAmount,
      dueDayOfMonth: parsed.data.dueDayOfMonth,
      startDate: parsed.data.startDate,
      endDate: addMonthsSafe(parsed.data.startDate, count - 1, parsed.data.dueDayOfMonth),
      notes: parsed.data.notes,
      createdById: actor.userId,
      installments: {
        create: Array.from({ length: count }, (_, index) => {
          const remainingBefore = parsed.data.totalAmount - parsed.data.installmentAmount * index;
          const amount = Math.min(parsed.data.installmentAmount, remainingBefore);
          return {
            dueDate: addMonthsSafe(parsed.data.startDate, index, parsed.data.dueDayOfMonth),
            amount
          };
        })
      }
    },
    include: { unit: { include: { property: true } }, installments: true }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.CREATE,
    entityType: "PaymentPlan",
    entityId: plan.id,
    message: `Created payment plan ${plan.name} for ${plan.unit.property.name} Unit ${plan.unit.unitNumber}.`,
    metadata: { totalAmount: plan.totalAmount, installmentCount: plan.installments.length, applicationId: plan.applicationId, unitId: plan.unitId }
  });

  revalidatePaymentPlanPaths(plan.id, plan.applicationId);
  redirect(`/admin/ledger/plans/${plan.id}`);
}

export async function updatePaymentPlanStatus(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = paymentPlanStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const now = new Date();
  const data: any = { status: parsed.data.status };
  if (parsed.data.status === PaymentPlanStatus.COMPLETED) data.completedAt = now;
  if (parsed.data.status === PaymentPlanStatus.CANCELLED) data.cancelledAt = now;
  if (parsed.data.status === PaymentPlanStatus.DEFAULTED) data.defaultedAt = now;

  const plan = await prisma.paymentPlan.update({ where: { id: parsed.data.paymentPlanId }, data, include: { unit: { include: { property: true } } } });
  if (parsed.data.note) {
    await prisma.auditLog.create({ data: { actorId: actor.userId, actorEmail: actor.email, actorRole: actor.role, action: AuditAction.NOTE, entityType: "PaymentPlan", entityId: plan.id, message: parsed.data.note } });
  }
  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "PaymentPlan", entityId: plan.id, message: `Updated payment plan ${plan.name} to ${plan.status}.` });
  revalidatePaymentPlanPaths(plan.id, plan.applicationId);
}

export async function updatePaymentPlanInstallment(formData: FormData) {
  const actor = await requireAdminAction();
  const parsed = paymentPlanInstallmentStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const existing = await prisma.paymentPlanInstallment.findUnique({ where: { id: parsed.data.installmentId }, include: { paymentPlan: true } });
  if (!existing) throw new Error("Payment plan installment was not found.");

  let linkedLedgerEntryId = existing.linkedLedgerEntryId;
  if (parsed.data.status === PaymentPlanInstallmentStatus.PAID && !linkedLedgerEntryId) {
    const entry = await prisma.ledgerEntry.create({
      data: {
        applicationId: existing.paymentPlan.applicationId,
        unitId: existing.paymentPlan.unitId,
        tenantUserId: existing.paymentPlan.tenantUserId,
        type: LedgerEntryType.PAYMENT,
        status: LedgerEntryStatus.POSTED,
        amount: existing.amount,
        description: `Payment plan installment - ${existing.paymentPlan.name}`,
        memo: parsed.data.notes,
        paidAt: parsed.data.paidAt ?? new Date(),
        createdById: actor.userId
      }
    });
    linkedLedgerEntryId = entry.id;
  }

  if (parsed.data.status !== PaymentPlanInstallmentStatus.PAID && linkedLedgerEntryId) {
    await prisma.ledgerEntry.updateMany({
      where: { id: linkedLedgerEntryId, status: { not: LedgerEntryStatus.VOIDED } },
      data: {
        status: LedgerEntryStatus.VOIDED,
        voidedAt: new Date(),
        voidReason: `Payment plan installment changed from paid to ${parsed.data.status.toLowerCase()}.`
      }
    });
    linkedLedgerEntryId = null;
  }

  const installment = await prisma.paymentPlanInstallment.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      paidAt: parsed.data.status === PaymentPlanInstallmentStatus.PAID ? (parsed.data.paidAt ?? new Date()) : null,
      linkedLedgerEntryId,
      notes: parsed.data.notes
    },
    include: { paymentPlan: { include: { installments: true } } }
  });

  const plan = installment.paymentPlan;
  const allPaidOrWaived = plan.installments.every((item) => item.id === installment.id ? PAID_OR_WAIVED_INSTALLMENT_STATUSES.includes(installment.status) : PAID_OR_WAIVED_INSTALLMENT_STATUSES.includes(item.status));
  if (allPaidOrWaived && plan.status === PaymentPlanStatus.ACTIVE) {
    await prisma.paymentPlan.update({ where: { id: plan.id }, data: { status: PaymentPlanStatus.COMPLETED, completedAt: new Date() } });
  }

  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "PaymentPlanInstallment", entityId: installment.id, message: `Updated payment plan installment to ${installment.status}.`, metadata: { paymentPlanId: plan.id, amount: installment.amount } });
  revalidatePaymentPlanPaths(plan.id, plan.applicationId);
  if (linkedLedgerEntryId) revalidateLedgerPaths(plan.applicationId, plan.unitId);
}
