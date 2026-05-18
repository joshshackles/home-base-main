import Stripe from "stripe";

export function stripePaymentsEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "false");
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey);
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

export function getPlatformApplicationFeeAmount(amountCents: number) {
  const percent = Number.parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0");
  const fixed = Number.parseInt(process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS || "0", 10);
  const percentAmount = Number.isFinite(percent) && percent > 0 ? Math.round(amountCents * (percent / 100)) : 0;
  const fixedAmount = Number.isFinite(fixed) && fixed > 0 ? fixed : 0;
  return Math.max(0, percentAmount + fixedAmount);
}

export function getAppBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function paymentFeatureLabel() {
  return stripePaymentsEnabled() ? "Online payments enabled" : "Online payments not configured";
}
