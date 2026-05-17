type RateBucket = {
  count: number;
  firstAttemptAt: number;
};

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isLoginRateLimited(key: string) {
  const now = Date.now();
  const normalizedKey = key.trim().toLowerCase() || "unknown";
  const current = buckets.get(normalizedKey);

  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    buckets.set(normalizedKey, { count: 1, firstAttemptAt: now });
    return false;
  }

  current.count += 1;
  buckets.set(normalizedKey, current);
  return current.count > MAX_ATTEMPTS;
}

export function clearLoginRateLimit(key: string) {
  buckets.delete(key.trim().toLowerCase() || "unknown");
}
