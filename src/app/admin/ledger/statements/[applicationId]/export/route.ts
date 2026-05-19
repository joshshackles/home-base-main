export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { LedgerEntryStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { ledgerCsvHeaders, ledgerCsvRows } from "@/lib/ledger-reports";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { applicationId: string } }) {
  await requireRole(["ADMIN"], `/admin/ledger/statements/${params.applicationId}`);
  const application = await prisma.application.findUnique({ where: { id: params.applicationId } });
  if (!application) notFound();
  const entries = await prisma.ledgerEntry.findMany({
    where: { applicationId: params.applicationId, status: { not: LedgerEntryStatus.VOIDED } },
    orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
    include: { application: true, tenantUser: true, unit: { include: { property: true } } }
  });
  const safeName = application.applicantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "statement";
  return csvDownloadResponse(`homebase-statement-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(ledgerCsvHeaders, ledgerCsvRows(entries)));
}
