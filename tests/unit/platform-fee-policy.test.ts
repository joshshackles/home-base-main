import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPlatformFeeSnapshot, calculatePlatformFeeAmount, getActivePlatformFeePolicy } from "@/lib/payments/platform-fee-policy";

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
});
