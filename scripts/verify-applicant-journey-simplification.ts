import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/app/applicant/apply/[unitId]/page.tsx",
    markers: [
      "Guided apply",
      "buildReusablePacketReadiness",
      "requireRole([\"APPLICANT\", \"TENANT\"]",
      "startMarketplaceApplication",
      "Review packet",
      "Authorize and submit",
      "What gets shared"
    ]
  },
  {
    file: "src/lib/applicant/packet-readiness.ts",
    markers: [
      "buildReusablePacketReadiness",
      "requiredMissing",
      "Reusable signature",
      "Reusable documents"
    ]
  },
  {
    file: "src/app/marketplace/[unitId]/page.tsx",
    markers: [
      "/applicant/apply/${unit.id}",
      "Review packet and apply",
      "One-click authorization form"
    ]
  },
  {
    file: "src/app/applicant/actions.ts",
    markers: [
      "/applicant/applications?applied=1&applicationId=${application.id}",
      "revalidatePath(`/applicant/apply/${unit.id}`)"
    ]
  },
  {
    file: "src/app/applicant/applications/page.tsx",
    markers: [
      "applied?: string",
      "Application sent. Your reusable renter packet was shared",
      "View details"
    ]
  },
  {
    file: "docs/APPLICANT_JOURNEY_SIMPLIFICATION.md",
    markers: [
      "Version: 4.40.0",
      "/applicant/apply/[unitId]",
      "No Fake Data"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.40.0 - Applicant Journey Simplification"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.40.0\"", "applicant-journey-simplification:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.40.0"]
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
  console.error("Applicant journey simplification verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Applicant journey simplification verification passed.");
