import { readFileSync } from "node:fs";

const checks: Array<{ file: string; markers: string[] }> = [
  {
    file: "src/lib/dashboard/role-dashboard.ts",
    markers: [
      "RoleDashboardClarity",
      "roleGoal",
      "currentFocus",
      "nextActionTitle",
      "followUpActions",
      "moduleGoals",
      "moduleFocus",
      "buildRoleClarity",
      "clarity: buildRoleClarity(model, coherence)"
    ]
  },
  {
    file: "src/components/dashboard/RoleDashboard.tsx",
    markers: [
      "You are here",
      "Do this next",
      "model.clarity.currentFocus",
      "model.clarity.roleGoal",
      "model.clarity.nextActionTitle",
      "model.clarity.nextActionDetail",
      "model.clarity.nextActionHref",
      "model.clarity.followUpActions",
      "Authorized modules"
    ]
  },
  {
    file: "docs/ROLE_CLARITY_NEXT_ACTION.md",
    markers: [
      "Version: 4.38.0",
      "What should I do next?",
      "The next action system does not create fake work",
      "Role Coverage"
    ]
  },
  {
    file: "CHANGELOG.md",
    markers: ["v4.38.0 - Role Clarity Next Action System"]
  },
  {
    file: "package.json",
    markers: ["\"version\": \"4.38.0\"", "role-clarity-next-action:verify"]
  },
  {
    file: "src/lib/app-version.ts",
    markers: ["4.38.0"]
  }
];

const failures: string[] = [];

for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!text.includes(marker)) failures.push(`${check.file} is missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Role clarity next action verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Role clarity next action verification passed.");
