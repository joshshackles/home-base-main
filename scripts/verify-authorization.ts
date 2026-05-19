import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const assertContains = (file: string, needle: string, message: string) => {
  const body = read(file);
  if (!body.includes(needle)) throw new Error(`${file}: ${message}`);
};

assertContains("src/lib/authorization.ts", "canAccessMessageThread", "central message-thread authorization helper is missing.");
assertContains("src/lib/authorization.ts", "getAuthorizedDocument", "central document authorization helper is missing.");
assertContains("src/lib/authorization.ts", "assertCanAccessApplication", "central application authorization assertion is missing.");
assertContains("src/lib/authorization.ts", "assertCanAccessLeasePacket", "central lease-packet authorization assertion is missing.");
assertContains("src/lib/authorization.ts", "assertCanAccessLedgerEntry", "central ledger authorization assertion is missing.");
assertContains("src/app/workflow-actions.ts", "assertCanAccessMessageThread(user, threadId)", "message replies must assert thread access before writing.");
assertContains("src/app/workflow-actions.ts", "assertCanCreateMessageThread", "new workflow threads must check linked-record authorization.");
assertContains("src/lib/authorization.ts", "return { isInternal: false }", "internal note visibility must be centralized.");
assertContains("src/app/applicant/inbox/page.tsx", "visibleMessageWhereForUser(user)", "applicant inbox must use centralized visible message filtering.");
assertContains("src/app/api/documents/[id]/route.ts", "getAuthorizedDocument", "document downloads must use centralized document authorization.");

console.log("Authorization verification passed.");
