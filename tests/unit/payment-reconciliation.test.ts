import { describe, expect, it } from "vitest";
import { PaymentTransactionStatus, PaymentWebhookProcessingStatus } from "@prisma/client";
import { classifyPaymentTransactionException, classifyPaymentWebhookException, summarizePaymentTransactionMetrics, summarizeWebhookMetrics } from "@/lib/payments/payment-reconciliation";

const now = new Date("2026-06-05T12:00:00Z");

function transaction(overrides: Partial<Parameters<typeof classifyPaymentTransactionException>[0]> = {}) {
  return {
    id: "txn_1",
    status: PaymentTransactionStatus.RECONCILED,
    grossAmount: 100_00,
    platformFeeAmount: 100,
    netToLandlordAmount: 99_00,
    stripePaymentIntentId: "pi_123",
    stripeCheckoutSessionId: null,
    stripePaymentStatus: "paid",
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    reconciledAt: now,
    failedAt: null,
    ...overrides
  };
}

function webhook(overrides: Partial<Parameters<typeof classifyPaymentWebhookException>[0]> = {}) {
  return {
    id: "evt_row_1",
    stripeEventId: "evt_123",
    type: "payment_intent.succeeded",
    status: PaymentWebhookProcessingStatus.PROCESSED,
    attempts: 1,
    receivedAt: now,
    processedAt: now,
    failedAt: null,
    errorMessage: null,
    ...overrides
  };
}

describe("payment reconciliation operations", () => {
  it("classifies failed transactions as high-severity exceptions", () => {
    const exception = classifyPaymentTransactionException(transaction({
      status: PaymentTransactionStatus.FAILED,
      failureReason: "Card was declined.",
      failedAt: now,
      reconciledAt: null
    }));

    expect(exception?.severity).toBe("high");
    expect(exception?.title).toContain("failed");
    expect(exception?.detail).toContain("declined");
  });

  it("classifies impossible fee snapshots as critical exceptions", () => {
    const exception = classifyPaymentTransactionException(transaction({
      platformFeeAmount: 125_00,
      netToLandlordAmount: -25_00
    }));

    expect(exception?.source).toBe("fee");
    expect(exception?.severity).toBe("critical");
  });

  it("summarizes tracked platform fees and net amounts", () => {
    const metrics = summarizePaymentTransactionMetrics([
      transaction(),
      transaction({ id: "txn_2", status: PaymentTransactionStatus.SUCCEEDED, grossAmount: 200_00, platformFeeAmount: 200, netToLandlordAmount: 198_00, reconciledAt: null }),
      transaction({ id: "txn_3", status: PaymentTransactionStatus.FAILED, grossAmount: 50_00, platformFeeAmount: 50, netToLandlordAmount: 49_50, reconciledAt: null })
    ]);

    expect(metrics.trackedCount).toBe(3);
    expect(metrics.reconciledCount).toBe(1);
    expect(metrics.failedCount).toBe(1);
    expect(metrics.platformFeesTracked).toBe(300);
    expect(metrics.netToLandlordTracked).toBe(297_00);
  });

  it("classifies failed and retried webhook events", () => {
    expect(classifyPaymentWebhookException(webhook({ status: PaymentWebhookProcessingStatus.FAILED, errorMessage: "Database timeout.", failedAt: now }))?.severity).toBe("critical");
    expect(classifyPaymentWebhookException(webhook({ status: PaymentWebhookProcessingStatus.PROCESSING, attempts: 2 }))?.title).toContain("retried");
  });

  it("summarizes webhook event health", () => {
    const metrics = summarizeWebhookMetrics([
      webhook(),
      webhook({ id: "evt_row_2", status: PaymentWebhookProcessingStatus.PROCESSING, attempts: 2, processedAt: null }),
      webhook({ id: "evt_row_3", status: PaymentWebhookProcessingStatus.FAILED, errorMessage: "Failed.", failedAt: now, processedAt: null })
    ]);

    expect(metrics.trackedCount).toBe(3);
    expect(metrics.processedCount).toBe(1);
    expect(metrics.processingCount).toBe(1);
    expect(metrics.failedCount).toBe(1);
    expect(metrics.retriedCount).toBe(1);
  });
});
