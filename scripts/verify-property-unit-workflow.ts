import { readFileSync } from "node:fs";

function assertIncludes(file: string, expected: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`${file} is missing: ${expected}`);
  }
}

assertIncludes("src/app/landlord/actions.ts", "createLandlordSingleFamilyHome");
assertIncludes("src/app/landlord/actions.ts", "unitNumber: \"Home\"");
assertIncludes("src/components/landlord/SingleFamilyHomeForm.tsx", "Best for single-family homes");
assertIncludes("src/app/landlord/homes/new/page.tsx", "Add Home");
assertIncludes("src/app/landlord/units/page.tsx", "Add a single-family home");
assertIncludes("src/app/landlord/units/page.tsx", "Add a unit to a property");
assertIncludes("src/app/landlord/properties/page.tsx", "Add Multi-unit Property");
assertIncludes("src/app/landlord/units/new/page.tsx", "Choose the right starting point");
assertIncludes("src/app/landlord/page.tsx", "Create your first rental home");
assertIncludes("scripts/check-routes.ts", "/landlord/homes/new");

console.log("Property/unit workflow verification passed.");
