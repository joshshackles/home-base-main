import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const assertContains = (file: string, needle: string, message: string) => {
  const body = read(file);
  if (!body.includes(needle)) throw new Error(`${file}: ${message}`);
};
const assertNotContains = (file: string, needle: string, message: string) => {
  const body = read(file);
  if (body.includes(needle)) throw new Error(`${file}: ${message}`);
};

assertContains("src/lib/authorization.ts", "visibleDocumentWhereForUser", "document visibility must be centralized in the authorization layer.");
assertContains("src/lib/authorization.ts", "visibleDocumentRequestWhereForUser", "document request visibility must be centralized in the authorization layer.");
assertContains("src/lib/authorization.ts", "applicantVisibleDocumentTypes", "applicant document visibility allow-list must be explicit.");
assertContains("src/lib/authorization.ts", "landlordVisibleDocumentTypes", "landlord document visibility allow-list must be explicit.");
assertContains("src/lib/authorization.ts", "findFirst({", "authorized document lookups must apply visibility in the database query.");
assertContains("src/lib/authorization.ts", "where: { id: documentId, AND: [visibleWhere] }", "getAuthorizedDocument must not fetch unrestricted document records first.");
assertContains("src/app/api/documents/[id]/route.ts", "getAuthorizedDocument", "document download route must use centralized authorization.");
assertContains("src/app/api/documents/[id]/route.ts", "logAuthorizationDenied", "denied document downloads must be logged.");
assertContains("src/app/applicant/applications/[id]/page.tsx", "visibleDocumentWhereForUser(user)", "applicant application documents must use centralized visibility.");
assertContains("src/app/applicant/applications/[id]/page.tsx", "visibleDocumentRequestWhereForUser(user)", "applicant document requests must use centralized visibility.");
assertContains("src/app/applicant/leases/[id]/page.tsx", "visibleDocumentWhereForUser(user)", "applicant lease documents must use centralized visibility.");
assertContains("src/app/landlord/leases/[id]/page.tsx", "visibleDocumentWhereForUser(user)", "landlord lease documents must use centralized visibility.");
assertContains("src/app/admin/actions.ts", "Selected application and unit do not match.", "admin uploads must reject mismatched application/unit attachments.");
assertContains("src/app/admin/actions.ts", "Selected lease packet and application do not match.", "admin uploads must reject mismatched lease/application attachments.");
assertNotContains("src/app/applicant/leases/[id]/page.tsx", "visibility: { in: [\"APPLICANT\", \"SHARED\"] }", "applicant lease page should not use hard-coded document visibility.");
assertNotContains("src/app/landlord/leases/[id]/page.tsx", "visibility: { in: [\"LANDLORD\", \"SHARED\"] }", "landlord lease page should not use hard-coded document visibility.");

console.log("Document access update 3 verification passed.");
