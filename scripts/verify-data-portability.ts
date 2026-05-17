import { readFileSync } from "node:fs";

function assertIncludes(file: string, expected: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`${file} is missing: ${expected}`);
  }
}

function assertJsonCounts() {
  const sample = JSON.parse(readFileSync("sample-data/homebase-sample-6-users-each-10-homes.json", "utf8"));
  const users = sample.data.users as Array<{ role: string }>;
  const homes = sample.data.units as unknown[];
  for (const role of ["ADMIN", "LANDLORD", "APPLICANT", "TENANT", "INSPECTOR"]) {
    const count = users.filter((user) => user.role === role).length;
    if (count !== 6) throw new Error(`Expected 6 ${role} users, found ${count}.`);
  }
  if (homes.length !== 10) throw new Error(`Expected 10 homes, found ${homes.length}.`);
}

assertIncludes("src/lib/data-portability.ts", "DATA_PORTABILITY_MODELS");
assertIncludes("src/lib/data-portability.ts", "exportDataSnapshot");
assertIncludes("src/lib/data-portability.ts", "importDataSnapshot");
assertIncludes("src/app/admin/system/export/route.ts", "exportDataSnapshot");
assertIncludes("src/app/admin/system/sample-data/route.ts", "homebase-sample-6-users-each-10-homes.json");
assertIncludes("src/app/admin/actions.ts", "importDataSnapshotAction");
assertIncludes("src/app/admin/system/page.tsx", "Export site data");
assertIncludes("src/app/admin/system/page.tsx", "Import site data");
assertIncludes("src/app/admin/page.tsx", "import/export tools");
assertIncludes("scripts/check-routes.ts", "/admin/system/export");
assertIncludes("scripts/check-routes.ts", "/admin/system/sample-data");
assertJsonCounts();

console.log("Data portability verification passed.");
