"use server";

import { redirect } from "next/navigation";
import { AuditAction, AutoPayEnrollmentStatus, FinancialAdjustmentType, LedgerEntryStatus, LedgerEntryType, PaymentMethodVerificationStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getPlatformApplicationFeeAmount, getStripe, stripePaymentsEnabled } from "@/lib/stripe";
import { centsFromDollars, createFinancialAdjustment, createStripeRefundForLedgerPayment, enableAutoPay, generateMonthlyRentCharges, generateOwnerStatement, updateAutoPayStatus } from "@/lib/payments/financial-automation";

function assertStripeReady() {
  if (!stripePaymentsEnabled()) throw new Error("Stripe payments are not configured yet. Add STRIPE_SECRET_KEY and Stripe webhook settings in Vercel.");
}

async function assertOwnsSavedPaymentMethod(userId: string, stripePaymentMethodId: string, label = "payment method") {
  const method = await prisma.renterPaymentMethod.findFirst({
    where: { userId, stripePaymentMethodId },
    select: { id: true, stripePaymentMethodId: true, verificationStatus: true }
  });
  if (!method) throw new Error(`This ${label} is not saved to your account.`);
  if (method.verificationStatus !== PaymentMethodVerificationStatus.VERIFIED) {
    throw new Error(`This ${label} must be verified before it can be used for scheduled payments or autopay.`);
  }
  return method;
}

async function assertOwnsOptionalSavedPaymentMethod(userId: string, stripePaymentMethodId: string, label = "backup payment method") {
  if (!stripePaymentMethodId) return null;
  return assertOwnsSavedPaymentMethod(userId, stripePaymentMethodId, label);
}

export async function createStripeConnectOnboardingLink() {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  assertStripeReady();
  const stripe = getStripe();
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { id: true, email: true, name: true, stripeConnectAccountId: true } });
  if (!dbUser) throw new Error("User not found.");

  let accountId = dbUser.stripeConnectAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dbUser.email,
      business_type: "individual",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { homebaseUserId: dbUser.id }
    }, { idempotencyKey: `connect-account-${dbUser.id}` });
    accountId = account.id;
    await prisma.user.update({ where: { id: dbUser.id }, data: { stripeConnectAccountId: accountId, stripeConnectLastSyncedAt: new Date() } });
    await writeAuditLog({ actor: user, action: AuditAction.LINK, entityType: "StripeConnectAccount", entityId: accountId, message: "Created Stripe Connect onboarding account.", metadata: { userId: dbUser.id } });
  }

  const baseUrl = getAppBaseUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/landlord/payments?stripe=refresh`,
    return_url: `${baseUrl}/landlord/payments?stripe=return`,
    type: "account_onboarding"
  });

  redirect(link.url);
}

export async function refreshStripeConnectStatus() {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  assertStripeReady();
  const stripe = getStripe();
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { stripeConnectAccountId: true } });
  if (!dbUser?.stripeConnectAccountId) redirect("/landlord/payments?stripe=missing");
  const account = await stripe.accounts.retrieve(dbUser.stripeConnectAccountId);
  if (("deleted" in account) && account.deleted) throw new Error("The connected Stripe account was deleted. Start payment setup again.");
  await prisma.user.update({
    where: { id: user.userId },
    data: {
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled),
      stripeConnectLastSyncedAt: new Date()
    }
  });
  redirect("/landlord/payments?stripe=synced");
}

export async function createLedgerCheckoutSession(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/ledger");
  assertStripeReady();
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  if (!ledgerEntryId) throw new Error("Missing ledger entry.");

  const entry = await prisma.ledgerEntry.findFirst({
    where: {
      id: ledgerEntryId,
      status: { not: LedgerEntryStatus.VOIDED },
      type: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT] },
      OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }]
    },
    include: { unit: { include: { property: { include: { owner: true } } } }, application: true }
  });

  if (!entry) throw new Error("This charge is not payable from your account.");
  if (entry.amount <= 0) throw new Error("This ledger item does not have a payable balance.");
  const landlord = entry.unit.property.owner;
  if (!landlord) throw new Error("This charge is not connected to a landlord payment account.");
  if (!landlord.stripeConnectAccountId || !landlord.stripeChargesEnabled) throw new Error("This landlord has not finished payment setup yet.");

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const applicationFeeAmount = getPlatformApplicationFeeAmount(entry.amount);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ price_data: { currency: "usd", unit_amount: entry.amount, product_data: { name: entry.description, description: `${entry.unit.property.name} - Unit ${entry.unit.unitNumber}` } }, quantity: 1 }],
    success_url: `${baseUrl}/applicant/ledger?payment=success`,
    cancel_url: `${baseUrl}/applicant/ledger?payment=cancelled`,
    metadata: { ledgerEntryId: entry.id, tenantUserId: user.userId, landlordUserId: landlord.id },
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount > 0 ? applicationFeeAmount : undefined,
      transfer_data: { destination: landlord.stripeConnectAccountId },
      metadata: { ledgerEntryId: entry.id, tenantUserId: user.userId, landlordUserId: landlord.id }
    }
  }, { idempotencyKey: `ledger-checkout-${entry.id}` });

  await prisma.ledgerEntry.update({ where: { id: entry.id }, data: { stripeCheckoutSessionId: session.id, stripePaymentStatus: "checkout_started" } });
  await writeAuditLog({ actor: user, action: AuditAction.LINK, entityType: "LedgerEntry", entityId: entry.id, message: "Started Stripe Checkout for ledger charge.", metadata: { checkoutSessionId: session.id } });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

export async function createTenantPaymentMethodSetupSession() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  assertStripeReady();
  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { id: true, email: true, name: true, stripeCustomerId: true } });
  if (!dbUser) throw new Error("User not found.");
  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: dbUser.email, name: dbUser.name ?? undefined, metadata: { homebaseUserId: dbUser.id } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId: customerId } });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: `${baseUrl}/applicant/payments?setup=success`,
    cancel_url: `${baseUrl}/applicant/payments?setup=cancelled`,
    metadata: { tenantUserId: dbUser.id }
  }, { idempotencyKey: `tenant-payment-method-setup-${dbUser.id}` });
  if (!session.url) throw new Error("Stripe did not return a payment-method setup URL.");
  redirect(session.url);
}

export async function scheduleTenantPayment(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  const scheduledForRaw = String(formData.get("scheduledFor") || "");
  const paymentMethodId = String(formData.get("paymentMethodId") || "");
  if (!ledgerEntryId || !scheduledForRaw) throw new Error("Choose a charge and a payment date.");
  const scheduledFor = new Date(`${scheduledForRaw}T12:00:00`);
  if (Number.isNaN(scheduledFor.getTime())) throw new Error("Invalid payment date.");
  const entry = await prisma.ledgerEntry.findFirst({ where: { id: ledgerEntryId, status: { not: LedgerEntryStatus.VOIDED }, OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }] }, include: { unit: true } });
  if (!entry) throw new Error("This charge is not available for scheduling.");
  if (paymentMethodId) await assertOwnsSavedPaymentMethod(user.userId, paymentMethodId);
  await prisma.scheduledPayment.create({ data: { userId: user.userId, unitId: entry.unitId, ledgerEntryId: entry.id, stripePaymentMethodId: paymentMethodId || undefined, amount: entry.amount, scheduledFor } });
  await prisma.paymentEvent.create({ data: { type: "SCHEDULE_CREATED", userId: user.userId, unitId: entry.unitId, ledgerEntryId: entry.id, amount: entry.amount, message: `Payment scheduled for ${scheduledFor.toLocaleDateString()}.` } });
  redirect("/applicant/payments?scheduled=1");
}

export async function cancelScheduledPayment(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const scheduledPaymentId = String(formData.get("scheduledPaymentId") || "");
  if (!scheduledPaymentId) throw new Error("Missing scheduled payment.");
  const payment = await prisma.scheduledPayment.findFirst({ where: { id: scheduledPaymentId, userId: user.userId, status: "SCHEDULED" } });
  if (!payment) throw new Error("This scheduled payment cannot be cancelled.");
  await prisma.scheduledPayment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
  await prisma.paymentEvent.create({ data: { type: "SCHEDULE_CANCELLED", userId: user.userId, unitId: payment.unitId, ledgerEntryId: payment.ledgerEntryId, amount: payment.amount, message: "Scheduled payment cancelled by renter." } });
  redirect("/applicant/payments?cancelled=1");
}

export async function updateUnitRentBillingPolicy(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const unitId = String(formData.get("unitId") || "");
  const monthlyRent = Math.round(Number(formData.get("monthlyRent") || 0) * 100);
  const dueDayOfMonth = Math.min(Math.max(Number.parseInt(String(formData.get("dueDayOfMonth") || "1"), 10), 1), 28);
  const graceDays = Math.max(0, Number.parseInt(String(formData.get("graceDays") || "5"), 10));
  const lateFeeAmount = Math.round(Number(formData.get("lateFeeAmount") || 0) * 100);
  const dailyLateFee = Math.round(Number(formData.get("dailyLateFee") || 0) * 100);
  const lateFeeMode = String(formData.get("lateFeeMode") || "FLAT") as "NONE" | "FLAT" | "PERCENT" | "DAILY_FLAT";
  if (!unitId || monthlyRent <= 0) throw new Error("Choose a unit and enter a valid rent amount.");
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { ownerId: user.userId } }, select: { id: true, unitNumber: true, property: { select: { name: true } } } });
  if (!unit) throw new Error("This unit is not available from your landlord account.");
  await prisma.rentBillingPolicy.upsert({ where: { unitId }, create: { unitId, monthlyRent, dueDayOfMonth, graceDays, lateFeeMode, lateFeeAmount, dailyLateFee }, update: { monthlyRent, dueDayOfMonth, graceDays, lateFeeMode, lateFeeAmount, dailyLateFee } });
  await prisma.paymentEvent.create({ data: { type: "RENT_ADJUSTED", unitId, amount: monthlyRent, message: `Rent policy updated for ${unit.property.name} #${unit.unitNumber}.`, metadata: { actorUserId: user.userId, dueDayOfMonth, graceDays, lateFeeMode } } });
  redirect("/landlord/payments?policy=updated");
}

export async function applyLateFeeAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  if (!ledgerEntryId) throw new Error("Missing ledger entry.");
  const entry = await prisma.ledgerEntry.findFirst({ where: { id: ledgerEntryId, unit: { property: { ownerId: user.userId } } }, select: { id: true } });
  if (!entry) throw new Error("This charge is not available from your landlord account.");
  const { applyLateFeeForEntry } = await import("@/lib/payments/rental-finance");
  await applyLateFeeForEntry(entry.id, user.userId);
  redirect("/landlord/payments?lateFee=applied");
}


export async function enableTenantAutoPay(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const unitId = String(formData.get("unitId") || "");
  const paymentMethodId = String(formData.get("paymentMethodId") || "");
  const backupPaymentMethodId = String(formData.get("backupPaymentMethodId") || "");
  const amountLimit = centsFromDollars(formData.get("amountLimit"));
  const dayOfMonth = Number.parseInt(String(formData.get("dayOfMonth") || "1"), 10);
  if (!unitId || !paymentMethodId) throw new Error("Choose a unit and a saved payment method for autopay.");
  await assertOwnsSavedPaymentMethod(user.userId, paymentMethodId);
  await assertOwnsOptionalSavedPaymentMethod(user.userId, backupPaymentMethodId);
  await enableAutoPay({ userId: user.userId, unitId, stripePaymentMethodId: paymentMethodId, backupPaymentMethodId: backupPaymentMethodId || undefined, amountLimit: amountLimit > 0 ? amountLimit : undefined, dayOfMonth });
  redirect("/applicant/payments?autopay=enabled");
}

export async function pauseTenantAutoPay(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const enrollmentId = String(formData.get("enrollmentId") || "");
  if (!enrollmentId) throw new Error("Missing autopay enrollment.");
  await updateAutoPayStatus({ userId: user.userId, enrollmentId, status: AutoPayEnrollmentStatus.PAUSED });
  redirect("/applicant/payments?autopay=paused");
}

export async function resumeTenantAutoPay(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const enrollmentId = String(formData.get("enrollmentId") || "");
  if (!enrollmentId) throw new Error("Missing autopay enrollment.");
  await updateAutoPayStatus({ userId: user.userId, enrollmentId, status: AutoPayEnrollmentStatus.ACTIVE });
  redirect("/applicant/payments?autopay=resumed");
}

export async function cancelTenantAutoPay(formData: FormData) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/payments");
  const enrollmentId = String(formData.get("enrollmentId") || "");
  if (!enrollmentId) throw new Error("Missing autopay enrollment.");
  await updateAutoPayStatus({ userId: user.userId, enrollmentId, status: AutoPayEnrollmentStatus.CANCELLED });
  redirect("/applicant/payments?autopay=cancelled");
}

export async function generateMonthlyRentChargesAction() {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  await generateMonthlyRentCharges(new Date(), user.userId);
  redirect("/landlord/payments?rent=generated");
}

export async function createFinancialAdjustmentAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const unitId = String(formData.get("unitId") || "");
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  const type = String(formData.get("type") || "CREDIT") as FinancialAdjustmentType;
  const amount = centsFromDollars(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();
  if (!unitId || amount <= 0 || !reason) throw new Error("Choose a unit, amount, and reason.");
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { ownerId: user.userId } }, select: { id: true } });
  if (!unit) throw new Error("This unit is not available from your landlord account.");
  await createFinancialAdjustment({ actorUserId: user.userId, unitId, ledgerEntryId: ledgerEntryId || undefined, type, amount, reason });
  redirect("/landlord/payments?adjustment=created");
}

export async function refundLedgerPaymentAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  const amount = centsFromDollars(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim() || "Landlord refund";
  if (!ledgerEntryId || amount <= 0) throw new Error("Choose a payment and refund amount.");
  const entry = await prisma.ledgerEntry.findFirst({ where: { id: ledgerEntryId, unit: { property: { ownerId: user.userId } } }, select: { id: true } });
  if (!entry) throw new Error("This payment is not available from your landlord account.");
  await createStripeRefundForLedgerPayment({ actorUserId: user.userId, ledgerEntryId, amount, reason });
  redirect("/landlord/payments?refund=requested");
}

export async function generateOwnerStatementAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/payments");
  const monthRaw = String(formData.get("month") || "");
  const unitId = String(formData.get("unitId") || "");
  const base = monthRaw ? new Date(`${monthRaw}-01T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) throw new Error("Choose a valid statement month.");
  const periodStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const periodEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  if (unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { ownerId: user.userId } }, select: { id: true } });
    if (!unit) throw new Error("This unit is not available from your landlord account.");
  }
  await generateOwnerStatement({ ownerUserId: user.userId, periodStart, periodEnd, unitId: unitId || undefined, generatedById: user.userId });
  redirect("/landlord/payments?statement=generated");
}
