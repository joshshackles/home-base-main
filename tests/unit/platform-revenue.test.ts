import { describe, expect, it } from "vitest";
import { PaymentTransactionStatus } from "@prisma/client";
import { buildMonthlyPlatformRevenue, classifyPlatformRevenueReadiness, summarizePlatformRevenue } from "@/lib/payments/platform-revenue";

const now = new Date("2026-06-05T12:00:00Z");

function transaction(overrides = {}) {
  return {
    id: "txn_1",
    status: PaymentTransactionStatus.RECONCILED,
    grossAmount: 100_00,
    platformFeeAmount: 100,
    netToLandlordAmount: 99_00,
    currency: "usd",
    landlordUserId: "landlord_1",
    createdAt: now,
    succeededAt: now,
    reconciledAt: now,
    ...overrides
  };
}

describe("platform revenue center", () => {
  it("summarizes fee-bearing transactions without counting failed payments as revenue", () => {
    const metrics = summarizePlatformRevenue([
      transaction(),
      transaction({ id: "txn_2", grossAmount: 250_00, platformFeeAmount: 250, netToLandlordAmount: 247_50, landlordUserId: "landlord_2" }),
      transaction({ id: "txn_3", status: PaymentTransactionStatus.FAILED, grossAmount: 500_00, platformFeeAmount: 500, netToLandlordAmount: 495_00 }),
      transaction({ id: "txn_4", status: PaymentTransactionStatus.DISPUTED, grossAmount: 75_00, platformFeeAmount: 75, netToLandlordAmount: 74_25 })
    ]);

    expect(metrics.trackedCount).toBe(4);
    expect(metrics.eligibleCount).toBe(2);
    expect(metrics.refundedOrDisputedCount).toBe(1);
    expect(metrics.grossVolume).toBe(350_00);
    expect(metrics.platformRevenue).toBe(350);
    expect(metrics.netToLandlords).toBe(346_50);
    expect(metrics.connectedLandlordIds).toEqual(["landlord_1", "landlord_2"]);
  });

  it("builds monthly platform revenue buckets", () => {
    const monthly = buildMonthlyPlatformRevenue([
      transaction({ reconciledAt: new Date("2026-05-10T12:00:00Z") }),
      transaction({ id: "txn_2", grossAmount: 200_00, platformFeeAmount: 200, netToLandlordAmount: 198_00, reconciledAt: new Date("2026-06-01T12:00:00Z") }),
      transaction({ id: "txn_3", status: PaymentTransactionStatus.FAILED, reconciledAt: new Date("2026-06-02T12:00:00Z") })
    ]);

    expect(monthly[0]).toMatchObject({ month: "2026-06", platformRevenue: 200, transactionCount: 1 });
    expect(monthly[1]).toMatchObject({ month: "2026-05", platformRevenue: 100, transactionCount: 1 });
  });

  it("reports readiness for platform fee collection", () => {
    const ready = classifyPlatformRevenueReadiness({
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
      platformFeePercent: 1,
      connectedLandlordCount: 2
    });

    expect(ready.ready).toBe(true);
    expect(ready.statusLabel).toContain("Ready");

    const missing = classifyPlatformRevenueReadiness({
      stripeSecretConfigured: false,
      webhookSecretConfigured: false,
      platformFeePercent: 0,
      connectedLandlordCount: 0
    });

    expect(missing.ready).toBe(false);
    expect(missing.missing).toHaveLength(4);
  });
});
