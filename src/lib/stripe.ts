import Stripe from "stripe";
import { calculatePlatformFeeAmount, calculatePlatformFeeAmountForPayments, getActivePlatformFeePolicy } from "@/lib/payments/platform-fee-policy";

export function stripePaymentsEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "false");
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover" as Stripe.StripeConfig["apiVersion"]
  });
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

export function getPlatformApplicationFeePercent() {
  return getActivePlatformFeePolicy().percent;
}

export function getPlatformApplicationFeeAmount(amountCents: number) {
  return calculatePlatformFeeAmount(amountCents);
}

export async function getPlatformApplicationFeeAmountForPayments(amountCents: number) {
  return calculatePlatformFeeAmountForPayments(amountCents);
}

export function getAppBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function paymentFeatureLabel() {
  return stripePaymentsEnabled() ? "Online payments enabled" : "Online payments not configured";
}
