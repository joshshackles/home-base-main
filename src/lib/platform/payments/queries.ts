import { LedgerEntryType, PaymentTransactionStatus } from "@prisma/client";
import { getLandlordPaymentOperations, getTenantPaymentCenter } from "@/lib/payments/rental-finance";
import { prisma } from "@/lib/prisma";
import { paymentFeatureLabel, stripePaymentsEnabled } from "@/lib/stripe";
import { getActivePlatformFeePolicyForPayments } from "@/lib/payments/platform-fee-policy";
import { buildStripeConnectReadiness } from "@/lib/payments/stripe-connect";
import { definePlatformQuery } from "@/lib/platform/service";

type PaymentSearchParams = Record<string, string | string[] | undefined> | undefined;

function firstParam(searchParams: PaymentSearchParams, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const getLandlordPaymentsCommandCenter = definePlatformQuery(async (ctx, searchParams: PaymentSearchParams) => {
  const [account, ops, paymentTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.actor.userId },
      select: {
        stripeConnectAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingComplete: true,
        stripeConnectLastSyncedAt: true
      }
    }),
    getLandlordPaymentOperations(ctx.actor.userId),
    prisma.paymentTransaction.findMany({
      where: { landlordUserId: ctx.actor.userId },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  const stripeState = firstParam(searchParams, "stripe");
  const recentPayments = ops.entries.filter((entry) => entry.type === LedgerEntryType.PAYMENT || entry.type === LedgerEntryType.CREDIT).slice(0, 8);
  const refundablePayments = recentPayments.filter((entry) => entry.stripePaymentIntentId);
  const openCharges = ops.entries.filter((entry) => (entry.type === LedgerEntryType.CHARGE || entry.type === LedgerEntryType.ADJUSTMENT) && entry.stripePaymentStatus !== "paid").slice(0, 8);
  const platformFeePolicy = await getActivePlatformFeePolicyForPayments();
  const connectReadiness = buildStripeConnectReadiness(account ?? {
    stripeConnectAccountId: null,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeOnboardingComplete: false,
    stripeConnectLastSyncedAt: null
  });

  return {
    account,
    connectReadiness,
    ops,
    paymentTransactions,
    paymentTransactionMetrics: {
      trackedCount: paymentTransactions.length,
      platformFeesTracked: paymentTransactions
        .filter((transaction) => transaction.status === PaymentTransactionStatus.SUCCEEDED || transaction.status === PaymentTransactionStatus.RECONCILED)
        .reduce((sum, transaction) => sum + transaction.platformFeeAmount, 0),
      failedCount: paymentTransactions.filter((transaction) => transaction.status === PaymentTransactionStatus.FAILED).length
    },
    recentPayments,
    refundablePayments,
    openCharges,
    stripe: {
      enabled: stripePaymentsEnabled(),
      label: paymentFeatureLabel(),
      platformFeePercent: platformFeePolicy.percent,
      platformFeePolicy,
      returned: stripeState === "return",
      refresh: stripeState === "refresh",
      missingAccount: stripeState === "missing",
      syncedAccount: stripeState === "synced"
    },
    flash: {
      policyUpdated: Boolean(firstParam(searchParams, "policy"))
    }
  };
});

export const getRenterPaymentsCenterModel = definePlatformQuery(async (ctx, searchParams: PaymentSearchParams) => {
  const center = await getTenantPaymentCenter(ctx.actor.userId);
  const dueTotal = center.openCharges.reduce((sum, entry) => sum + entry.amount, 0);
  const scheduledTotal = center.schedules.reduce((sum, item) => sum + item.amount, 0);
  const activeAutopayCount = center.autopayEnrollments.filter((item) => item.status === "ACTIVE").length;

  return {
    ...center,
    totals: {
      dueTotal,
      scheduledTotal,
      activeAutopayCount,
      retryCount: center.retryAttempts.length
    },
    stripe: {
      enabled: stripePaymentsEnabled(),
      label: paymentFeatureLabel()
    },
    flash: {
      setupSuccess: firstParam(searchParams, "setup") === "success",
      paymentScheduled: Boolean(firstParam(searchParams, "scheduled")),
      autopayStatus: firstParam(searchParams, "autopay") || null
    }
  };
});
