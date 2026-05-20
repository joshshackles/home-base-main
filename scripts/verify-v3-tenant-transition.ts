import { readFileSync } from "node:fs";

function assertIncludes(file: string, expected: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`${file} is missing: ${expected}`);
  }
}

assertIncludes("src/components/dashboard/DashboardTaskList.tsx", "items.length === 0");
assertIncludes("src/components/ui/system/index.tsx", "WorkflowStatusBadge");
assertIncludes("src/components/applicant/ProfileDraftSaver.tsx", "localStorage");
assertIncludes("src/app/applicant/actions.ts", "withdrawApplicantApplication");
assertIncludes("src/app/applicant/actions.ts", "ApplicationStatus.WITHDRAWN");
assertIncludes("src/app/applicant/applications/[id]/page.tsx", "Withdraw application");
assertIncludes("src/app/applicant/home-tools/page.tsx", "Financial calendar");
assertIncludes("src/app/applicant/home-tools/page.tsx", "Pending home");
assertIncludes("src/app/applicant/leases/[id]/page.tsx", "break-words overflow-x-hidden");
assertIncludes("package.json", '"test:form-persistence"');
assertIncludes("package.json", '"test:sort-priority"');
assertIncludes("package.json", '"test:label-masking"');

console.log("v3 tenant transition verification passed.");
