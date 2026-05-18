"use server";

import { redirect } from "next/navigation";
import { AccountAccessType, AuditAction, UserRole } from "@prisma/client";
import {
  createDatabaseSession,
  getRequestClientMetadata,
  setSessionCookie,
} from "@/lib/auth";
import { createApplicantAccountAndClaimMatches } from "@/lib/applicant-onboarding";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  formDataToObject,
  applicantSignupSchema,
  validationMessage,
} from "@/lib/validation";
import { acceptVendorInvitation, getVendorInvitationForSignup } from "@/lib/vendor-invitations";

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/applicant";
  if (value.startsWith("/admin") || value.startsWith("/landlord"))
    return "/applicant";
  return value;
}

export async function applicantSignupAction(formData: FormData) {
  const parsed = applicantSignupSchema.safeParse(formDataToObject(formData));
  const next = safeNextPath(String(formData.get("next") || "/applicant"));
  const requestLandlordAccess = formData.get("requestLandlordAccess") === "on";
  const vendorInvite = String(formData.get("vendorInvite") || "").trim();
  const landlordOrganization = String(
    formData.get("landlordOrganization") || "",
  ).trim();
  const landlordReason = String(formData.get("landlordReason") || "").trim();

  if (!parsed.success) {
    redirect(
      `/signup?error=${encodeURIComponent(validationMessage(parsed.error))}&next=${encodeURIComponent(next)}`,
    );
  }

  try {
    if (vendorInvite) {
      const invitation = await getVendorInvitationForSignup(vendorInvite);
      if (!invitation) throw new Error("This vendor invitation is expired, already used, or invalid. Ask the landlord to send a new invitation.");
      if (invitation.email.toLowerCase() !== parsed.data.email.toLowerCase()) throw new Error("This vendor invitation was sent to a different email address.");
    }

    const user = await createApplicantAccountAndClaimMatches(parsed.data);
    if (vendorInvite) {
      await acceptVendorInvitation({
        token: vendorInvite,
        userId: user.id,
        email: user.email,
        name: user.name,
      });
      user.role = UserRole.VENDOR;
    }
    if (requestLandlordAccess && !vendorInvite) {
      const reason =
        landlordReason.length >= 10
          ? landlordReason
          : "Requested landlord access during account signup.";
      await prisma.accountAccessRequest.create({
        data: {
          userId: user.id,
          type: AccountAccessType.LANDLORD,
          organization: landlordOrganization || null,
          reason,
        },
      });
      await writeAuditLog({
        actor: { userId: user.id, email: user.email, role: user.role },
        action: AuditAction.CREATE,
        entityType: "AccountAccessRequest",
        message: "Requested landlord access during signup.",
      });
    }
    const token = await createDatabaseSession(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      getRequestClientMetadata(),
    );
    setSessionCookie(token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Applicant signup failed.";
    redirect(
      `/signup?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}
