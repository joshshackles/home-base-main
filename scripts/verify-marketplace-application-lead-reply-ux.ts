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
      "returnTo?.startsWith(\"/marketplace/\")"
    ]
  },
  {
    file: "src/app/marketplace/[unitId]/page.tsx",
    markers: [
      "Apply with your saved renter packet",
      "startMarketplaceApplication",
      "shareAuthorization",
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
      "Version: 4.31.0",
      "Fast apply",
      "Landlord Reply Changes"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.31.0 - Marketplace Application & Lead Reply UX"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.31.0"]
  },
  {
    file: "package.json",
    markers: [
      "\"version\": \"4.31.0\"",
      "marketplace-application-ux:verify"
    ]
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
