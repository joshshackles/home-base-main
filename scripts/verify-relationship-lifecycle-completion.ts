import { readFileSync } from "node:fs";

const requiredChecks: Array<[string, string]> = [
  ["src/lib/relationship-lifecycle.ts", "export async function endTenantOccupancy"],
  ["src/lib/relationship-lifecycle.ts", "ConnectionStatus.REVOKED"],
  ["src/lib/relationship-lifecycle.ts", "RentalLifecycleStatus.TURNOVER"],
  ["src/lib/relationship-lifecycle.ts", "export type TenantDashboardMode"],
  ["src/app/admin/actions.ts", "endAdminTenantOccupancyAction"],
  ["src/app/landlord/actions.ts", "endLandlordTenantOccupancy"],
  ["src/app/applicant/page.tsx", "FormerTenantDashboard"],
  ["src/lib/authorization.ts", "activeOccupancyStatuses"],
  ["src/lib/calendar/index.ts", "occupancies"],
  ["src/lib/notices/index.ts", "occupancies"],
  ["src/lib/tasks/index.ts", "occupancies"]
];

const missing = requiredChecks.filter(([file, needle]) => !readFileSync(file, "utf8").includes(needle));
if (missing.length) {
  console.error("Relationship lifecycle completion verification failed:");
  for (const [file, needle] of missing) console.error(`- ${file} missing ${needle}`);
  process.exit(1);
}
console.log("Relationship lifecycle completion verification passed.");
