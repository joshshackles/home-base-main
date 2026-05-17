import { describe, expect, it } from "vitest";
import { hashPassword, passwordPolicyMessage, validatePasswordStrength, verifyPassword } from "@/lib/password";

describe("password utilities", () => {
  it("hashes and verifies valid passwords", () => {
    const hash = hashPassword("StrongerPassphrase!2026");
    expect(hash).toMatch(/^scrypt:/);
    expect(verifyPassword("StrongerPassphrase!2026", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects weak, common, or user-identifying passwords", () => {
    const result = validatePasswordStrength("Admin12345!", { email: "admin@example.com", name: "Admin User" });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts strong passwords and exposes the current policy message", () => {
    const result = validatePasswordStrength("Sunset-River-Quartz-42", { email: "person@example.com", name: "Jane Tenant" });
    expect(result.ok).toBe(true);
    expect(passwordPolicyMessage()).toContain("14 characters");
  });
});
