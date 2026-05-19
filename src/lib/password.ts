import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 14;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "admin12345",
  "landlord12345",
  "applicant12345",
  "homebase123",
  "homebase12345",
  "letmein",
  "qwerty",
  "qwerty123",
  "welcome",
  "welcome123",
  "changeme",
  "temporary",
  "temporary123",
  "12345678",
  "123456789",
  "1234567890"
]);

export type PasswordStrengthResult = {
  ok: boolean;
  errors: string[];
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const testHash = scryptSync(password, salt, KEY_LENGTH);
  const knownHash = Buffer.from(hash, "hex");

  if (testHash.length !== knownHash.length) return false;
  return timingSafeEqual(testHash, knownHash);
}

export function validatePasswordStrength(password: string, options: { email?: string | null; name?: string | null } = {}): PasswordStrengthResult {
  const errors: string[] = [];
  const normalized = password.toLowerCase();
  const emailLocalPart = options.email?.split("@")[0]?.toLowerCase();
  const nameParts = options.name?.toLowerCase().split(/\s+/).filter((part) => part.length >= 3) ?? [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (!/[a-z]/.test(password)) errors.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(password)) errors.push("Password must include an uppercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password must include a symbol.");

  if (COMMON_PASSWORDS.has(normalized)) {
    errors.push("Password is too common or was used as an old demo default.");
  }

  if (emailLocalPart && emailLocalPart.length >= 3 && normalized.includes(emailLocalPart)) {
    errors.push("Password cannot contain the email username.");
  }

  if (nameParts.some((part) => normalized.includes(part))) {
    errors.push("Password cannot contain the user's name.");
  }

  if (/(.)\1{3,}/.test(password)) {
    errors.push("Password cannot contain long repeated character sequences.");
  }

  return { ok: errors.length === 0, errors };
}

export function passwordPolicyMessage() {
  return `Use at least ${MIN_PASSWORD_LENGTH} characters with uppercase, lowercase, number, and symbol. Avoid names, email usernames, and old demo defaults.`;
}
