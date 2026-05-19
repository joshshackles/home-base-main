import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { getOrCreateConnection, logIntegrationEvent } from "@/lib/integrations-real";
import { beginStripeWebhookEvent, markStripeWebhookFailed, markStripeWebhookProcessed, reconcileCheckoutSession, reconcilePaymentIntentFailed, reconcilePaymentIntentSucceeded, recordDispute, recordRefundFromCharge, recordTransferOrPayout } from "@/lib/payments/production-hardening";

export const dynamic = "force-dynamic";

async function syncStripeAccount(account: Stripe.Account) {
  await prisma.user.updateMany({
    where: { stripeConnectAccountId: account.id },
    data: {
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled),
      stripeConnectLastSyncedAt: new Date()
    }
  });
}

async function syncPaymentMethod(setupIntent: Stripe.SetupIntent, stripeEventId: string, stripe: Stripe) {
  const paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
  const customerId = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
  if (!paymentMethodId || !customerId) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!user) return;

  const method = await stripe.paymentMethods.retrieve(paymentMethodId);
  const isBank = method.type === "us_bank_account";
  await prisma.renterPaymentMethod.upsert({
    where: { stripePaymentMethodId: paymentMethodId },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      type: isBank ? "US_BANK_ACCOUNT" : method.type === "card" ? "CARD" : "OTHER",
      brand: method.card?.brand ?? undefined,
      bankName: method.us_bank_account?.bank_name ?? undefined,
      last4: method.card?.last4 ?? method.us_bank_account?.last4 ?? undefined,
      verificationStatus: isBank ? "VERIFIED" : "VERIFIED"
    },
    update: {
      stripeCustomerId: customerId,
      brand: method.card?.brand ?? undefined,
      bankName: method.us_bank_account?.bank_name ?? undefined,
      last4: method.card?.last4 ?? method.us_bank_account?.last4 ?? undefined,
      verificationStatus: "VERIFIED"
    }
  });
  await prisma.paymentEvent.create({ data: { type: "METHOD_VERIFIED", userId: user.id, stripeEventId, message: "Saved payment method verified by Stripe.", metadata: { paymentMethodId } } }).catch(() => null);
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 500 });
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const { duplicate } = await beginStripeWebhookEvent(event);
  if (duplicate) return NextResponse.json({ received: true, duplicate: true });
  const connection = await getOrCreateConnection({
    provider: IntegrationProvider.STRIPE,
    displayName: event.livemode ? "Stripe live webhooks" : "Stripe test webhooks",
    accountReference: event.account ?? "platform",
    configJson: { webhookPath: "/api/stripe/webhook", livemode: event.livemode, tokenLifecycle: { webhookSecretStoredInEnv: true } }
  });
  await logIntegrationEvent({ provider: IntegrationProvider.STRIPE, connectionId: connection.id, eventType: `webhook.${event.type}.received`, status: IntegrationEventStatus.QUEUED, summary: `Stripe webhook received: ${event.type}.`, payload: { stripeEventId: event.id, livemode: event.livemode } });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await reconcileCheckoutSession(event.data.object, event.id, stripe);
        break;
      case "setup_intent.succeeded":
        await syncPaymentMethod(event.data.object, event.id, stripe);
        break;
      case "payment_intent.succeeded":
        await reconcilePaymentIntentSucceeded(await stripe.paymentIntents.retrieve(event.data.object.id, { expand: ["latest_charge"] }), event.id);
        break;
      case "payment_intent.payment_failed":
        await reconcilePaymentIntentFailed(event.data.object, event.id);
        break;
      case "charge.refunded":
        await recordRefundFromCharge(event.data.object, event.id);
        break;
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
        await recordDispute(event.data.object, event.id, stripe);
        break;
      case "transfer.created":
      case "transfer.reversed":
      case "payout.paid":
      case "payout.failed":
        await recordTransferOrPayout(event);
        break;
      case "account.updated":
        await syncStripeAccount(event.data.object);
        break;
      default:
        break;
    }
    await markStripeWebhookProcessed(event.id);
    await logIntegrationEvent({ provider: IntegrationProvider.STRIPE, connectionId: connection.id, eventType: `webhook.${event.type}.processed`, status: IntegrationEventStatus.SUCCESS, summary: `Stripe webhook processed: ${event.type}.`, payload: { stripeEventId: event.id } });
  } catch (error) {
    await markStripeWebhookFailed(event.id, error);
    await logIntegrationEvent({ provider: IntegrationProvider.STRIPE, connectionId: connection.id, eventType: `webhook.${event.type}.failed`, status: IntegrationEventStatus.FAILED, summary: error instanceof Error ? error.message : "Stripe webhook failed.", payload: { stripeEventId: event.id }, retryAttempt: 1 });
    throw error;
  }

  return NextResponse.json({ received: true });
}
