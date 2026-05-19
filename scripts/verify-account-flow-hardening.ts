import { readFileSync } from "node:fs";

function assertIncludes(file: string, expected: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`${file} is missing: ${expected}`);
  }
}

assertIncludes("src/app/signup/page.tsx", "requestLandlordAccess");
assertIncludes("src/app/signup/actions.ts", "AccountAccessType.LANDLORD");
assertIncludes("src/app/signup/actions.ts", "Requested landlord access during signup");
assertIncludes("src/components/dashboard/WorkhorseDashboard.tsx", "Becoming a landlord");
assertIncludes("src/components/dashboard/WorkhorseDashboard.tsx", "request.reason");
assertIncludes("src/app/admin/page.tsx", "reason: request.reason");
assertIncludes("src/app/landlord/actions.ts", "createLandlordProperty");
assertIncludes("src/components/landlord/LandlordPropertyForm.tsx", "createLandlordProperty");
assertIncludes("src/app/landlord/properties/new/page.tsx", "Add Property");
assertIncludes("src/app/landlord/units/new/page.tsx", "/landlord/properties/new");
assertIncludes("src/app/landlord/page.tsx", "Create your first property");
assertIncludes("scripts/check-routes.ts", "/landlord/properties/new");

console.log("Account flow hardening verification passed.");
