import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing permission/security markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`${path} still contains retired or weaker markers:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) {
    throw new Error(`${path} is missing.`);
  }
}

assertExists("docs/PERMISSION_MATRIX_GUESSED_ID_TESTS.md");

assertIncludes("docs/PERMISSION_MATRIX_GUESSED_ID_TESTS.md", [
  "Permission Matrix & Guessed-ID Security Tests",
  "Deny by default",
  "Central Authorization Helpers",
  "High-Risk Routes Covered By Static Release Gate",
  "Guessed-ID Test Strategy",
  "Follow-Up Work"
]);

assertIncludes("src/lib/authorization.ts", [
  "canAccessProperty",
  "canAccessUnit",
  "canAccessListing",
  "canAccessLead",
  "canAccessApplication",
  "canAccessMaintenanceRequest",
  "canAccessMessageThread",
  "canCreateMessageThread",
  "getAuthorizedDocument",
  "visibleDocumentWhereForUser",
  "canAccessLeasePacket",
  "canAccessInspection",
  "canAccessLedgerEntry",
  "logAuthorizationDenied"
]);

assertIncludes("src/app/api/documents/[id]/route.ts", [
  "getVerifiedCurrentUser",
  "getAuthorizedDocument",
  "logAuthorizationDenied",
  "Document is not available.",
  "status: 403"
]);

assertIncludes("src/app/api/unit-photos/[id]/route.ts", [
  "getVerifiedCurrentUser",
  "canAccessUnit",
  "Photo not found.",
  "UnitStatus.AVAILABLE"
]);

assertIncludes("src/app/admin/system/sample-data/route.ts", [
  "requireSuperUser",
  "sample-data",
  "homebase-sample-6-users-each-10-homes.json"
]);
assertExcludes("src/app/admin/system/sample-data/route.ts", [
  "requireRole([\"ADMIN\"]",
  "requireRole(['ADMIN']"
]);

assertIncludes("src/app/workflow-actions.ts", [
  "assertCanAccessApplication",
  "assertCanAccessMaintenanceRequest",
  "assertCanAccessMessageThread",
  "assertCanCreateMessageThread",
  "assertCanAccessUnit"
]);

assertIncludes("src/app/landlord/applications/[id]/page.tsx", [
  "requireRole([\"LANDLORD\"]",
  "ownerId: user.userId",
  "applicationDetail"
]);

assertIncludes("src/app/landlord/units/[id]/page.tsx", [
  "requireRole([\"LANDLORD\"]",
  "ownerId: user.userId",
  "NOT: { status: \"ARCHIVED\" }"
]);

assertIncludes("src/app/landlord/tenants/[id]/page.tsx", [
  "requireRole([\"LANDLORD\"]",
  "ownerId: user.userId",
  "authorized ? application.applicationDetail : null",
  "Limited lead view"
]);

assertIncludes("src/app/applicant/applications/[id]/page.tsx", [
  "requireRole(",
  "\"APPLICANT\", \"TENANT\"",
  "OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }]",
  "visibleDocumentWhereForUser"
]);

assertIncludes("src/app/applicant/leases/[id]/page.tsx", [
  "requireRole([\"APPLICANT\", \"TENANT\"]",
  "application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }",
  "signerUserId === user.userId",
  "visibleDocumentWhereForUser"
]);

assertIncludes("src/app/api/cron/send-queued-email/route.ts", [
  "CRON_SECRET",
  "VERCEL_CRON_SECRET",
  "Unauthorized"
]);

assertIncludes("src/app/api/cron/process-payments/route.ts", [
  "CRON_SECRET",
  "VERCEL_CRON_SECRET",
  "Unauthorized"
]);

assertIncludes("src/app/api/webhooks/email/route.ts", [
  "verifySharedSecret",
  "EMAIL_WEBHOOK_SECRET",
  "Invalid email webhook signature."
]);

assertIncludes("src/app/api/webhooks/quickbooks/route.ts", [
  "verifySharedSecret",
  "QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN",
  "Invalid QuickBooks webhook signature."
]);

assertIncludes("package.json", [
  "\"version\": \"4.61.5\"",
  "\"permission-matrix:verify\"",
  "\"verify\": \"npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify && npm run tenant-portal:verify && npm run mobile-flow-drilldowns:verify && npm run admin-ops-marketplace-discovery:verify && npm run marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify && npm run field-workflow-proof-launch-hardening:verify && npm run final-readiness:verify && npm run landlord-units-typecheck-fix:verify && npm run admin-command-center-null-date-fix:verify && npm run admin-command-center-inspection-title-fix:verify && npm run lead-authorization-relation-fix:verify && npm run maintenance-priority-enum-fix:verify && npm run role-visibility-workflow-simplification:verify && npm run homepage-slider-marketplace-refresh:verify && npm run tenant-nav-minimum-fix:verify && npm run admin-branding-slide-search-param-fix:verify && npm run dashboard-shell-sparkles-icon-fix:verify && npm run homepage-reference-fidelity-pass:verify && npm run routes:check"
]);

assertIncludes("src/lib/app-version.ts", ["4.61.5"]);
assertIncludes("README.md", ["Current package version: **4.61.5**"]);
assertIncludes("CHANGELOG.md", ["## v4.61.5 - Version Consistency Metadata Cleanup"]);

console.log("Permission matrix and guessed-ID security verification passed.");
