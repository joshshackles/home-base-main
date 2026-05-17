export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { LedgerEntryStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { ledgerCsvHeaders, ledgerCsvRows } from "@/lib/ledger-reports";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/ledger/statement");
  const entries = await prisma.ledgerEntry.findMany({
    where: { status: { not: LedgerEntryStatus.VOIDED }, OR: [{ tenantUserId: user.userId }, { application: { applicantUserId: user.userId } }] },
    orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
    include: { application: true, tenantUser: true, unit: { include: { property: true } } }
  });
  return csvDownloadResponse(`homebase-my-statement-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(ledgerCsvHeaders, ledgerCsvRows(entries)));
}
