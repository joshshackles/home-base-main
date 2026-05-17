import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type RateLimitDecision = {
  limited: boolean;
  remaining: number;
  resetAt: Date;
  count: number;
};

type RateLimitInput = {
  key: string;
  maxAttempts: number;
  windowMs: number;
};

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const LEAD_IP_WINDOW_MS = 15 * 60 * 1000;
const LEAD_IP_MAX_ATTEMPTS = 5;
const LEAD_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const LEAD_EMAIL_MAX_ATTEMPTS = 3;

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, ":") || "unknown";
}

function nowPlus(ms: number) {
  return new Date(Date.now() + ms);
}

/**
 * Durable fixed-window rate limiting backed by Postgres/Prisma.
 *
 * The previous Map-based limiter only worked inside a single warm Node process.
 * In serverless production, a fresh function instance can get an empty Map, so
 * attackers could bypass it by landing on different invocations. This function
 * stores the window in the database so the limit is shared across invocations.
 */
export async function checkFixedWindowRateLimit({ key, maxAttempts, windowMs }: RateLimitInput): Promise<RateLimitDecision> {
  const normalizedKey = normalizeKey(key);
  const now = new Date();
  const resetAt = nowPlus(windowMs);

  try {
    const current = await prisma.rateLimitBucket.findUnique({
      where: { key: normalizedKey },
      select: { count: true, resetAt: true }
    });

    if (!current || current.resetAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key: normalizedKey },
        create: { key: normalizedKey, count: 1, resetAt },
        update: { count: 1, resetAt }
      });

      return { limited: false, remaining: Math.max(maxAttempts - 1, 0), resetAt, count: 1 };
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key: normalizedKey },
      data: { count: { increment: 1 } },
      select: { count: true, resetAt: true }
    });

    return {
      limited: updated.count > maxAttempts,
      remaining: Math.max(maxAttempts - updated.count, 0),
      resetAt: updated.resetAt,
      count: updated.count
    };
  } catch (error) {
    // Fail closed for public abuse controls unless explicitly disabled for local dev.
    logger.error("Durable rate limiter failed", error, { key: normalizedKey });
    if (process.env.RATE_LIMIT_FAIL_OPEN === "true") {
      return { limited: false, remaining: maxAttempts, resetAt, count: 0 };
    }
    return { limited: true, remaining: 0, resetAt, count: maxAttempts + 1 };
  }
}

export async function clearFixedWindowRateLimit(key: string) {
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { key: normalizeKey(key) } });
  } catch (error) {
    logger.error("Failed to clear rate limit bucket", error, { key });
  }
}

export function loginRateLimitKey(email: string, ip?: string | null) {
  const normalizedEmail = normalizeKey(email);
  const normalizedIp = normalizeKey(ip || "unknown");
  return `login:${normalizedEmail}:${normalizedIp}`;
}

export async function checkLoginRateLimit(email: string, ip?: string | null) {
  return checkFixedWindowRateLimit({
    key: loginRateLimitKey(email, ip),
    maxAttempts: LOGIN_MAX_ATTEMPTS,
    windowMs: LOGIN_WINDOW_MS
  });
}

export async function clearLoginRateLimit(email: string, ip?: string | null) {
  await clearFixedWindowRateLimit(loginRateLimitKey(email, ip));
}

export async function checkLeadRateLimit(ip: string, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  const ipDecision = await checkFixedWindowRateLimit({
    key: `lead:ip:${ip}`,
    maxAttempts: LEAD_IP_MAX_ATTEMPTS,
    windowMs: LEAD_IP_WINDOW_MS
  });

  if (ipDecision.limited) return ipDecision;

  if (!normalizedEmail) return ipDecision;

  const emailDecision = await checkFixedWindowRateLimit({
    key: `lead:email:${normalizedEmail}`,
    maxAttempts: LEAD_EMAIL_MAX_ATTEMPTS,
    windowMs: LEAD_EMAIL_WINDOW_MS
  });

  return emailDecision.limited ? emailDecision : ipDecision;
}

export async function pruneExpiredRateLimitBuckets() {
  return prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
