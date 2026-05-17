import { readFileSync, existsSync } from "fs";

const checks: Array<[string, string]> = [
  ["prisma/schema.prisma", "model MaintenanceRequest"],
  ["prisma/schema.prisma", "model MessageThread"],
  ["prisma/schema.prisma", "model Message"],
  ["src/app/workflow-actions.ts", "createMaintenanceRequest"],
  ["src/app/workflow-actions.ts", "sendWorkflowMessage"],
  ["src/app/applicant/maintenance/page.tsx", "Request maintenance help"],
  ["src/app/admin/maintenance/page.tsx", "Maintenance queue"],
  ["src/app/landlord/maintenance/page.tsx", "Maintenance queue"],
  ["src/app/applicant/inbox/page.tsx", "Workflow messages"],
  ["src/app/admin/inbox/page.tsx", "Workflow messages"],
  ["src/app/landlord/inbox/page.tsx", "Workflow messages"]
];

for (const [file, needle] of checks) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  const contents = readFileSync(file, "utf8");
  if (!contents.includes(needle)) throw new Error(`${file} does not include ${needle}`);
}

console.log("Workflow update 3 verification passed.");
