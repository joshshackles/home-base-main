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

function assertNotContains(path: string, marker: string) {
  const source = read(path);
  if (source.includes(marker)) throw new Error(`${path} still contains ${marker}`);
}

assertContains("package.json", '"version": "4.61.2"');
assertContains("package.json", '"tenant-nav-minimum-fix:verify": "tsx scripts/verify-tenant-nav-minimum-fix.ts"');
assertContains("CHANGELOG.md", "## v4.61.2 - Admin Branding Slide Search Param Fix");
assertContains("scripts/verify-tenant-portal-completion.ts", "assertExcludes(\"src/lib/navigation/first-release.ts\"");
assertContains("src/lib/navigation/first-release.ts", "{ href: \"/tenant/inbox\", label: \"Inbox\"");
assertNotContains("src/lib/navigation/first-release.ts", "{ href: \"/tenant/tasks\", label: \"Tasks\"");
assertNotContains("src/lib/navigation/first-release.ts", "{ href: \"/tenant/calendar\", label: \"Calendar\"");

console.log("Tenant nav minimum fix verification passed.");
