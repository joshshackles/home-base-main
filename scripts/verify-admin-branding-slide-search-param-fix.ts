import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertContains(path: string, marker: string) {
  const source = read(path);
  if (!source.includes(marker)) throw new Error(`${path} is missing ${marker}`);
}

assertContains("package.json", '"version": "4.61.4"');
assertContains("package.json", '"admin-branding-slide-search-param-fix:verify": "tsx scripts/verify-admin-branding-slide-search-param-fix.ts"');
assertContains("CHANGELOG.md", "## v4.61.4 - Homepage Reference Fidelity Pass");
assertContains("src/app/admin/branding/page.tsx", "searchParams?: { saved?: string; slide?: string }");
assertContains("src/app/admin/branding/page.tsx", "searchParams?.slide");
assertContains("src/app/admin/branding/page.tsx", "Homepage slider updated and public homepage revalidated.");

console.log("Admin branding slide search param fix verification passed.");
