import { readFileSync, existsSync } from "fs";

const requiredFiles = [
  "src/lib/app-version.ts",
  "src/components/AppFooter.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/fair-housing/page.tsx",
  "src/app/accessibility/page.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "docs/UPDATE_12_PRODUCTION_POLISH.md",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  throw new Error(`Missing Update 12 files: ${missing.join(", ")}`);
}

const layout = readFileSync("src/app/layout.tsx", "utf8");
for (const expected of ["Skip to content", "AppFooter", "openGraph"]) {
  if (!layout.includes(expected)) throw new Error(`layout.tsx is missing ${expected}`);
}

const storage = readFileSync("src/lib/storage.ts", "utf8");
for (const expected of ["image/heic", "text/csv", "spreadsheetml.sheet"]) {
  if (!storage.includes(expected)) throw new Error(`storage.ts is missing ${expected}`);
}

const admin = readFileSync("src/app/admin/page.tsx", "utf8");
const system = readFileSync("src/app/admin/system/page.tsx", "utf8");
if (!admin.includes("APP_VERSION")) throw new Error("Admin dashboard must use APP_VERSION.");
if (!system.includes("APP_RELEASE_LABEL")) throw new Error("System page must use APP_RELEASE_LABEL.");

console.log("Update 12 verification passed.");
