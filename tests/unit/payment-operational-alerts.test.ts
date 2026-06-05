import { describe, expect, it } from "vitest";
import { buildPaymentOperationalIssues } from "@/lib/payments/payment-operational-alerts";

describe("payment operational alerts", () => {
  it("marks missing Stripe setup as critical", () => {
    const issues = buildPaymentOperationalIssues({
      stripeSecretConfigured: false,
      webhookSecretConfigured: false,
      connectedLandlordCount: 0,
      activePlatformFeePercent: 1,
      failedTransactions: 0,
      pendingTransactions: 0,
      failedWebhooks: 0,
      processingWebhooks: 0,
      revenueRiskTransactions: 0
    });

    expect(issues.find((issue) => issue.key === "stripe-platform-secret")?.severity).toBe("critical");
    expect(issues.find((issue) => issue.key === "stripe-webhook-secret")?.severity).toBe("critical");
    expect(issues.find((issue) => issue.key === "landlord-connect-readiness")?.severity).toBe("warning");
  });

  it("surfaces failed payment and webhook risk", () => {
    const issues = buildPaymentOperationalIssues({
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
      connectedLandlordCount: 3,
      activePlatformFeePercent: 1,
      failedTransactions: 2,
      pendingTransactions: 4,
      failedWebhooks: 1,
      processingWebhooks: 2,
      revenueRiskTransactions: 1
    });

    expect(issues.find((issue) => issue.key === "failed-payment-transactions")).toMatchObject({ count: 2, severity: "critical" });
    expect(issues.find((issue) => issue.key === "failed-payment-webhooks")).toMatchObject({ count: 1, severity: "critical" });
    expect(issues.find((issue) => issue.key === "pending-payment-transactions")).toMatchObject({ count: 4, severity: "warning" });
    expect(issues.find((issue) => issue.key === "payment-revenue-risk")).toMatchObject({ count: 1, severity: "warning" });
  });

  it("warns when platform fee revenue is disabled", () => {
    const issues = buildPaymentOperationalIssues({
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
      connectedLandlordCount: 1,
      activePlatformFeePercent: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      failedWebhooks: 0,
      processingWebhooks: 0,
      revenueRiskTransactions: 0
    });

    expect(issues.find((issue) => issue.key === "active-platform-fee-policy")).toMatchObject({ count: 1, severity: "warning" });
  });
});
