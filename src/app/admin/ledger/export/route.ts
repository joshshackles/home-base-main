import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth";
import { ledgerCsvHeaders, ledgerCsvRows } from "@/lib/ledger-reports";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole(["ADMIN"], "/admin/ledger");
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    include: { application: true, tenantUser: true, unit: { include: { property: true } } }
  });
  return csvDownloadResponse(`homebase-ledger-export-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(ledgerCsvHeaders, ledgerCsvRows(entries)));
}
