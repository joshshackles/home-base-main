"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent, isHoneypotFilled, verifyTurnstileToken } from "@/lib/public-form-security";
import { checkLeadRateLimit } from "@/lib/rate-limit";
import { formDataToObject, leadSchema, validationMessage } from "@/lib/validation";

function leadErrorRedirect(unitId: string, message: string): never {
  redirect(`/marketplace/${unitId}?error=${encodeURIComponent(message)}`);
}

export async function createLead(formData: FormData) {
  const rawUnitId = typeof formData.get("unitId") === "string" ? formData.get("unitId") : "";
  const clientIp = getClientIp();
  const userAgent = getUserAgent();

  if (isHoneypotFilled(formData)) {
    console.warn("Lead honeypot blocked", { unitId: rawUnitId, clientIp, userAgent });
    leadErrorRedirect(rawUnitId, "Your inquiry could not be submitted. Please try again.");
  }

  const parsed = leadSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    leadErrorRedirect(rawUnitId, validationMessage(parsed.error));
  }

  const payload = { ...parsed.data, email: parsed.data.email.toLowerCase() };

  const rateLimit = await checkLeadRateLimit(clientIp, payload.email);

  if (rateLimit.limited) {
    console.warn("Lead rate limit blocked", {
      unitId: payload.unitId,
      email: payload.email,
      clientIp,
      userAgent,
      resetAt: rateLimit.resetAt.toISOString()
    });
    leadErrorRedirect(payload.unitId, "Too many inquiries were submitted recently. Please try again later.");
  }

  const turnstileToken = typeof formData.get("cf-turnstile-response") === "string" ? formData.get("cf-turnstile-response") : null;
  const captchaOk = await verifyTurnstileToken(turnstileToken, clientIp);

  if (!captchaOk) {
    console.warn("Lead CAPTCHA blocked", { unitId: payload.unitId, email: payload.email, clientIp, userAgent });
    leadErrorRedirect(payload.unitId, "Please complete the security check before submitting your inquiry.");
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: payload.unitId,
      status: "AVAILABLE",
      property: { isArchived: false }
    },
    select: { id: true }
  });

  if (!unit) {
    leadErrorRedirect(payload.unitId, "This unit is no longer available for public inquiries.");
  }

  const duplicateCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const duplicateLead = await prisma.lead.findFirst({
    where: {
      unitId: payload.unitId,
      email: payload.email,
      createdAt: { gte: duplicateCutoff }
    },
    select: { id: true }
  });

  if (duplicateLead) {
    redirect(`/marketplace/${payload.unitId}?lead=success`);
  }

  await prisma.lead.create({ data: payload });

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/marketplace/${payload.unitId}`);
  redirect(`/marketplace/${payload.unitId}?lead=success`);
}
