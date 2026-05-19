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
assertIncludes("src/app/landlord/homes/new/page.tsx", "redirect(\"/landlord/rentals/new\")");
assertIncludes("src/app/landlord/units/page.tsx", "Add Rental");
assertIncludes("src/app/landlord/units/page.tsx", "No rentals yet. Add a rental and choose the type");
assertIncludes("src/app/landlord/properties/page.tsx", "redirect(\"/landlord/rentals\")");
assertIncludes("src/app/landlord/units/new/page.tsx", "Create one rental record");
assertIncludes("src/app/landlord/page.tsx", "Create your first rental");
assertIncludes("scripts/check-routes.ts", "/landlord/homes/new");

console.log("Property/unit workflow verification passed.");
