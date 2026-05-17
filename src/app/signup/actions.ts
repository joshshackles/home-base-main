"use server";

import { redirect } from "next/navigation";
import { AccountAccessType, AuditAction } from "@prisma/client";
import { createDatabaseSession, getRequestClientMetadata, setSessionCookie } from "@/lib/auth";
import { createApplicantAccountAndClaimMatches } from "@/lib/applicant-onboarding";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { formDataToObject, applicantSignupSchema, validationMessage } from "@/lib/validation";

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/applicant";
  if (value.startsWith("/admin") || value.startsWith("/landlord")) return "/applicant";
  return value;
}

export async function applicantSignupAction(formData: FormData) {
  const parsed = applicantSignupSchema.safeParse(formDataToObject(formData));
  const next = safeNextPath(String(formData.get("next") || "/applicant"));
  const requestLandlordAccess = formData.get("requestLandlordAccess") === "on";
  const landlordOrganization = String(formData.get("landlordOrganization") || "").trim();
  const landlordReason = String(formData.get("landlordReason") || "").trim();

  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent(validationMessage(parsed.error))}&next=${encodeURIComponent(next)}`);
  }

  try {
    const user = await createApplicantAccountAndClaimMatches(parsed.data);
    if (requestLandlordAccess) {
      const reason = landlordReason.length >= 10 ? landlordReason : "Requested landlord access during account signup.";
      await prisma.accountAccessRequest.create({
        data: {
          userId: user.id,
          type: AccountAccessType.LANDLORD,
          organization: landlordOrganization || null,
          reason
        }
      });
      await writeAuditLog({
        actor: { userId: user.id, email: user.email, role: user.role },
        action: AuditAction.CREATE,
        entityType: "AccountAccessRequest",
        message: "Requested landlord access during signup."
      });
    }
    const token = await createDatabaseSession({ userId: user.id, email: user.email, name: user.name, role: user.role }, getRequestClientMetadata());
    setSessionCookie(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Applicant signup failed.";
    redirect(`/signup?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
