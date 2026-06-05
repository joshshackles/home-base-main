import { PaymentTransactionStatus, PaymentWebhookProcessingStatus } from "@prisma/client";

export type PaymentTransactionLike = {
  id: string;
  status: PaymentTransactionStatus;
  grossAmount: number;
  platformFeeAmount: number;
  netToLandlordAmount: number;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentStatus?: string | null;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  reconciledAt?: Date | null;
  failedAt?: Date | null;
};

export type PaymentWebhookEventLike = {
  id: string;
  stripeEventId: string;
  type: string;
  status: PaymentWebhookProcessingStatus;
  attempts: number;
  receivedAt: Date;
  processedAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
};

export type PaymentReconciliationException = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  actionLabel: string;
  source: "transaction" | "webhook" | "fee";
  relatedId: string;
};

function dollars(amount: number) {
  return `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function classifyPaymentTransactionException(transaction: PaymentTransactionLike): PaymentReconciliationException | null {
  if (transaction.status === PaymentTransactionStatus.FAILED) {
    return {
      id: `transaction-failed-${transaction.id}`,
      severity: "high",
      title: "Payment attempt failed",
      detail: transaction.failureReason || "Stripe reported a failed payment attempt that needs renter follow-up or recovery review.",
      actionLabel: "Review recovery",
      source: "transaction",
      relatedId: transaction.id
    };
  }

  if (transaction.status === PaymentTransactionStatus.PROCESSING && !transaction.stripePaymentIntentId && !transaction.stripeCheckoutSessionId) {
    return {
      id: `transaction-provider-gap-${transaction.id}`,
      severity: "medium",
      title: "Provider id missing",
      detail: "A payment transaction is processing without a Stripe Checkout Session or PaymentIntent id.",
      actionLabel: "Check payment source",
      source: "transaction",
      relatedId: transaction.id
    };
  }

  if ((transaction.status === PaymentTransactionStatus.SUCCEEDED || transaction.status === PaymentTransactionStatus.CHECKOUT_STARTED) && !transaction.reconciledAt) {
    return {
      id: `transaction-not-reconciled-${transaction.id}`,
      severity: transaction.status === PaymentTransactionStatus.SUCCEEDED ? "medium" : "low",
      title: transaction.status === PaymentTransactionStatus.SUCCEEDED ? "Succeeded but not reconciled" : "Checkout started",
      detail: transaction.status === PaymentTransactionStatus.SUCCEEDED
        ? "Stripe success has been recorded, but the transaction has not yet been reconciled to final ledger state."
        : "Checkout was opened and is waiting for a Stripe webhook or tenant completion.",
      actionLabel: transaction.status === PaymentTransactionStatus.SUCCEEDED ? "Reconcile ledger" : "Wait for webhook",
      source: "transaction",
      relatedId: transaction.id
    };
  }

  if (transaction.platformFeeAmount < 0 || transaction.netToLandlordAmount < 0 || transaction.platformFeeAmount > transaction.grossAmount) {
    return {
      id: `transaction-fee-anomaly-${transaction.id}`,
      severity: "critical",
      title: "Platform fee anomaly",
      detail: `Fee ${dollars(transaction.platformFeeAmount)} does not fit gross amount ${dollars(transaction.grossAmount)}.`,
      actionLabel: "Review fee snapshot",
      source: "fee",
      relatedId: transaction.id
    };
  }

  return null;
}

export function classifyPaymentWebhookException(event: PaymentWebhookEventLike): PaymentReconciliationException | null {
  if (event.status === PaymentWebhookProcessingStatus.FAILED) {
    return {
      id: `webhook-failed-${event.id}`,
      severity: "critical",
      title: "Stripe webhook failed",
      detail: event.errorMessage || `${event.type} failed during processing.`,
      actionLabel: "Replay or inspect",
      source: "webhook",
      relatedId: event.id
    };
  }

  if (event.status === PaymentWebhookProcessingStatus.PROCESSING && event.attempts > 1) {
    return {
      id: `webhook-retried-${event.id}`,
      severity: "medium",
      title: "Webhook retried",
      detail: `${event.type} has been attempted ${event.attempts} times and is not fully processed yet.`,
      actionLabel: "Monitor webhook",
      source: "webhook",
      relatedId: event.id
    };
  }

  return null;
}

export function summarizePaymentTransactionMetrics(transactions: PaymentTransactionLike[]) {
  const reconciled = transactions.filter((item) => item.status === PaymentTransactionStatus.RECONCILED);
  const succeeded = transactions.filter((item) => item.status === PaymentTransactionStatus.SUCCEEDED || item.status === PaymentTransactionStatus.RECONCILED);
  const failed = transactions.filter((item) => item.status === PaymentTransactionStatus.FAILED);
  const pending = transactions.filter((item) => item.status === PaymentTransactionStatus.CHECKOUT_STARTED || item.status === PaymentTransactionStatus.PROCESSING);

  return {
    trackedCount: transactions.length,
    reconciledCount: reconciled.length,
    failedCount: failed.length,
    pendingCount: pending.length,
    grossTracked: succeeded.reduce((sum, item) => sum + item.grossAmount, 0),
    platformFeesTracked: succeeded.reduce((sum, item) => sum + item.platformFeeAmount, 0),
    netToLandlordTracked: succeeded.reduce((sum, item) => sum + item.netToLandlordAmount, 0)
  };
}

export function summarizeWebhookMetrics(events: PaymentWebhookEventLike[]) {
  return {
    trackedCount: events.length,
    failedCount: events.filter((item) => item.status === PaymentWebhookProcessingStatus.FAILED).length,
    processingCount: events.filter((item) => item.status === PaymentWebhookProcessingStatus.PROCESSING).length,
    processedCount: events.filter((item) => item.status === PaymentWebhookProcessingStatus.PROCESSED).length,
    retriedCount: events.filter((item) => item.attempts > 1).length
  };
}

function stringFromMetadata(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getPaymentReconciliationOperations(input: { landlordUserId: string; take?: number }) {
  const { prisma } = await import("@/lib/prisma");
  const take = input.take ?? 60;
  const transactions = await prisma.paymentTransaction.findMany({
    where: { landlordUserId: input.landlordUserId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      unit: { include: { property: { select: { name: true } } } },
      tenantUser: { select: { name: true, email: true } },
      ledgerEntry: { select: { id: true, description: true, amount: true, stripeReceiptUrl: true } }
    }
  });

  const relatedStripeEventIds = Array.from(new Set(transactions.map((transaction) => stringFromMetadata(transaction.metadata, "stripeEventId")).filter((eventId): eventId is string => Boolean(eventId))));
  const webhookEvents = relatedStripeEventIds.length
    ? await prisma.paymentWebhookEvent.findMany({
      where: { stripeEventId: { in: relatedStripeEventIds } },
      orderBy: { receivedAt: "desc" },
      take
    })
    : [];

  const transactionExceptions = transactions
    .map((transaction) => classifyPaymentTransactionException(transaction))
    .filter((item): item is PaymentReconciliationException => Boolean(item));
  const webhookExceptions = webhookEvents
    .map((event) => classifyPaymentWebhookException(event))
    .filter((item): item is PaymentReconciliationException => Boolean(item));

  return {
    transactions,
    webhookEvents,
    transactionMetrics: summarizePaymentTransactionMetrics(transactions),
    webhookMetrics: summarizeWebhookMetrics(webhookEvents),
    exceptions: [...transactionExceptions, ...webhookExceptions].sort((a, b) => {
      const weights: Record<PaymentReconciliationException["severity"], number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return weights[b.severity] - weights[a.severity];
    })
  };
}

export type PaymentReconciliationOperations = Awaited<ReturnType<typeof getPaymentReconciliationOperations>>;
