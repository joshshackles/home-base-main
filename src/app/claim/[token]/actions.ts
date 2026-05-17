"use server";

import { redirect } from "next/navigation";
import { createDatabaseSession, getRequestClientMetadata, getVerifiedCurrentUser, setSessionCookie } from "@/lib/auth";
import { claimApplicationWithToken } from "@/lib/applicant-onboarding";
import { applicationClaimSchema, formDataToObject, validationMessage } from "@/lib/validation";

export async function claimApplicationAction(formData: FormData) {
  const parsed = applicationClaimSchema.safeParse(formDataToObject(formData));
  const token = String(formData.get("token") || "");

  if (!parsed.success) {
    redirect(`/claim/${encodeURIComponent(token)}?error=${encodeURIComponent(validationMessage(parsed.error))}`);
  }

  try {
    const currentUser = await getVerifiedCurrentUser();
    const { user, application } = await claimApplicationWithToken(
      { token: parsed.data.token, password: parsed.data.password ?? null },
      currentUser ? { userId: currentUser.userId, email: currentUser.email, role: currentUser.role, name: currentUser.name } : null
    );

    if (!currentUser) {
      const sessionToken = await createDatabaseSession({ userId: user.id, email: user.email, name: user.name, role: user.role }, getRequestClientMetadata());
      setSessionCookie(sessionToken);
    }

    redirect(`/applicant/applications/${application.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to claim this application.";
    redirect(`/claim/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
  }
}
