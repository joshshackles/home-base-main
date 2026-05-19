import { readFileSync } from "node:fs";

type Check = {
  file: string;
  markers: string[];
};

const checks: Check[] = [
  {
    file: "src/app/applicant/actions.ts",
    markers: [
      "marketplaceApplicationSchema",
      "shareAuthorization",
      "startMarketplaceApplication",
      "MessageThreadType.APPLICATION",
      "MessageThreadStatus.WAITING_ON_STAFF",
      "applicantPacketSignedAt",
      "dateOfBirth: profile.dateOfBirth",
      "driversLicenseState: profile.driversLicenseState",
      "driversLicenseNumber: profile.driversLicenseNumber",
      "voucherAgency: profile.voucherAgency",
      "voucherCaseWorker: profile.voucherCaseWorker",
      "licensePlateNumber: profile.licensePlateNumber",
      "serviceAnimalAccommodation: profile.serviceAnimalAccommodation",
      "returnTo?.startsWith(\"/marketplace/\")"
    ]
  },
  {
    file: "src/app/applicant/profile/page.tsx",
    markers: [
      "Reusable application packet",
      "Applicant details and acknowledgements",
      "applicantPacketSignedAt",
      "driversLicenseNumber",
      "licensePlateNumber",
      "Case worker and voucher details",
      "consentToScreening",
      "informationCertified",
      "applicantSignature"
    ]
  },
  {
    file: "src/app/marketplace/[unitId]/page.tsx",
    markers: [
      "Apply with your saved renter packet",
      "startMarketplaceApplication",
      "shareAuthorization",
      "Needs signature",
      "Ask a question instead",
      "messagePotentialLandlord",
      "/login?next=/marketplace/"
    ]
  },
  {
    file: "src/app/landlord/actions.ts",
    markers: [
      "leadReplySchema",
      "replyToLandlordLead",
      "sendEmail",
      "LeadStatus.CONTACTED",
      "Replied to lead",
      "redirect(`/landlord/leads/${lead.id}?reply=sent`)"
    ]
  },
  {
    file: "src/app/landlord/leads/[id]/page.tsx",
    markers: [
      "Reply to prospect",
      "replyToLandlordLead",
      "mailto:",
      "searchParams?.reply === \"sent\"",
      "Open email app"
    ]
  },
  {
    file: "docs/MARKETPLACE_APPLICATION_LEAD_REPLY_UX.md",
    markers: [
      "Version: 4.33.0",
      "Fast apply",
      "Landlord Reply Changes"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: [
      "v4.33.0 - Applicant Packet Fields & Tenant Visibility",
      "v4.32.0 - Reusable Auto-Apply Profile Packet",
      "v4.31.0 - Marketplace Application & Lead Reply UX"
    ]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.33.0"]
  },
  {
    file: "package.json",
    markers: [
      "\"version\": \"4.33.0\"",
      "marketplace-application-ux:verify"
    ]
  },
  {
    file: "prisma/schema.prisma",
    markers: [
      "model ApplicantProfile",
      "dateOfBirth",
      "driversLicenseNumber",
      "licensePlateNumber",
      "consentToScreening",
      "applicantPacketSignedAt"
    ]
  },
  {
    file: "prisma/migrations/20260519192000_reusable_application_packet_profile/migration.sql",
    markers: [
      "ALTER TABLE \"ApplicantProfile\"",
      "\"dateOfBirth\"",
      "\"applicantPacketSignedAt\""
    ]
  },
  {
    file: "prisma/migrations/20260519194000_application_packet_operational_fields/migration.sql",
    markers: [
      "\"driversLicenseState\"",
      "\"driversLicenseNumber\"",
      "\"licensePlateNumber\"",
      "\"voucherAgency\""
    ]
  },
  {
    file: "src/app/landlord/applications/[id]/page.tsx",
    markers: [
      "Applicant packet",
      "driversLicenseNumber",
      "licensePlateNumber",
      "Reusable renter profile"
    ]
  },
  {
    file: "src/app/landlord/tenants/page.tsx",
    markers: ["LandlordTenantsPage", "/landlord/tenants/"]
  },
  {
    file: "src/app/landlord/tenants/[id]/page.tsx",
    markers: ["LandlordTenantDetailPage", "Application packet", "Household and income"]
  }
];

const failures: string[] = [];

for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!text.includes(marker)) failures.push(`${check.file} is missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Marketplace application UX verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Marketplace application and lead reply UX verification passed.");
