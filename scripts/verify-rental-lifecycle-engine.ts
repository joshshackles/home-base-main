import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertIncludes(path: string, marker: string) {
  if (!read(path).includes(marker)) {
    throw new Error(`${path} is missing required rental lifecycle marker: ${marker}`);
  }
}

const packageJson = JSON.parse(read("package.json")) as { version?: string; scripts?: Record<string, string> };
if (packageJson.version !== "4.20.0") {
  throw new Error(`Expected package version 4.20.0, found ${packageJson.version ?? "missing"}`);
}
if (!packageJson.scripts?.["rental-lifecycle:verify"]) {
  throw new Error("package.json is missing rental-lifecycle:verify");
}
if (!packageJson.scripts.verify?.includes("rental-lifecycle:verify")) {
  throw new Error("npm run verify must include rental-lifecycle:verify");
}

for (const marker of [
  "recommendRentalLifecycle",
  "lifecycleToUnitStatus",
  "rentalLifecycleEngineSteps",
  "summarizeLifecycleRecommendations",
  "DRAFT",
  "COMING_SOON",
  "APPLICATION_PENDING",
  "MOVE_IN_SCHEDULED",
  "RENEWAL_PENDING",
  "NOTICE_GIVEN",
  "TURNOVER",
  "MAINTENANCE_HOLD"
]) {
  assertIncludes("src/lib/rental-lifecycle-engine.ts", marker);
}

for (const marker of [
  "RentalLifecycleBoard",
  "Lifecycle lanes",
  "Next actions",
  "lifecycleLabel",
  "summary.needsAttention"
]) {
  assertIncludes("src/components/rentals/RentalLifecycleBoard.tsx", marker);
}

for (const marker of [
  "getRentalLifecycleBoardItems",
  "recommendRentalLifecycle",
  "leasePacketStatuses",
  "occupancyStatuses",
  "openMaintenanceCount"
]) {
  assertIncludes("src/lib/rental-lifecycle-board-data.ts", marker);
}

assertIncludes("src/app/landlord/lifecycle/page.tsx", "RentalLifecycleBoard");
assertIncludes("src/app/admin/lifecycle/page.tsx", "RentalLifecycleBoard");
assertIncludes("src/app/landlord/layout.tsx", "/landlord/lifecycle");
assertIncludes("src/app/admin/layout.tsx", "/admin/lifecycle");
assertIncludes("src/app/landlord/units/page.tsx", "recommendRentalLifecycle");
assertIncludes("src/app/landlord/units/[id]/page.tsx", "Unified Rental Lifecycle");
assertIncludes("src/app/landlord/actions.ts", "lifecycleToUnitStatus");
assertIncludes("tests/e2e/workflow-matrix.spec.ts", "/landlord/lifecycle");
assertIncludes("tests/e2e/workflow-matrix.spec.ts", "/admin/lifecycle");
assertIncludes("docs/UNIFIED_RENTAL_LIFECYCLE_ENGINE.md", "Unified Rental Lifecycle Engine");
assertIncludes("README.md", "UNIFIED_RENTAL_LIFECYCLE_ENGINE.md");
assertIncludes("CHANGELOG.md", "v4.20.0 - Unified Rental Lifecycle Engine");

console.log("Rental lifecycle engine verification passed.");
