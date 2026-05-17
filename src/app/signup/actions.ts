"use server";

import { redirect } from "next/navigation";
import { createDatabaseSession, getRequestClientMetadata, setSessionCookie } from "@/lib/auth";
import { createApplicantAccountAndClaimMatches } from "@/lib/applicant-onboarding";
import { formDataToObject, applicantSignupSchema, validationMessage } from "@/lib/validation";

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/applicant";
  if (value.startsWith("/admin") || value.startsWith("/landlord")) return "/applicant";
  return value;
}

export async function applicantSignupAction(formData: FormData) {
  const parsed = applicantSignupSchema.safeParse(formDataToObject(formData));
  const next = safeNextPath(String(formData.get("next") || "/applicant"));

  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent(validationMessage(parsed.error))}&next=${encodeURIComponent(next)}`);
  }

  try {
    const user = await createApplicantAccountAndClaimMatches(parsed.data);
    const token = await createDatabaseSession({ userId: user.id, email: user.email, name: user.name, role: user.role }, getRequestClientMetadata());
    setSessionCookie(token);
    redirect(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Applicant signup failed.";
    redirect(`/signup?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }
}
