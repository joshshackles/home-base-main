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

assertContains("package.json", '"version": "4.61.5"');
assertContains("package.json", '"dashboard-shell-sparkles-icon-fix:verify": "tsx scripts/verify-dashboard-shell-sparkles-icon-fix.ts"');
assertContains("CHANGELOG.md", "## v4.61.5 - Version Consistency Metadata Cleanup");
assertContains("src/components/layout/DashboardShell.tsx", "Sparkles,");
assertContains("src/lib/navigation/first-release.ts", 'icon: "Sparkles"');

console.log("Dashboard shell Sparkles icon fix verification passed.");
