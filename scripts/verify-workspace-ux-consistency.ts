import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(relativePath: string, markers: string[]) {
  const text = read(relativePath);
  const missing = markers.filter((marker) => !text.includes(marker));

  if (missing.length) {
    throw new Error(`${relativePath} is missing workspace UX markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertNotIncludes(relativePath: string, markers: string[]) {
  const text = read(relativePath);
  const present = markers.filter((marker) => text.includes(marker));

  if (present.length) {
    throw new Error(`${relativePath} should not include deprecated workspace UX markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/app/workspace/page.tsx", [
  "buildWorkspaceLauncher",
  "Workspace Launcher",
  "Your Workspaces",
  "Contextual Views",
  "Protected Operations",
  "Different workspaces, same platform layer."
]);

assertIncludes("src/lib/workspace/workspace-launcher.ts", [
  "WorkspaceLauncherCard",
  "buildWorkspaceLauncher",
  "requiredCapabilities",
  "href: \"/participant\"",
  "href: \"/owner\"",
  "href: \"/housing-authority\"",
  "href: \"/admin/platform-operations\"",
  "status: \"protected\""
]);

assertIncludes("src/components/AppHeader.tsx", [
  "href=\"/workspace\"",
  "Workspace"
]);

assertNotIncludes("src/components/AppHeader.tsx", [
  "dashboardHref"
]);

assertIncludes("src/app/dashboard/page.tsx", [
  "requireUser(\"/dashboard\")",
  "redirect(\"/workspace\")",
  "buildDashboardForUser"
]);

assertIncludes("src/components/layout/DashboardShell.tsx", [
  "workspaceSwitcherHref = \"/workspace\"",
  "workspaceSwitcherLabel = \"Switch Workspace\"",
  "paletteItems",
  "LayoutDashboard",
  "{workspaceSwitcherLabel}"
]);

assertIncludes("WORKSPACE_UX_STANDARD.md", [
  "Phase 8 Workspace Launcher",
  "Phase 9 Shell Workspace Switching",
  "`/workspace`",
  "`/dashboard`",
  "Switch Workspace"
]);

assertIncludes("package.json", [
  "\"workspace-ux-consistency:verify\": \"tsx scripts/verify-workspace-ux-consistency.ts\""
]);

assertNotIncludes("src/lib/workspace/index.ts", [
  "workspace-launcher"
]);

console.log("Workspace UX consistency verification passed.");
