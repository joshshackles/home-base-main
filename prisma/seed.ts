import { ApplicationStatus, DocumentCategory, DocumentRequestStatus, DocumentVisibility, InspectionChecklistStatus, InspectionStatus, LedgerEntryType, PaymentMethod, PaymentPlanInstallmentStatus, PaymentPlanStatus, RecurringChargeFrequency, LeadStatus, LeasePacketStatus, PrismaClient, SignatureNotificationType, SignatureRole, SignatureStatus, UnitStatus, UserRole } from "@prisma/client";
import { hashPassword, validatePasswordStrength } from "../src/lib/password";
import { DEFAULT_LEASE_TEMPLATE_BODY } from "../src/lib/lease-render";

const prisma = new PrismaClient();

const DEFAULT_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "HomeBaseDemo!2026";

function seedPassword(envName: string) {
  const password = process.env[envName] ?? DEFAULT_SEED_PASSWORD;
  const result = validatePasswordStrength(password);

  if (!result.ok) {
    throw new Error(`${envName} does not meet the production password policy: ${result.errors.join(" ")}`);
  }

  return password;
}

const seedPasswords = {
  admin: seedPassword("SEED_ADMIN_PASSWORD"),
  landlord: seedPassword("SEED_LANDLORD_PASSWORD"),
  inspector: seedPassword("SEED_INSPECTOR_PASSWORD"),
  applicant: seedPassword("SEED_APPLICANT_PASSWORD")
};

async function main() {
  console.log("Seed user passwords. Override with SEED_DEFAULT_PASSWORD or role-specific SEED_*_PASSWORD env vars if needed.");
  console.table({
    "admin@homebase.local": seedPasswords.admin,
    "landlord@homebase.local": seedPasswords.landlord,
    "inspector@homebase.local": seedPasswords.inspector,
    "applicant@homebase.local": seedPasswords.applicant
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@homebase.local" },
    update: {
      passwordHash: hashPassword(seedPasswords.admin),
      role: UserRole.ADMIN,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    },
    create: {
      email: "admin@homebase.local",
      name: "HomeBase MLS Admin",
      passwordHash: hashPassword(seedPasswords.admin),
      role: UserRole.ADMIN,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  const landlord = await prisma.user.upsert({
    where: { email: "landlord@homebase.local" },
    update: {
      passwordHash: hashPassword(seedPasswords.landlord),
      role: UserRole.LANDLORD,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    },
    create: {
      email: "landlord@homebase.local",
      name: "Sample Landlord",
      passwordHash: hashPassword(seedPasswords.landlord),
      role: UserRole.LANDLORD,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    }
  });


  const inspector = await prisma.user.upsert({
    where: { email: "inspector@homebase.local" },
    update: {
      passwordHash: hashPassword(seedPasswords.inspector),
      role: UserRole.INSPECTOR,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    },
    create: {
      email: "inspector@homebase.local",
      name: "Sample Inspector",
      passwordHash: hashPassword(seedPasswords.inspector),
      role: UserRole.INSPECTOR,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  const applicant = await prisma.user.upsert({
    where: { email: "applicant@homebase.local" },
    update: {
      passwordHash: hashPassword(seedPasswords.applicant),
      role: UserRole.APPLICANT,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    },
    create: {
      email: "applicant@homebase.local",
      name: "Jane Doe",
      passwordHash: hashPassword(seedPasswords.applicant),
      role: UserRole.APPLICANT,
      isActive: true,
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  const property = await prisma.property.upsert({
    where: { id: "seed-aspen-park" },
    update: {
      ownerId: landlord.id
    },
    create: {
      id: "seed-aspen-park",
      name: "Aspen Park Apartments",
      addressLine: "1000 Example Drive",
      city: "Joplin",
      state: "MO",
      zip: "64801",
      description: "A sample multifamily property used to test the marketplace and admin workflows.",
      ownerId: landlord.id
    }
  });

  const unit101 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: property.id, unitNumber: "101" } },
    update: {},
    create: {
      propertyId: property.id,
      unitNumber: "101",
      bedrooms: 2,
      bathrooms: 1,
      rentAmount: 733,
      deposit: 500,
      squareFeet: 850,
      voucherFriendly: true,
      utilitiesNote: "Tenant pays electric. Water included.",
      petPolicy: "Pets considered with approval.",
      accessibility: "Ground-level unit with standard entry access.",
      status: UnitStatus.AVAILABLE,
      description: "Ground-level unit with a simple layout and quick access to parking."
    }
  });

  await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: property.id, unitNumber: "203" } },
    update: {},
    create: {
      propertyId: property.id,
      unitNumber: "203",
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: 650,
      deposit: 450,
      squareFeet: 700,
      voucherFriendly: true,
      utilitiesNote: "Tenant pays electric and gas.",
      status: UnitStatus.PENDING,
      description: "Second-floor unit currently under review."
    }
  });

  const lead = await prisma.lead.upsert({
    where: { id: "seed-lead-jane-doe" },
    update: { status: LeadStatus.APPLICATION_STARTED },
    create: {
      id: "seed-lead-jane-doe",
      unitId: unit101.id,
      name: "Jane Doe",
      email: applicant.email,
      phone: "417-555-0101",
      message: "I am interested in Unit 101 and would like to know the next steps.",
      status: LeadStatus.APPLICATION_STARTED
    }
  });

  await prisma.leadNote.upsert({
    where: { id: "seed-lead-note-jane-doe" },
    update: {},
    create: {
      id: "seed-lead-note-jane-doe",
      leadId: lead.id,
      note: "Called Jane and explained that she can begin the application process for Unit 101."
    }
  });

  const application = await prisma.application.upsert({
    where: { id: "seed-application-jane-doe" },
    update: { status: ApplicationStatus.APPROVED },
    create: {
      id: "seed-application-jane-doe",
      leadId: lead.id,
      unitId: unit101.id,
      applicantName: lead.name,
      applicantEmail: lead.email,
      applicantPhone: lead.phone,
      applicantUserId: applicant.id,
      status: ApplicationStatus.APPROVED,
      summary: "Sample application created from the seeded marketplace lead."
    }
  });

  await prisma.applicationNote.upsert({
    where: { id: "seed-application-note-jane-doe" },
    update: {},
    create: {
      id: "seed-application-note-jane-doe",
      applicationId: application.id,
      note: "Applicant needs to provide income documentation and confirm household size."
    }
  });


  await prisma.documentRequest.upsert({
    where: { id: "seed-request-photo-id" },
    update: {},
    create: {
      id: "seed-request-photo-id",
      applicationId: application.id,
      title: "Photo ID",
      category: DocumentCategory.PHOTO_ID,
      status: DocumentRequestStatus.REQUESTED,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload a clear photo or scan of a valid photo ID.",
      requestedById: admin.id
    }
  });

  await prisma.documentRequest.upsert({
    where: { id: "seed-request-proof-income" },
    update: {},
    create: {
      id: "seed-request-proof-income",
      applicationId: application.id,
      title: "Proof of income",
      category: DocumentCategory.PROOF_OF_INCOME,
      status: DocumentRequestStatus.REQUESTED,
      visibility: DocumentVisibility.APPLICANT,
      instructions: "Upload your most recent paystub, benefit letter, or other income verification.",
      requestedById: admin.id
    }
  });




  const inspection = await prisma.inspection.upsert({
    where: { id: "seed-inspection-unit-101" },
    update: {},
    create: {
      id: "seed-inspection-unit-101",
      unitId: unit101.id,
      applicationId: application.id,
      assignedToId: inspector.id,
      status: InspectionStatus.SCHEDULED,
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      inspectorName: "HomeBase Test Inspector",
      notes: "Seeded inspection for testing the inspection workflow."
    }
  });

  await prisma.inspectionChecklistItem.upsert({
    where: { id: "seed-inspection-check-smoke" },
    update: {},
    create: {
      id: "seed-inspection-check-smoke",
      inspectionId: inspection.id,
      label: "Smoke and CO detectors are installed and working",
      status: InspectionChecklistStatus.PENDING,
      sortOrder: 10
    }
  });

  await prisma.inspectionChecklistItem.upsert({
    where: { id: "seed-inspection-check-systems" },
    update: {},
    create: {
      id: "seed-inspection-check-systems",
      inspectionId: inspection.id,
      label: "Utilities and major systems are functional",
      status: InspectionChecklistStatus.PENDING,
      sortOrder: 20
    }
  });

  const leaseTemplate = await prisma.leaseTemplate.upsert({
    where: {
      ownerUserId_name: {
        ownerUserId: admin.id,
        name: "Standard Residential Lease"
      }
    },
    update: {
      body: DEFAULT_LEASE_TEMPLATE_BODY,
      isActive: true,
      ownerUserId: admin.id
    },
    create: {
      name: "Standard Residential Lease",
      description: "Seeded template used to test lease packet creation and preview rendering.",
      body: DEFAULT_LEASE_TEMPLATE_BODY,
      ownerUserId: admin.id,
      isSystem: true,
      isActive: true
    }
  });

  const leasePacket = await prisma.leasePacket.upsert({
    where: { id: "seed-lease-packet-jane-doe" },
    update: {},
    create: {
      id: "seed-lease-packet-jane-doe",
      applicationId: application.id,
      templateId: leaseTemplate.id,
      status: LeasePacketStatus.SENT_FOR_SIGNATURE,
      monthlyRent: unit101.rentAmount,
      securityDeposit: unit101.deposit,
      terms: "This seeded lease packet is for testing preview, terms, notes, and status changes."
    }
  });

  await prisma.leaseNote.upsert({
    where: { id: "seed-lease-note-jane-doe" },
    update: {},
    create: {
      id: "seed-lease-note-jane-doe",
      leasePacketId: leasePacket.id,
      note: "Seeded lease packet is ready for tenant and landlord signature testing."
    }
  });


  const tenantSignature = await prisma.signatureRequest.upsert({
    where: { id: "seed-tenant-signature-jane-doe" },
    update: {},
    create: {
      id: "seed-tenant-signature-jane-doe",
      leasePacketId: leasePacket.id,
      signerRole: SignatureRole.TENANT,
      signerUserId: applicant.id,
      signerName: applicant.name || "Jane Doe",
      signerEmail: applicant.email,
      status: SignatureStatus.PENDING,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  });

  const landlordSignature = await prisma.signatureRequest.upsert({
    where: { id: "seed-landlord-signature-jane-doe" },
    update: {},
    create: {
      id: "seed-landlord-signature-jane-doe",
      leasePacketId: leasePacket.id,
      signerRole: SignatureRole.LANDLORD,
      signerUserId: landlord.id,
      signerName: landlord.name || "Sample Landlord",
      signerEmail: landlord.email,
      status: SignatureStatus.PENDING,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  });


  await prisma.signatureNotification.upsert({
    where: { id: "seed-signature-notification-jane-doe" },
    update: {},
    create: {
      id: "seed-signature-notification-jane-doe",
      signatureRequestId: tenantSignature.id,
      recipientName: tenantSignature.signerName,
      recipientEmail: tenantSignature.signerEmail,
      type: SignatureNotificationType.INITIAL,
      subject: "Lease signature requested - HomeBase MLS",
      body: "Seeded signature notice for Jane Doe."
    }
  });

  await prisma.signatureNotification.upsert({
    where: { id: "seed-signature-reminder-landlord" },
    update: {},
    create: {
      id: "seed-signature-reminder-landlord",
      signatureRequestId: landlordSignature.id,
      recipientName: landlordSignature.signerName,
      recipientEmail: landlordSignature.signerEmail,
      type: SignatureNotificationType.REMINDER,
      subject: "Reminder: lease signature pending - HomeBase MLS",
      body: "Seeded reminder notice for the sample landlord."
    }
  });


  const profile = await prisma.applicantProfile.upsert({
    where: { userId: applicant.id },
    update: {},
    create: {
      userId: applicant.id,
      legalName: "Jane Doe",
      phone: "417-555-0101",
      currentAddress: "200 Sample Street",
      city: "Joplin",
      state: "MO",
      zip: "64801",
      householdSize: 2,
      rentalHistory: "Sample applicant profile for testing the applicant portal."
    }
  });

  await prisma.householdMember.upsert({
    where: { id: "seed-household-member-jane" },
    update: {},
    create: {
      id: "seed-household-member-jane",
      profileId: profile.id,
      name: "Jane Doe",
      relationship: "SELF",
      age: 34
    }
  });

  await prisma.incomeSource.upsert({
    where: { id: "seed-income-jane" },
    update: {},
    create: {
      id: "seed-income-jane",
      profileId: profile.id,
      sourceName: "Sample employment",
      amount: 1800,
      frequency: "MONTHLY"
    }
  });



  await prisma.ledgerEntry.upsert({
    where: { id: "seed-ledger-charge-jane-rent" },
    update: {},
    create: {
      id: "seed-ledger-charge-jane-rent",
      applicationId: application.id,
      unitId: unit101.id,
      tenantUserId: applicant.id,
      type: LedgerEntryType.CHARGE,
      amount: unit101.rentAmount,
      description: "Seeded monthly rent charge",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      createdById: admin.id
    }
  });

  await prisma.ledgerEntry.upsert({
    where: { id: "seed-ledger-payment-jane" },
    update: {},
    create: {
      id: "seed-ledger-payment-jane",
      applicationId: application.id,
      unitId: unit101.id,
      tenantUserId: applicant.id,
      type: LedgerEntryType.PAYMENT,
      amount: 250,
      description: "Seeded partial payment",
      paidAt: new Date(),
      paymentMethod: PaymentMethod.CHECK,
      createdById: admin.id
    }
  });


  await prisma.recurringChargeSchedule.upsert({
    where: { id: "seed-recurring-jane-rent" },
    update: {},
    create: {
      id: "seed-recurring-jane-rent",
      applicationId: application.id,
      unitId: unit101.id,
      tenantUserId: applicant.id,
      name: "Jane Doe monthly rent",
      description: "Monthly rent",
      frequency: RecurringChargeFrequency.MONTHLY,
      amount: unit101.rentAmount,
      tenantPortionAmount: 250,
      subsidyPortionAmount: Math.max(unit101.rentAmount - 250, 0),
      dayOfMonth: 1,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      nextRunDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      createdById: admin.id
    }
  });



  const paymentPlan = await prisma.paymentPlan.upsert({
    where: { id: "seed-payment-plan-jane" },
    update: {},
    create: {
      id: "seed-payment-plan-jane",
      applicationId: application.id,
      unitId: unit101.id,
      tenantUserId: applicant.id,
      name: "Jane Doe sample repayment plan",
      totalAmount: 500,
      installmentAmount: 125,
      dueDayOfMonth: 15,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 15),
      status: PaymentPlanStatus.ACTIVE,
      notes: "Seeded payment plan for testing balance aging and installment tracking.",
      createdById: admin.id
    }
  });

  const paymentPlanInstallments = [0, 1, 2, 3];
  for (const index of paymentPlanInstallments) {
    await prisma.paymentPlanInstallment.upsert({
      where: { id: `seed-payment-plan-jane-installment-${index + 1}` },
      update: {},
      create: {
        id: `seed-payment-plan-jane-installment-${index + 1}`,
        paymentPlanId: paymentPlan.id,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + index, 15),
        amount: 125,
        status: index === 0 ? PaymentPlanInstallmentStatus.PAID : PaymentPlanInstallmentStatus.DUE,
        paidAt: index === 0 ? new Date() : null,
        notes: index === 0 ? "Seeded paid installment." : null
      }
    });
  }

  console.log(`Seeded admin ${admin.email}, landlord ${landlord.email}, and applicant ${applicant.email}.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
