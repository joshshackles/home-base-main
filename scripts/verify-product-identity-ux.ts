import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();
let failed = false;

function check(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Product identity UX check failed: ${message}`);
    failed = true;
  }
}

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const requiredFiles = [
  "src/components/brand/HomeBaseLogo.tsx",
  "src/components/layout/DashboardShell.tsx",
  "src/components/ui/system/index.tsx",
  "src/app/icon.svg",
  "src/app/apple-icon.svg",
  "src/lib/dashboard/dto.ts",
  "src/lib/financial/dto.ts",
  "src/lib/messaging/dto.ts",
  "docs/PRODUCT_IDENTITY_UX_SYSTEM.md"
];

for (const file of requiredFiles) check(existsSync(path.join(root, file)), `${file} is missing.`);

const globals = read("src/app/globals.css");
for (const token of ["--hb-bg: #0f172a", "--hb-surface: #111827", "--hb-accent: #2563eb", "--hb-success: #10b981", "--hb-warning: #f59e0b", "--hb-danger: #ef4444", "--hb-border: #334155", "[data-density=\"compact\"]", "[data-density=\"ultra\"]"]) {
  check(globals.includes(token), `globals.css is missing ${token}.`);
}

const system = read("src/components/ui/system/index.tsx");
for (const component of ["AppCard", "MetricTile", "CompactTable", "StatusBadge", "SectionHeader", "ActionBar", "EmptyState", "ActivityTimeline", "DrawerPanel", "QuickActionButton", "DataGrid", "SystemTabs", "CommandPalette"]) {
  check(system.includes(`function ${component}`), `system UI layer is missing ${component}.`);
}

const shell = read("src/components/layout/DashboardShell.tsx");
for (const feature of ["CommandPalette", "Operations", "Cmd K", "Search units, tenants, payments, messages"]) {
  check(shell.includes(feature), `DashboardShell is missing ${feature}.`);
}

for (const file of ["src/app/admin/layout.tsx", "src/app/landlord/layout.tsx", "src/app/applicant/layout.tsx"]) {
  const text = read(file);
  check(text.includes("DashboardShell"), `${file} does not use DashboardShell.`);
  for (const group of ["Operations", "Leasing", "Financial", "Maintenance", "Communication"]) {
    check(text.includes(group), `${file} is missing grouped navigation ${group}.`);
  }
}

const header = read("src/components/AppHeader.tsx");
check(header.includes("HomeBaseLogo"), "AppHeader does not use the new logo.");
check(header.includes("bg-slate-950"), "AppHeader does not use the unified dark brand header.");

if (failed) process.exit(1);
console.log("Product identity and UX system verification passed.");
