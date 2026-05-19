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
  "max-w-[760px]",
  "lg:grid-cols-[190px_minmax(0,1fr)]",
  "xl:grid-cols-4",
  "truncate text-2xl",
  "Today - 10:00 AM"
]);

assertContains("src/components/dashboard/WorkhorseDashboard.tsx", [
  "bg-slate-50",
  "rounded-[1.5rem]",
  "bg-emerald-50",
  "truncate text-3xl",
  "Next best actions"
]);

assertNotContains("src/app/page.tsx", ["\u00C3\u00A2", "\u00C3\u0082", "\u00E2\u0080\u00A2", "\u00C2\u00B7"]);

console.log("Dashboard polish verification passed.");
