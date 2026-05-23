import { Prisma, UserRole } from "@prisma/client";
import { ledgerOperationsSnapshot } from "@/lib/ledger-queries";
import { prisma } from "@/lib/prisma";
import { definePlatformQuery } from "@/lib/platform/service";

type LandlordLedgerInput = {
  take: number;
  skip: number;
};

function ledgerEntryScopeForActor(actor: { userId: string; role: UserRole }): Prisma.LedgerEntryWhereInput {
  if (actor.role === UserRole.ADMIN) return {};
  return { unit: { property: { ownerId: actor.userId } } };
}

function paymentPlanScopeForActor(actor: { userId: string; role: UserRole }): Prisma.PaymentPlanWhereInput {
  if (actor.role === UserRole.ADMIN) return {};
  return { unit: { property: { ownerId: actor.userId } } };
}

export const getLandlordLedgerModel = definePlatformQuery(async (ctx, input: LandlordLedgerInput) => {
  const ledgerWhere = ledgerEntryScopeForActor(ctx.actor);
  const paymentPlanWhere = paymentPlanScopeForActor(ctx.actor);

  const [entries, totalEntries, snapshot, plans] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take: input.take,
      skip: input.skip,
      include: { unit: { include: { property: true } }, application: true, tenantUser: true }
    }),
    prisma.ledgerEntry.count({ where: ledgerWhere }),
    ledgerOperationsSnapshot(ledgerWhere),
    prisma.paymentPlan.findMany({
      where: paymentPlanWhere,
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        unit: { include: { property: true } },
        application: true,
        tenantUser: true,
        installments: { orderBy: { dueDate: "asc" } }
      }
    })
  ]);

  return {
    entries,
    totalEntries,
    snapshot,
    plans,
    summary: {
      balance: snapshot.balance,
      charges: snapshot.charges,
      payments: snapshot.payments
    }
  };
});
