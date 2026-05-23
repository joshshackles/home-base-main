import { ApplicationStatus, AuditAction, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSecureToken, hashToken, appUrl } from "@/lib/tokens";
import { writeAuditLog, type AuditActor } from "@/lib/audit";

export const CLAIM_TOKEN_DAYS_DEFAULT = 7;

export function applicationClaimUrl(token: string) {
  return `${appUrl()}/claim/${encodeURIComponent(token)}`;
}

export async function createApplicationClaimToken(applicationId: string, actor?: AuditActor | null, expiresInDays = CLAIM_TOKEN_DAYS_DEFAULT) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, applicantEmail: true, applicantUserId: true }
  });

  if (!application) throw new Error("Application was not found.");
  if (application.applicantUserId) throw new Error("This application is already linked to an applicant account.");

  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await prisma.applicationClaimToken.create({
    data: {
      applicationId: application.id,
      email: application.applicantEmail.toLowerCase(),
      tokenHash: hashToken(token),
      expiresAt,
      createdById: actor?.userId ?? null
    }
  });

  await prisma.applicationNote.create({
    data: {
      applicationId: application.id,
      note: `[System] Applicant claim link generated. It expires ${expiresAt.toLocaleString()}.`
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.SEND,
    entityType: "ApplicationClaimToken",
    entityId: application.id,
    message: `Generated applicant claim link for ${application.applicantEmail}.`,
    metadata: { expiresAt: expiresAt.toISOString() }
  });

  return { token, url: applicationClaimUrl(token), expiresAt };
}

export async function createApplicantAccountAndClaimMatches(input: { name: string; email: string; phone?: string | null; password: string }) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account already exists for this email. Sign in instead, then use Claim Matching Applications from your renter workspace.");

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name: input.name,
        role: UserRole.APPLICANT,
        isActive: true,
        passwordHash: hashPassword(input.password),
        forcePasswordReset: false,
        passwordChangedAt: new Date()
      }
    });

    await tx.applicantProfile.create({
      data: {
        userId: created.id,
        legalName: input.name,
        phone: input.phone ?? null
      }
    });

    await tx.application.updateMany({
      where: { applicantUserId: null, applicantEmail: email },
      data: { applicantUserId: created.id }
    });

    const matchedApplications = await tx.application.findMany({ where: { applicantUserId: created.id, applicantEmail: email }, select: { id: true } });
    if (matchedApplications.length > 0) {
      await tx.applicationNote.createMany({
        data: matchedApplications.map((application) => ({
          applicationId: application.id,
          note: "[System] Application automatically connected during applicant signup by matching email address."
        }))
      });
    }

    return created;
  });

  await writeAuditLog({
    actor: { userId: user.id, email: user.email, role: user.role },
    action: AuditAction.CREATE,
    entityType: "User",
    entityId: user.id,
    message: "Applicant created a portal account."
  });

  return user;
}

export async function claimApplicationWithToken(input: { token: string; password?: string | null }, currentUser?: { userId: string; email: string; role: UserRole; name: string | null } | null) {
  const tokenHash = hashToken(input.token);
  const claim = await prisma.applicationClaimToken.findUnique({
    where: { tokenHash },
    include: { application: true }
  });

  if (!claim || claim.claimedAt || claim.expiresAt < new Date()) {
    throw new Error("This claim link is expired, already used, or invalid. Ask the property team to generate a new claim link.");
  }

  let user = currentUser
    ? await prisma.user.findUnique({ where: { id: currentUser.userId } })
    : await prisma.user.findUnique({ where: { email: claim.email.toLowerCase() } });

  if (user && user.email.toLowerCase() !== claim.email.toLowerCase()) {
    throw new Error("You are signed in with a different email than the claim link. Sign out and use the applicant email for this application.");
  }

  if (!user) {
    if (!input.password) throw new Error("Create a password to claim this application.");
    user = await prisma.user.create({
      data: {
        email: claim.email.toLowerCase(),
        name: claim.application.applicantName,
        role: UserRole.APPLICANT,
        isActive: true,
        passwordHash: hashPassword(input.password),
        forcePasswordReset: false,
        passwordChangedAt: new Date(),
        applicantProfile: { create: { legalName: claim.application.applicantName, phone: claim.application.applicantPhone ?? null } }
      }
    });
  }

  const application = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: claim.applicationId },
      data: {
        applicantUserId: user!.id,
        applicantEmail: user!.email,
        applicantName: user!.name || claim.application.applicantName,
        status: claim.application.status === ApplicationStatus.STARTED ? ApplicationStatus.STARTED : claim.application.status
      }
    });

    await tx.applicationClaimToken.update({
      where: { id: claim.id },
      data: { claimedAt: new Date(), claimedById: user!.id }
    });

    await tx.applicationNote.create({
      data: {
        applicationId: updated.id,
        note: `[System] Application claimed by applicant portal account ${user!.email}.`
      }
    });

    return updated;
  });

  await writeAuditLog({
    actor: { userId: user.id, email: user.email, role: user.role },
    action: AuditAction.LINK,
    entityType: "Application",
    entityId: application.id,
    message: "Applicant claimed application with secure claim link."
  });

  return { user, application };
}
