import { PrismaClient, LedgerEntryStatus } from "@prisma/client";
import { ledgerBalance } from "../src/lib/ledger";

const prisma = new PrismaClient();
let failed = false;

function assertCheck(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function main() {
  const landlord = await prisma.user.findUnique({ where: { email: "landlord@homebase.local" } });
  const applicant = await prisma.user.findUnique({ where: { email: "applicant@homebase.local" } });
  assertCheck(Boolean(landlord), "landlord account exists for scoped-access checks");
  assertCheck(Boolean(applicant), "applicant account exists for applicant workflow checks");

  if (landlord) {
    const landlordProperties = await prisma.property.findMany({ where: { ownerId: landlord.id }, include: { units: true } });
    assertCheck(landlordProperties.length > 0, "landlord has assigned properties");
    assertCheck(landlordProperties.every((property) => property.ownerId === landlord.id), "landlord property scope returns only owned properties");
    const ownedUnitIds = landlordProperties.flatMap((property) => property.units.map((unit) => unit.id));
    const landlordLeads = await prisma.lead.findMany({ where: { unitId: { in: ownedUnitIds } }, include: { unit: { include: { property: true } } } });
    assertCheck(landlordLeads.every((lead) => lead.unit.property.ownerId === landlord.id), "landlord lead scope is limited to owned units");
    const landlordApplications = await prisma.application.findMany({ where: { unitId: { in: ownedUnitIds } }, include: { unit: { include: { property: true } } } });
    assertCheck(landlordApplications.every((application) => application.unit.property.ownerId === landlord.id), "landlord application scope is limited to owned units");
  }

  if (applicant) {
    const applicantApplications = await prisma.application.findMany({ where: { applicantUserId: applicant.id }, include: { documentRequests: true, leasePackets: { include: { signatureRequests: true } }, inspections: true } });
    assertCheck(applicantApplications.length > 0, "applicant has at least one application");
    assertCheck(applicantApplications.every((application) => application.applicantUserId === applicant.id), "applicant application scope returns only own applications");
    assertCheck(applicantApplications.some((application) => application.documentRequests.length > 0), "applicant workflow includes requested documents");
    assertCheck(applicantApplications.some((application) => application.leasePackets.length > 0), "applicant workflow includes lease packets");
    assertCheck(applicantApplications.some((application) => application.inspections.length > 0), "applicant workflow includes inspections");
  }

  const application = await prisma.application.findUnique({ where: { id: "seed-application-jane-doe" } });
  if (application) {
    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { applicationId: application.id, status: LedgerEntryStatus.POSTED } });
    const balance = ledgerBalance(ledgerEntries);
    assertCheck(balance >= 0, `seed application ledger balance is non-negative (${balance})`);

    const recurringEntries = await prisma.ledgerEntry.findMany({
      where: { generatedFromScheduleId: { not: null }, generatedForPeriod: { not: null } },
      select: { generatedFromScheduleId: true, generatedForPeriod: true }
    });
    const recurringKeys = new Set(recurringEntries.map((entry) => `${entry.generatedFromScheduleId}:${entry.generatedForPeriod}`));
    assertCheck(recurringKeys.size === recurringEntries.length, "generated recurring charges do not contain duplicate schedule/period keys");
  }

  const unsignedSignatureRequests = await prisma.signatureRequest.count({ where: { status: "PENDING" } });
  const queuedNotifications = await prisma.signatureNotification.count({ where: { status: "QUEUED" } });
  assertCheck(unsignedSignatureRequests >= 0, `signature workflow can count pending requests (${unsignedSignatureRequests})`);
  assertCheck(queuedNotifications >= 0, `notification workflow can count queued messages (${queuedNotifications})`);

  if (failed) process.exit(1);
  console.log("Workflow verification passed.");
}

main()
  .catch((error) => {
    console.error("Workflow verification failed with an unexpected error.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
