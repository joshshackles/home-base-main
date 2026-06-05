import type Stripe from "stripe";
import { AuditAction } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";

type StripeConnectAccountRecord = {
  stripeConnectAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeOnboardingComplete: boolean;
  stripeConnectLastSyncedAt: Date | null;
};

export type StripeConnectReadiness = {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  currentlyDueCount: number;
  pastDueCount: number;
  pendingVerificationCount: number;
  statusLabel: "Not connected" | "Needs onboarding" | "Action needed" | "Ready";
  actionLabel: "Start Stripe setup" | "Continue Stripe setup" | "Refresh Stripe status";
  controllerSummary: string;
  checklist: Array<{ label: string; complete: boolean; detail: string }>;
};

export function buildStripeConnectAccountParams(user: { id: string; email: string; name?: string | null }): Stripe.AccountCreateParams {
  return {
    email: user.email,
    country: "US",
    business_type: "individual",
    business_profile: {
      mcc: "6513",
      name: user.name ?? "HomeBase landlord",
      product_description: "Residential rent collection and rental property management through HomeBase MLS."
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      us_bank_account_ach_payments: { requested: true }
    },
    controller: {
      fees: { payer: "application" },
      losses: { payments: "application" },
      requirement_collection: "stripe",
      stripe_dashboard: { type: "express" }
    },
    metadata: {
      homebaseUserId: user.id,
      homebaseConnectModel: "controller-explicit-destination-charges",
      homebaseFeePolicy: "platform-application-fee"
    }
  };
}

export function buildStripeConnectReadiness(input: StripeConnectAccountRecord, account?: Stripe.Account | null): StripeConnectReadiness {
  const hasAccount = Boolean(input.stripeConnectAccountId);
  const chargesEnabled = Boolean(account?.charges_enabled ?? input.stripeChargesEnabled);
  const payoutsEnabled = Boolean(account?.payouts_enabled ?? input.stripePayoutsEnabled);
  const detailsSubmitted = Boolean(account?.details_submitted ?? input.stripeOnboardingComplete);
  const disabledReason = account?.requirements?.disabled_reason ?? null;
  const currentlyDueCount = account?.requirements?.currently_due?.length ?? 0;
  const pastDueCount = account?.requirements?.past_due?.length ?? 0;
  const pendingVerificationCount = account?.requirements?.pending_verification?.length ?? 0;
  const onboardingComplete = hasAccount && detailsSubmitted && chargesEnabled && payoutsEnabled && !disabledReason && pastDueCount === 0;
  const needsAction = hasAccount && (Boolean(disabledReason) || pastDueCount > 0 || currentlyDueCount > 0 || !chargesEnabled || !payoutsEnabled);

  return {
    hasAccount,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete,
    detailsSubmitted,
    disabledReason,
    currentlyDueCount,
    pastDueCount,
    pendingVerificationCount,
    statusLabel: onboardingComplete ? "Ready" : needsAction ? "Action needed" : hasAccount ? "Needs onboarding" : "Not connected",
    actionLabel: hasAccount ? needsAction ? "Continue Stripe setup" : "Refresh Stripe status" : "Start Stripe setup",
    controllerSummary: "Destination charges with explicit controller settings: HomeBase pays Stripe fees, owns payment-loss liability, Stripe collects onboarding requirements, and landlords use Stripe-hosted Express access.",
    checklist: [
      { label: "Connected account created", complete: hasAccount, detail: hasAccount ? "Stripe account id is stored." : "Create a Stripe connected account before rent can be collected." },
      { label: "Onboarding submitted", complete: detailsSubmitted, detail: detailsSubmitted ? "Stripe has received required business details." : "Landlord must complete Stripe-hosted onboarding." },
      { label: "Charges enabled", complete: chargesEnabled, detail: chargesEnabled ? "The account can receive destination charges." : "Stripe has not enabled charges yet." },
      { label: "Payouts enabled", complete: payoutsEnabled, detail: payoutsEnabled ? "The account can receive payouts." : "Stripe has not enabled payouts yet." },
      { label: "Requirements clear", complete: !disabledReason && pastDueCount === 0, detail: disabledReason ?? (pastDueCount ? `${pastDueCount} requirement(s) are past due.` : "No blocking Stripe requirements are currently recorded.") }
    ]
  };
}

export async function ensureStripeConnectAccountForLandlord(actor: SessionPayload) {
  const stripe = getStripe();
  const dbUser = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { id: true, email: true, name: true, stripeConnectAccountId: true }
  });
  if (!dbUser) throw new Error("User not found.");

  if (dbUser.stripeConnectAccountId) {
    return { accountId: dbUser.stripeConnectAccountId, created: false };
  }

  const account = await stripe.accounts.create(buildStripeConnectAccountParams(dbUser), {
    idempotencyKey: `connect-account-${dbUser.id}`
  });

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { stripeConnectAccountId: account.id, stripeConnectLastSyncedAt: new Date() }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.LINK,
    entityType: "StripeConnectAccount",
    entityId: account.id,
    message: "Created Stripe Connect onboarding account with explicit controller settings.",
    metadata: {
      userId: dbUser.id,
      accountId: account.id,
      controller: {
        feesPayer: "application",
        lossesPayments: "application",
        requirementCollection: "stripe",
        dashboardType: "express"
      },
      capabilities: ["card_payments", "transfers", "us_bank_account_ach_payments"]
    }
  });

  return { accountId: account.id, created: true };
}

export async function createStripeConnectOnboardingUrl(actor: SessionPayload) {
  const stripe = getStripe();
  const { accountId } = await ensureStripeConnectAccountForLandlord(actor);
  const baseUrl = getAppBaseUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/landlord/payments?stripe=refresh`,
    return_url: `${baseUrl}/landlord/payments?stripe=return`,
    type: "account_onboarding"
  });

  if (!link.url) throw new Error("Stripe did not return an onboarding URL.");
  return link.url;
}

export async function syncStripeConnectAccountForLandlord(actor: SessionPayload) {
  const stripe = getStripe();
  const dbUser = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: {
      id: true,
      stripeConnectAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeOnboardingComplete: true,
      stripeConnectLastSyncedAt: true
    }
  });
  if (!dbUser?.stripeConnectAccountId) return null;

  const account = await stripe.accounts.retrieve(dbUser.stripeConnectAccountId);
  if (("deleted" in account) && account.deleted) throw new Error("The connected Stripe account was deleted. Start payment setup again.");

  const readiness = buildStripeConnectReadiness(dbUser, account);
  await prisma.user.update({
    where: { id: actor.userId },
    data: {
      stripeChargesEnabled: readiness.chargesEnabled,
      stripePayoutsEnabled: readiness.payoutsEnabled,
      stripeOnboardingComplete: readiness.onboardingComplete,
      stripeConnectLastSyncedAt: new Date()
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "StripeConnectAccount",
    entityId: dbUser.stripeConnectAccountId,
    message: "Refreshed Stripe Connect account readiness.",
    metadata: {
      statusLabel: readiness.statusLabel,
      chargesEnabled: readiness.chargesEnabled,
      payoutsEnabled: readiness.payoutsEnabled,
      onboardingComplete: readiness.onboardingComplete,
      disabledReason: readiness.disabledReason,
      currentlyDueCount: readiness.currentlyDueCount,
      pastDueCount: readiness.pastDueCount,
      pendingVerificationCount: readiness.pendingVerificationCount
    }
  });

  return readiness;
}
