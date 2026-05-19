import { existsSync, readdirSync, statSync } from "fs";
import path from "path";

const appDir = path.join(process.cwd(), "src", "app");
const requiredRoutes = [
  "/",
  "/marketplace",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/account/password",
  "/admin",
  "/admin/properties",
  "/admin/units",
  "/admin/leads",
  "/admin/applications",
  "/admin/documents",
  "/admin/leases",
  "/admin/leases/[id]",
  "/admin/notifications",
  "/admin/inspections",
  "/admin/inspections/new",
  "/admin/inspections/[id]",
  "/admin/ledger",
  "/admin/ledger/new",
  "/admin/ledger/[id]",
  "/admin/ledger/schedules",
  "/admin/ledger/schedules/new",
  "/admin/ledger/schedules/[id]",
  "/admin/ledger/plans",
  "/admin/ledger/plans/new",
  "/admin/ledger/plans/[id]",
  "/admin/ledger/aging",
  "/admin/ledger/aging/export",
  "/admin/ledger/export",
  "/admin/ledger/reports",
  "/admin/ledger/statements",
  "/admin/ledger/statements/[applicationId]",
  "/admin/ledger/statements/[applicationId]/export",
  "/admin/leases/templates",
  "/admin/users",
  "/admin/audit",
  "/admin/system",
  "/admin/system/export",
  "/admin/system/sample-data",
  "/admin/security",
  "/admin/security/events",
  "/landlord",
  "/landlord/homes/new",
  "/landlord/properties",
  "/landlord/properties/new",
  "/landlord/units",
  "/landlord/leads",
  "/landlord/applications",
  "/landlord/leases",
  "/landlord/leases/[id]",
  "/landlord/inspections",
  "/landlord/inspections/[id]",
  "/landlord/ledger",
  "/applicant",
  "/applicant/profile",
  "/applicant/applications",
  "/applicant/leases",
  "/applicant/leases/[id]",
  "/applicant/inspections",
  "/applicant/inspections/[id]",
  "/applicant/ledger",
  "/applicant/ledger/statement",
  "/applicant/ledger/statement/export",
  "/admin/properties/new",
  "/admin/properties/[id]/edit",
  "/admin/units/new",
  "/admin/units/[id]/edit",
  "/admin/leads/[id]",
  "/admin/applications/[id]",
  "/admin/users/new",
  "/admin/users/[id]/edit",
  "/marketplace/[unitId]",
  "/landlord/units/[id]/edit",
  "/landlord/leads/[id]",
  "/landlord/applications/[id]",
  "/applicant/applications/[id]",
  "/api/documents/[id]",
  "/api/unit-photos/[id]"
];

function routeToCandidatePaths(route: string) {
  if (route === "/") return [path.join(appDir, "page.tsx")];
  const base = path.join(appDir, ...route.slice(1).split("/"));
  if (route.startsWith("/api/")) return [path.join(base, "route.ts")];
  return [path.join(base, "page.tsx"), path.join(base, "route.ts")];
}

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, files);
    if (stats.isFile() && ["page.tsx", "route.ts", "layout.tsx"].includes(entry)) files.push(full);
  }
  return files;
}

let failed = false;
for (const route of requiredRoutes) {
  const candidates = routeToCandidatePaths(route);
  if (!candidates.some((filePath) => existsSync(filePath))) {
    console.error(`Missing required route file for ${route}: ${candidates.map((filePath) => path.relative(process.cwd(), filePath)).join(" or ")}`);
    failed = true;
  }
}

const discovered = walk(appDir).map((file) => path.relative(appDir, file));
console.log(`Route inventory check scanned ${discovered.length} app files.`);
console.log(`Required route check ${failed ? "failed" : "passed"}.`);
if (failed) process.exit(1);
