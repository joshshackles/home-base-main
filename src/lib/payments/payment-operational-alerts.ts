import { PaymentTransactionStatus, PaymentWebhookProcessingStatus } from "@prisma/client";
import { getActivePlatformFeePolicyForPayments } from "@/lib/payments/platform-fee-policy";

export type PaymentOperationalSeverity = "critical" | "warning" | "info" | "success";

export type PaymentOperationalIssue = {
  key: string;
  title: string;
  count: number;
  severity: PaymentOperationalSeverity;
  detail: string;
  href: string;
  actionLabel: string;
};

export type PaymentOperationalCounts = {
  stripeSecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  connectedLandlordCount: number;
  activePlatformFeePercent: number;
  failedTransactions: number;
  pendingTransactions: number;
  failedWebhooks: number;
  processingWebhooks: number;
  revenueRiskTransactions: number;
};

function issue(input: PaymentOperationalIssue): PaymentOperationalIssue {
  return input;
}

export function buildPaymentOperationalIssues(counts: PaymentOperationalCounts): PaymentOperationalIssue[] {
  return [
    issue({
      key: "stripe-platform-secret",
      title: "Stripe platform secret missing",
      count: counts.stripeSecretConfigured ? 0 : 1,
      severity: counts.stripeSecretConfigured ? "success" : "critical",
      detail: counts.stripeSecretConfigured ? "Stripe platform secret is configured." : "Add STRIPE_SECRET_KEY before collecting live rent payments or application fees.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Open setup"
    }),
    issue({
      key: "stripe-webhook-secret",
      title: "Stripe webhook signing missing",
      count: counts.webhookSecretConfigured ? 0 : 1,
      severity: counts.webhookSecretConfigured ? "success" : "critical",
      detail: counts.webhookSecretConfigured ? "Stripe webhook signing is configured." : "Add STRIPE_WEBHOOK_SECRET so payment events can reconcile safely.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Review webhooks"
    }),
    issue({
      key: "landlord-connect-readiness",
      title: "Landlord payout accounts ready",
      count: counts.connectedLandlordCount,
      severity: counts.connectedLandlordCount > 0 ? "success" : "warning",
      detail: counts.connectedLandlordCount > 0 ? "At least one landlord account can receive Stripe transfers." : "No landlord Connect accounts are ready for charges and payouts yet.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Review accounts"
    }),
    issue({
      key: "active-platform-fee-policy",
      title: "HomeBase platform fee policy",
      count: counts.activePlatformFeePercent > 0 ? 0 : 1,
      severity: counts.activePlatformFeePercent > 0 ? "success" : "warning",
      detail: counts.activePlatformFeePercent > 0 ? `Active platform fee is ${counts.activePlatformFeePercent}%.` : "Platform fee is 0%; HomeBase will not collect application-fee revenue on rent payments.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Set policy"
    }),
    issue({
      key: "failed-payment-transactions",
      title: "Failed payment transactions",
      count: counts.failedTransactions,
      severity: counts.failedTransactions > 0 ? "critical" : "success",
      detail: "Failed Stripe-backed payment transactions need recovery, renter follow-up, or support review.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Review failures"
    }),
    issue({
      key: "pending-payment-transactions",
      title: "Payments awaiting final state",
      count: counts.pendingTransactions,
      severity: counts.pendingTransactions > 0 ? "warning" : "success",
      detail: "Checkout-started or processing payments are waiting on completion, webhook reconciliation, or manual review.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Review pending"
    }),
    issue({
      key: "failed-payment-webhooks",
      title: "Failed Stripe webhooks",
      count: counts.failedWebhooks,
      severity: counts.failedWebhooks > 0 ? "critical" : "success",
      detail: "Failed Stripe webhooks can leave ledgers, receipts, retries, and disputes out of sync.",
      href: "/admin/integrations",
      actionLabel: "Open integrations"
    }),
    issue({
      key: "processing-payment-webhooks",
      title: "Stripe webhooks still processing",
      count: counts.processingWebhooks,
      severity: counts.processingWebhooks > 0 ? "warning" : "success",
      detail: "Processing webhook rows should clear quickly; repeated attempts may indicate provider or database trouble.",
      href: "/admin/integrations",
      actionLabel: "Review events"
    }),
    issue({
      key: "payment-revenue-risk",
      title: "Refund or dispute revenue risk",
      count: counts.revenueRiskTransactions,
      severity: counts.revenueRiskTransactions > 0 ? "warning" : "success",
      detail: "Refunded or disputed transactions can affect HomeBase fee revenue and landlord net amounts.",
      href: "/admin/payments/platform-revenue",
      actionLabel: "Review risk"
    })
  ];
}

export async function getPaymentOperationalIssues() {
  const { prisma } = await import("@/lib/prisma");
  const policy = await getActivePlatformFeePolicyForPayments();
  const [
    connectedLandlordCount,
    failedTransactions,
    pendingTransactions,
    failedWebhooks,
    processingWebhooks,
    revenueRiskTransactions
  ] = await Promise.all([
    prisma.user.count({
      where: {
        stripeConnectAccountId: { not: null },
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingComplete: true
      }
    }),
    prisma.paymentTransaction.count({ where: { status: PaymentTransactionStatus.FAILED } }),
    prisma.paymentTransaction.count({ where: { status: { in: [PaymentTransactionStatus.CHECKOUT_STARTED, PaymentTransactionStatus.PROCESSING] } } }),
    prisma.paymentWebhookEvent.count({ where: { status: PaymentWebhookProcessingStatus.FAILED } }),
    prisma.paymentWebhookEvent.count({ where: { status: PaymentWebhookProcessingStatus.PROCESSING } }),
    prisma.paymentTransaction.count({ where: { status: { in: [PaymentTransactionStatus.REFUNDED, PaymentTransactionStatus.DISPUTED] } } })
  ]);

  return buildPaymentOperationalIssues({
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    connectedLandlordCount,
    activePlatformFeePercent: policy.percent,
    failedTransactions,
    pendingTransactions,
    failedWebhooks,
    processingWebhooks,
    revenueRiskTransactions
  });
}
