import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPlatformFeeSnapshot, calculatePlatformFeeAmount, getActivePlatformFeePolicy, normalizePlatformFeePolicyInput } from "@/lib/payments/platform-fee-policy";

describe("platform fee policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to a one percent HomeBase application fee", () => {
    vi.stubEnv("STRIPE_PLATFORM_FEE_PERCENT", "");
    vi.stubEnv("STRIPE_PLATFORM_FEE_FIXED_CENTS", "");

    const policy = getActivePlatformFeePolicy();

    expect(policy.percent).toBe(1);
    expect(policy.fixedCents).toBe(0);
    expect(policy.source).toBe("default");
    expect(calculatePlatformFeeAmount(100_00, policy)).toBe(100);
  });

  it("uses configured percent and fixed cents when present", () => {
    vi.stubEnv("STRIPE_PLATFORM_FEE_PERCENT", "1.5");
    vi.stubEnv("STRIPE_PLATFORM_FEE_FIXED_CENTS", "25");

    const policy = getActivePlatformFeePolicy();
    const snapshot = buildPlatformFeeSnapshot(200_00, policy);

    expect(policy.source).toBe("environment");
    expect(calculatePlatformFeeAmount(200_00, policy)).toBe(325);
    expect(snapshot.platformFeeAmount).toBe("325");
    expect(snapshot.policyId).toContain("homebase-platform-fee-v1-1.5-25");
  });

  it("normalizes persistent fee policy input", () => {
    const policy = normalizePlatformFeePolicyInput({
      name: "  HomeBase managed fee  ",
      percent: 1.125,
      fixedCents: 25,
      auditNote: "  Approved by finance.  "
    });

    expect(policy.name).toBe("HomeBase managed fee");
    expect(policy.percent).toBe(1.125);
    expect(policy.fixedCents).toBe(25);
    expect(policy.auditNote).toBe("Approved by finance.");
  });

  it("rejects unsafe persistent fee policy values", () => {
    expect(() => normalizePlatformFeePolicyInput({ name: "", percent: 1 })).toThrow("Policy name");
    expect(() => normalizePlatformFeePolicyInput({ name: "Too high", percent: 26 })).toThrow("between 0 and 25");
    expect(() => normalizePlatformFeePolicyInput({ name: "Too large", percent: 1, fixedCents: 50_01 })).toThrow("between $0 and $50");
  });
});
