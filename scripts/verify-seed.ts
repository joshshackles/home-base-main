import { PrismaClient, ApplicationStatus, DocumentRequestStatus, InspectionStatus, LedgerEntryStatus, LedgerEntryType, LeasePacketStatus, PaymentPlanStatus, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
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
  const admin = await prisma.user.findUnique({ where: { email: "admin@homebase.local" } });
  const landlord = await prisma.user.findUnique({ where: { email: "landlord@homebase.local" } });
  const applicant = await prisma.user.findUnique({ where: { email: "applicant@homebase.local" } });

  assertCheck(admin?.role === UserRole.ADMIN && admin.isActive, "seed admin exists and is active");
  assertCheck(landlord?.role === UserRole.LANDLORD && landlord.isActive, "seed landlord exists and is active");
  assertCheck(applicant?.role === UserRole.APPLICANT && applicant.isActive, "seed applicant exists and is active");

  const property = await prisma.property.findUnique({ where: { id: "seed-aspen-park" }, include: { owner: true, units: true } });
  assertCheck(property?.owner?.email === "landlord@homebase.local", "seed property is assigned to sample landlord");
  assertCheck((property?.units.length ?? 0) >= 2, "seed property has at least two units");

  const unit101 = await prisma.unit.findFirst({ where: { propertyId: "seed-aspen-park", unitNumber: "101" } });
  assertCheck(unit101?.status === UnitStatus.AVAILABLE, "seed unit 101 is available");

  const lead = await prisma.lead.findUnique({ where: { id: "seed-lead-jane-doe" } });
  assertCheck(Boolean(lead), "seed lead exists");

  const application = await prisma.application.findUnique({ where: { id: "seed-application-jane-doe" }, include: { applicantUser: true, unit: true } });
  assertCheck(application?.status === ApplicationStatus.APPROVED, "seed application is approved for downstream workflow tests");
  assertCheck(application?.applicantUser?.email === "applicant@homebase.local", "seed application is linked to applicant account");

  const documentRequests = await prisma.documentRequest.findMany({ where: { applicationId: "seed-application-jane-doe" } });
  assertCheck(documentRequests.length >= 2, "seed application has requested documents");
  assertCheck(documentRequests.some((request) => request.status === DocumentRequestStatus.REQUESTED), "at least one seed document request is still requested");

  const inspection = await prisma.inspection.findUnique({ where: { id: "seed-inspection-unit-101" }, include: { checklistItems: true } });
  assertCheck(inspection?.status === InspectionStatus.SCHEDULED, "seed inspection is scheduled");
  assertCheck((inspection?.checklistItems.length ?? 0) >= 2, "seed inspection has checklist items");

  const leasePacket = await prisma.leasePacket.findUnique({ where: { id: "seed-lease-packet-jane-doe" }, include: { signatureRequests: true } });
  assertCheck(Boolean(leasePacket), "seed lease packet exists");
  assertCheck([LeasePacketStatus.READY_FOR_REVIEW, LeasePacketStatus.SENT_FOR_SIGNATURE, LeasePacketStatus.COMPLETED, LeasePacketStatus.APPROVED].includes(leasePacket?.status as LeasePacketStatus), "seed lease packet is in a valid review/signature status");
  assertCheck((leasePacket?.signatureRequests.length ?? 0) >= 2, "seed lease packet has tenant and landlord signature requests");
  assertCheck((leasePacket?.signatureRequests ?? []).some((request) => request.status === SignatureStatus.PENDING), "seed lease packet has pending signature work");

  const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { applicationId: "seed-application-jane-doe", status: LedgerEntryStatus.POSTED } });
  assertCheck(ledgerEntries.some((entry) => entry.type === LedgerEntryType.CHARGE), "seed ledger has a posted charge");
  assertCheck(ledgerEntries.some((entry) => entry.type === LedgerEntryType.PAYMENT), "seed ledger has a posted payment");
  const balance = ledgerBalance(ledgerEntries);
  assertCheck(Number.isFinite(balance), `seed ledger balance is computable (${balance})`);

  const recurringSchedule = await prisma.recurringChargeSchedule.findUnique({ where: { id: "seed-recurring-jane-rent" } });
  assertCheck(Boolean(recurringSchedule), "seed recurring rent schedule exists");

  const paymentPlan = await prisma.paymentPlan.findUnique({ where: { id: "seed-payment-plan-jane" }, include: { installments: true } });
  assertCheck(paymentPlan?.status === PaymentPlanStatus.ACTIVE, "seed payment plan is active");
  assertCheck((paymentPlan?.installments.length ?? 0) >= 2, "seed payment plan has installments");

  if (failed) process.exit(1);
  console.log("Seed verification passed.");
}

main()
  .catch((error) => {
    console.error("Seed verification failed with an unexpected error.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
