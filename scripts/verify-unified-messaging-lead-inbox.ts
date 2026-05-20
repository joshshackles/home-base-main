import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertIncludes("src/lib/messaging/unified-landlord-inbox.ts", [
  "UnifiedInboxThread",
  "sourceType: \"lead\"",
  "sourceTypeForThread",
  "buildUnifiedLandlordInbox",
  "filterUnifiedInboxThreads",
  "visibleMessageWhereForUser",
  "propertyManagerUserId"
]);

assertIncludes("src/app/landlord/inbox/page.tsx", [
  "Unified landlord inbox",
  "buildUnifiedLandlordInbox",
  "replyToLandlordLead",
  "sendWorkflowMessage",
  "Needs reply",
  "Lead questions",
  "Conversation context",
  "returnTo"
]);

assertIncludes("src/app/landlord/actions.ts", [
  "returnTo",
  "propertyManagerUserId",
  "revalidatePath(\"/landlord/inbox\")",
  "redirect(`${parsed.data.returnTo}${separator}reply=sent`)"
]);

assertIncludes("src/app/landlord/page.tsx", [
  "/landlord/inbox?thread=lead_"
]);

assertIncludes("docs/UNIFIED_MESSAGING_LEAD_INBOX.md", [
  "Version: 4.43.0",
  "Lead",
  "MessageThread",
  "adapter",
  "Permission Model"
]);

assertIncludes("package.json", [
  "\"version\": \"4.43.0\"",
  "\"unified-messaging-lead-inbox:verify\""
]);

assertIncludes("src/lib/app-version.ts", ["4.43.0"]);
assertIncludes("README.md", ["Current package version: **4.43.0**"]);
assertIncludes("CHANGELOG.md", ["## v4.43.0 - Unified Messaging & Lead Inbox"]);

console.log("Unified messaging and lead inbox verification passed.");
