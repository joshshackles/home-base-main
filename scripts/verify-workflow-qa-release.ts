import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertContains(path: string, value: string) {
  const contents = read(path);
  if (!contents.includes(value)) {
    throw new Error(`${path} is missing required workflow QA marker: ${value}`);
  }
}

function assertRegex(path: string, pattern: RegExp, label: string) {
  const contents = read(path);
  if (!pattern.test(contents)) {
    throw new Error(`${path} is missing required workflow QA coverage: ${label}`);
  }
}

const packageJson = JSON.parse(read("package.json")) as {
  version?: string;
  scripts?: Record<string, string>;
};

if (!packageJson.version) {
  throw new Error("package.json is missing a release version");
}

const scripts = packageJson.scripts ?? {};
for (const script of ["workflow-qa:verify", "test:e2e:workflow", "test:e2e:smoke"]) {
  if (!scripts[script]) {
    throw new Error(`package.json is missing ${script}`);
  }
}

if (!scripts.verify?.includes("workflow-qa:verify")) {
  throw new Error("npm run verify must include workflow-qa:verify");
}

const helperPath = "tests/e2e/helpers.ts";
for (const marker of ["loginAs", "expectNoAppError", "expectPageReady", "e2eUsers"]) {
  assertContains(helperPath, marker);
}

const workflowSpec = "tests/e2e/workflow-matrix.spec.ts";
for (const marker of [
  "public discovery to inquiry workflow",
  "applicant housing packet workflow",
  "landlord rental operations workflow",
  "maintenance request creates a linked operations item",
  "messaging is reachable",
  "admin governance"
]) {
  assertContains(workflowSpec, marker);
}

for (const [pattern, label] of [
  [/\/marketplace/, "marketplace discovery"],
  [/\/applicant\/profile/, "applicant profile"],
  [/seed-application-jane-doe/, "seeded application detail"],
  [/seed-lease-packet-jane-doe/, "seeded lease packet detail"],
  [/\/landlord\/rentals\/seed-unit-102-tenant/, "seeded occupied unit detail"],
  [/\/landlord\/maintenance/, "landlord maintenance queue"],
  [/\/admin\/backups/, "admin import/export surface"],
  [/\/admin\/security/, "admin security surface"],
  [/select\[name="unitId"\]/, "maintenance form submission"]
] as const) {
  assertRegex(workflowSpec, pattern, label);
}

const seedPath = "prisma/seed.ts";
for (const marker of [
  "seed-unit-102-tenant",
  "seed-maintenance-leak-102",
  "seed-thread-maintenance-102",
  "seed-message-maintenance-102",
  "seed-task-maintenance-102",
  "seed-workflow-qa"
]) {
  assertContains(seedPath, marker);
}

assertContains(".github/workflows/ci.yml", "test:e2e:workflow");
assertContains("docs/END_TO_END_WORKFLOW_QA.md", "End-to-End Workflow QA Release");

console.log("Workflow QA release verification passed.");
