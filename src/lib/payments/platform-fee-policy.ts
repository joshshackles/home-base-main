export type PlatformFeePolicySource = "environment" | "default";

export type PlatformFeePolicy = {
  id: string;
  label: string;
  percent: number;
  fixedCents: number;
  source: PlatformFeePolicySource;
  appliesTo: "stripe_rent_payments";
  effectiveFrom: string;
  auditNote: string;
};

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getActivePlatformFeePolicy(): PlatformFeePolicy {
  const hasPercentEnv = process.env.STRIPE_PLATFORM_FEE_PERCENT !== undefined && process.env.STRIPE_PLATFORM_FEE_PERCENT !== "";
  const hasFixedEnv = process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS !== undefined && process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS !== "";
  const percent = numberFromEnv("STRIPE_PLATFORM_FEE_PERCENT", 1);
  const fixedCents = Math.round(numberFromEnv("STRIPE_PLATFORM_FEE_FIXED_CENTS", 0));

  return {
    id: `homebase-platform-fee-v1-${percent}-${fixedCents}`,
    label: `${percent}%${fixedCents ? ` + ${fixedCents} cents` : ""} HomeBase application fee`,
    percent,
    fixedCents,
    source: hasPercentEnv || hasFixedEnv ? "environment" : "default",
    appliesTo: "stripe_rent_payments",
    effectiveFrom: "2026-06-05",
    auditNote: "Applied as Stripe application_fee_amount on destination-charge rent payments."
  };
}

export function calculatePlatformFeeAmount(amountCents: number, policy = getActivePlatformFeePolicy()) {
  const percentAmount = policy.percent > 0 ? Math.round(amountCents * (policy.percent / 100)) : 0;
  const fixedAmount = policy.fixedCents > 0 ? policy.fixedCents : 0;
  return Math.max(0, percentAmount + fixedAmount);
}

export function buildPlatformFeeSnapshot(amountCents: number, policy = getActivePlatformFeePolicy()) {
  const amount = calculatePlatformFeeAmount(amountCents, policy);
  return {
    policyId: policy.id,
    policyLabel: policy.label,
    policySource: policy.source,
    platformFeePercent: String(policy.percent),
    platformFeeFixedCents: String(policy.fixedCents),
    platformFeeAmount: String(amount),
    platformFeeAppliesTo: policy.appliesTo,
    platformFeeEffectiveFrom: policy.effectiveFrom
  };
}
