import { readFileSync } from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(relativePath: string, needles: string[]) {
  const contents = read(relativePath);
  for (const needle of needles) {
    if (!contents.includes(needle)) throw new Error(`${relativePath} is missing ${needle}`);
  }
}

function assertNotContains(relativePath: string, needles: string[]) {
  const contents = read(relativePath);
  for (const needle of needles) {
    if (contents.includes(needle)) throw new Error(`${relativePath} still contains ${needle}`);
  }
}

assertContains("src/app/page.tsx", [
  "Find housing faster. Manage rentals smarter.",
  "Search available homes",
  "AudiencePathways",
  "FeaturedListings",
  "TrustSection"
]);

assertContains("src/components/dashboard/RoleDashboard.tsx", [
  "bg-slate-50",
  "rounded-[1.5rem]",
  "Review Needs Attention",
  "Workflow map",
  "Open Next Action"
]);

assertNotContains("src/app/page.tsx", ["\u00C3\u00A2", "\u00C3\u0082", "\u00E2\u0080\u00A2", "\u00C2\u00B7"]);

console.log("Dashboard polish verification passed.");
