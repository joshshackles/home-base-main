import { readFileSync } from "node:fs";

const checks = [
  ["schema role HOUSING_COORDINATOR", "prisma/schema.prisma", "HOUSING_COORDINATOR"],
  ["schema role EMERGENCY_CONTACT", "prisma/schema.prisma", "EMERGENCY_CONTACT"],
  ["landlord create relationship action", "src/app/landlord/actions.ts", "createLandlordProfileConnection"],
  ["landlord contacts creation panel", "src/app/landlord/contacts/page.tsx", "Add a connected person"],
  ["applicant contacts page", "src/app/applicant/contacts/page.tsx", "My contacts"],
  ["vendor contacts page", "src/app/vendor/contacts/page.tsx", "Work contacts"],
  ["personal contact aggregator", "src/lib/profile-connections.ts", "getUserRelationshipContactsList"],
];

for (const [label, file, needle] of checks) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(needle)) throw new Error(`${label} missing from ${file}`);
}

console.log("Relationship contact network verification passed.");
