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

assertContains("src/lib/authorization.ts", "assertCanWriteInternalNote", "internal-note writes must have a dedicated authorization assertion.");
assertContains("src/lib/authorization.ts", "visibleMessageWhereForUser", "inbox message visibility must be centralized.");
assertContains("src/lib/authorization.ts", "visibleThreadWhereForUser", "thread visibility must hide internal-only threads from non-staff users.");
assertContains("src/app/workflow-actions.ts", "if (parsed.isInternal && !isStaff) await assertCanWriteInternalNote(user);", "forged internal-note submissions must be rejected, not silently downgraded.");
assertContains("src/app/workflow-actions.ts", "assertCanAccessMessageThread(user, threadId)", "message replies must still assert thread access before writing.");
assertContains("src/app/workflow-actions.ts", "redirect(inboxPathForUser(user, threadId))", "message sends should return users to the selected thread.");
assertContains("src/components/messaging/TextingInbox.tsx", "selectedThreadId", "inbox must support selected thread state.");
assertContains("src/components/messaging/TextingInbox.tsx", "?thread=", "thread list must use routable thread selection instead of static anchors.");
assertNotContains("src/components/messaging/TextingInbox.tsx", "const activeThread = threads[0] ?? null;", "inbox must not always lock to the first thread.");
assertContains("src/app/applicant/inbox/page.tsx", "visibleMessageWhereForUser", "applicant inbox must use centralized message visibility rules.");
assertContains("src/app/applicant/inbox/page.tsx", "visibleThreadWhereForUser", "applicant inbox must hide internal-only threads.");
assertContains("src/app/landlord/inbox/page.tsx", "visibleMessageWhereForUser", "landlord inbox must use centralized message visibility rules.");
assertContains("src/app/landlord/inbox/page.tsx", "visibleThreadWhereForUser", "landlord inbox must hide internal-only threads unless explicitly authorized.");
assertContains("src/app/landlord/inbox/page.tsx", "allowInternalNotes={allowInternalNotes}", "landlord internal-note UI must be driven by authorization, not hard-coded.");

console.log("Messaging update 2 verification passed.");
