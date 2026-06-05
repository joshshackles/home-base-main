import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertIncludes(file: string, markers: string[]) {
  const body = read(file);
  const missing = markers.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`${file} is missing Stripe Connect modernization markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
}

function assertNotIncludes(file: string, markers: string[]) {
  const body = read(file);
  const present = markers.filter((marker) => body.includes(marker));
  if (present.length) throw new Error(`${file} still contains deprecated Stripe Connect markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
}

assertIncludes("src/lib/payments/stripe-connect.ts", [
  "buildStripeConnectAccountParams",
  "controller: {",
  "fees: { payer: \"application\" }",
  "losses: { payments: \"application\" }",
  "requirement_collection: \"stripe\"",
  "stripe_dashboard: { type: \"express\" }",
  "buildStripeConnectReadiness",
  "createStripeConnectOnboardingUrl",
  "syncStripeConnectAccountForLandlord",
  "homebaseConnectModel"
]);

assertIncludes("src/app/payments/actions.ts", [
  "createStripeConnectOnboardingUrl",
  "syncStripeConnectAccountForLandlord",
  "redirect(await createStripeConnectOnboardingUrl(user))"
]);

assertNotIncludes("src/app/payments/actions.ts", [
  "type: \"express\"",
  "Created Stripe Connect onboarding account."
]);

assertIncludes("src/lib/stripe.ts", [
  "getPlatformApplicationFeePercent",
  "getActivePlatformFeePolicy"
]);

assertIncludes("src/lib/platform/payments/queries.ts", [
  "buildStripeConnectReadiness",
  "connectReadiness",
  "platformFeePolicy",
  "platformFeePercent: platformFeePolicy.percent"
]);

assertIncludes("src/app/landlord/payments/page.tsx", [
  "connectReadiness",
  "Platform fee",
  "Fee model:",
  "HomeBase application fee",
  "controllerSummary"
]);

assertIncludes("docs/PAYMENTS_PRODUCTION_HARDENING.md", [
  "Stripe Connect Modernization",
  "STRIPE_PLATFORM_FEE_PERCENT=1",
  "controller settings",
  "destination charges"
]);

console.log("Stripe Connect modernization verification passed.");
