import { PaymentTransactionStatus } from "@prisma/client";
import { getActivePlatformFeePolicyForPayments } from "@/lib/payments/platform-fee-policy";

export type PlatformRevenueTransaction = {
  id: string;
  status: PaymentTransactionStatus;
  grossAmount: number;
  platformFeeAmount: number;
  netToLandlordAmount: number;
  currency: string;
  landlordUserId?: string | null;
  createdAt: Date;
  succeededAt?: Date | null;
  reconciledAt?: Date | null;
};

export type PlatformRevenueReadinessInput = {
  stripeSecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  platformFeePercent: number;
  connectedLandlordCount: number;
};

export function isRevenueEligibleTransaction(transaction: PlatformRevenueTransaction) {
  return transaction.status === PaymentTransactionStatus.SUCCEEDED || transaction.status === PaymentTransactionStatus.RECONCILED;
}

export function summarizePlatformRevenue(transactions: PlatformRevenueTransaction[]) {
  const eligible = transactions.filter(isRevenueEligibleTransaction);
  const refundedOrDisputed = transactions.filter((item) => item.status === PaymentTransactionStatus.REFUNDED || item.status === PaymentTransactionStatus.DISPUTED);

  return {
    trackedCount: transactions.length,
    eligibleCount: eligible.length,
    refundedOrDisputedCount: refundedOrDisputed.length,
    grossVolume: eligible.reduce((sum, item) => sum + item.grossAmount, 0),
    platformRevenue: eligible.reduce((sum, item) => sum + item.platformFeeAmount, 0),
    netToLandlords: eligible.reduce((sum, item) => sum + item.netToLandlordAmount, 0),
    averagePlatformFee: eligible.length ? Math.round(eligible.reduce((sum, item) => sum + item.platformFeeAmount, 0) / eligible.length) : 0,
    connectedLandlordIds: Array.from(new Set(eligible.map((item) => item.landlordUserId).filter((id): id is string => Boolean(id))))
  };
}

export function classifyPlatformRevenueReadiness(input: PlatformRevenueReadinessInput) {
  const checklist = [
    {
      id: "stripe-secret",
      label: "Stripe platform account",
      complete: input.stripeSecretConfigured,
      detail: input.stripeSecretConfigured ? "STRIPE_SECRET_KEY is configured for the HomeBase platform account." : "Add STRIPE_SECRET_KEY for the platform Stripe account that receives application fees."
    },
    {
      id: "webhook-secret",
      label: "Stripe webhook signing",
      complete: input.webhookSecretConfigured,
      detail: input.webhookSecretConfigured ? "STRIPE_WEBHOOK_SECRET is configured for replay-safe reconciliation." : "Add STRIPE_WEBHOOK_SECRET so Stripe events can update ledgers and transactions safely."
    },
    {
      id: "fee-policy",
      label: "HomeBase platform fee",
      complete: input.platformFeePercent > 0,
      detail: input.platformFeePercent > 0 ? `Active application fee is ${input.platformFeePercent}%.` : "Set STRIPE_PLATFORM_FEE_PERCENT to collect a HomeBase application fee."
    },
    {
      id: "landlord-connect",
      label: "Landlord Connect accounts",
      complete: input.connectedLandlordCount > 0,
      detail: input.connectedLandlordCount > 0 ? `${input.connectedLandlordCount} landlord account${input.connectedLandlordCount === 1 ? "" : "s"} can receive transfers.` : "No landlord Connect accounts are ready for live rent transfers yet."
    }
  ];

  const missing = checklist.filter((item) => !item.complete);
  return {
    ready: missing.length === 0,
    statusLabel: missing.length === 0 ? "Ready to collect platform fees" : `${missing.length} setup item${missing.length === 1 ? "" : "s"} needed`,
    checklist,
    missing
  };
}

export function buildMonthlyPlatformRevenue(transactions: PlatformRevenueTransaction[]) {
  const monthly = new Map<string, { month: string; grossVolume: number; platformRevenue: number; netToLandlords: number; transactionCount: number }>();

  for (const transaction of transactions.filter(isRevenueEligibleTransaction)) {
    const date = transaction.reconciledAt ?? transaction.succeededAt ?? transaction.createdAt;
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const current = monthly.get(month) ?? { month, grossVolume: 0, platformRevenue: 0, netToLandlords: 0, transactionCount: 0 };
    current.grossVolume += transaction.grossAmount;
    current.platformRevenue += transaction.platformFeeAmount;
    current.netToLandlords += transaction.netToLandlordAmount;
    current.transactionCount += 1;
    monthly.set(month, current);
  }

  return Array.from(monthly.values()).sort((a, b) => b.month.localeCompare(a.month));
}

export async function getPlatformRevenueCenter() {
  const { prisma } = await import("@/lib/prisma");
  const platformFeePolicy = await getActivePlatformFeePolicyForPayments();
  const [transactions, connectedLandlordCount, feePolicies] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: {
        status: { in: [PaymentTransactionStatus.SUCCEEDED, PaymentTransactionStatus.RECONCILED, PaymentTransactionStatus.REFUNDED, PaymentTransactionStatus.DISPUTED, PaymentTransactionStatus.FAILED] }
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        landlordUser: { select: { id: true, name: true, email: true, stripeConnectAccountId: true } },
        tenantUser: { select: { name: true, email: true } },
        unit: { include: { property: { select: { name: true } } } }
      }
    }),
    prisma.user.count({
      where: {
        stripeConnectAccountId: { not: null },
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingComplete: true
      }
    }),
    prisma.platformFeePolicyRecord.findMany({
      orderBy: [{ status: "asc" }, { effectiveFrom: "desc" }],
      take: 12
    })
  ]);

  const metrics = summarizePlatformRevenue(transactions);
  const readiness = classifyPlatformRevenueReadiness({
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    platformFeePercent: platformFeePolicy.percent,
    connectedLandlordCount
  });

  return {
    platformFeePolicy,
    connectedLandlordCount,
    feePolicies,
    transactions,
    metrics,
    readiness,
    monthlyRevenue: buildMonthlyPlatformRevenue(transactions)
  };
}

export type PlatformRevenueCenter = Awaited<ReturnType<typeof getPlatformRevenueCenter>>;
