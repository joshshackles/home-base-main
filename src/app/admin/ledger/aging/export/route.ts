export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { LedgerEntryStatus } from "@prisma/client";
import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth";
import { agingCsvHeaders, agingCsvRows } from "@/lib/ledger-reports";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole(["ADMIN"], "/admin/ledger/aging");
  const entries = await prisma.ledgerEntry.findMany({
    where: { status: { not: LedgerEntryStatus.VOIDED } },
    orderBy: [{ dueDate: "asc" }, { postedAt: "asc" }],
    include: { application: true, tenantUser: true, unit: { include: { property: true } } }
  });
  return csvDownloadResponse(`homebase-aging-report-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(agingCsvHeaders, agingCsvRows(entries)));
}
