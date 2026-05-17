import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export function getClientIp() {
  const headerList = headers();
  const forwardedFor = headerList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headerList.get("x-real-ip") ?? headerList.get("cf-connecting-ip") ?? "unknown";
}

export function getUserAgent() {
  return headers().get("user-agent") ?? "unknown";
}

export function isHoneypotFilled(formData: FormData, fieldName = "companyWebsite") {
  const value = formData.get(fieldName);
  return typeof value === "string" && value.trim().length > 0;
}

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(token: string | null | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Turnstile is optional locally/staging. In production, setting REQUIRE_TURNSTILE=true
  // makes missing configuration or missing tokens fail closed.
  const required = process.env.REQUIRE_TURNSTILE === "true";

  if (!secret) {
    return !required;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip && ip !== "unknown" ? { remoteip: ip } : {})
      })
    });

    if (!response.ok) return false;

    const result = (await response.json()) as TurnstileResponse;
    return result.success === true;
  } catch (error) {
    logger.error("Turnstile verification failed", error, { ip });
    return false;
  }
}
