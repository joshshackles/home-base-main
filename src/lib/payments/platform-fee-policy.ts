import { PlatformFeePolicyStatus } from "@prisma/client";

export type PlatformFeePolicySource = "database" | "environment" | "default";

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

export type PlatformFeePolicyInput = {
  name: string;
  description?: string | null;
  percent: number;
  fixedCents?: number;
  effectiveFrom?: Date;
  createdById?: string | null;
  auditNote?: string | null;
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

export function normalizePlatformFeePolicyInput(input: PlatformFeePolicyInput) {
  if (!input.name.trim()) throw new Error("Policy name is required.");
  if (!Number.isFinite(input.percent) || input.percent < 0 || input.percent > 25) throw new Error("Platform fee percent must be between 0 and 25.");
  const fixedCents = Math.round(input.fixedCents ?? 0);
  if (!Number.isFinite(fixedCents) || fixedCents < 0 || fixedCents > 50_00) throw new Error("Fixed platform fee must be between $0 and $50.");

  return {
    name: input.name.trim().slice(0, 120),
    description: input.description?.trim() ? input.description.trim().slice(0, 500) : null,
    percent: Math.round(input.percent * 1000) / 1000,
    fixedCents,
    effectiveFrom: input.effectiveFrom ?? new Date(),
    createdById: input.createdById ?? null,
    auditNote: input.auditNote?.trim() ? input.auditNote.trim().slice(0, 500) : "Active HomeBase application-fee policy for Stripe rent payments."
  };
}

function policyFromRecord(record: { id: string; name: string; percent: number; fixedCents: number; appliesTo: string; effectiveFrom: Date; auditNote: string | null }): PlatformFeePolicy {
  return {
    id: record.id,
    label: record.name,
    percent: record.percent,
    fixedCents: record.fixedCents,
    source: "database",
    appliesTo: record.appliesTo === "stripe_rent_payments" ? "stripe_rent_payments" : "stripe_rent_payments",
    effectiveFrom: record.effectiveFrom.toISOString(),
    auditNote: record.auditNote ?? "Applied as Stripe application_fee_amount on destination-charge rent payments."
  };
}

export async function getActivePlatformFeePolicyForPayments(): Promise<PlatformFeePolicy> {
  const { prisma } = await import("@/lib/prisma");
  const now = new Date();
  const active = await prisma.platformFeePolicyRecord.findFirst({
    where: {
      status: PlatformFeePolicyStatus.ACTIVE,
      appliesTo: "stripe_rent_payments",
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }]
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
  });

  return active ? policyFromRecord(active) : getActivePlatformFeePolicy();
}

export async function createActivePlatformFeePolicy(input: PlatformFeePolicyInput) {
  const { prisma } = await import("@/lib/prisma");
  const policy = normalizePlatformFeePolicyInput(input);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.platformFeePolicyRecord.updateMany({
      where: { status: PlatformFeePolicyStatus.ACTIVE, appliesTo: "stripe_rent_payments" },
      data: { status: PlatformFeePolicyStatus.ARCHIVED, effectiveTo: policy.effectiveFrom > now ? policy.effectiveFrom : now }
    });

    return tx.platformFeePolicyRecord.create({
      data: {
        name: policy.name,
        description: policy.description,
        percent: policy.percent,
        fixedCents: policy.fixedCents,
        appliesTo: "stripe_rent_payments",
        status: PlatformFeePolicyStatus.ACTIVE,
        effectiveFrom: policy.effectiveFrom,
        createdById: policy.createdById,
        auditNote: policy.auditNote
      }
    });
  });
}

export function calculatePlatformFeeAmount(amountCents: number, policy = getActivePlatformFeePolicy()) {
  const percentAmount = policy.percent > 0 ? Math.round(amountCents * (policy.percent / 100)) : 0;
  const fixedAmount = policy.fixedCents > 0 ? policy.fixedCents : 0;
  return Math.max(0, percentAmount + fixedAmount);
}

export async function calculatePlatformFeeAmountForPayments(amountCents: number) {
  return calculatePlatformFeeAmount(amountCents, await getActivePlatformFeePolicyForPayments());
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

export async function buildPlatformFeeSnapshotForPayments(amountCents: number) {
  const policy = await getActivePlatformFeePolicyForPayments();
  return buildPlatformFeeSnapshot(amountCents, policy);
}
