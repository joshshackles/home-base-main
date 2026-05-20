import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) {
    throw new Error(`${path} is missing canonical conversation / workflow proof markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

assertExists("docs/CANONICAL_CONVERSATIONS_WORKFLOW_PROOF.md");
assertExists("prisma/migrations/20260520100000_canonical_conversation_model/migration.sql");

assertIncludes("prisma/schema.prisma", [
  "enum ConversationSourceType",
  "enum ConversationStatus",
  "enum ConversationEventType",
  "model Conversation",
  "model ConversationParticipant",
  "model ConversationEvent",
  "createdConversations Conversation[]",
  "conversations Conversation[]",
]);

assertIncludes("prisma/migrations/20260520100000_canonical_conversation_model/migration.sql", [
  "CREATE TYPE \"ConversationSourceType\"",
  "CREATE TABLE \"Conversation\"",
  "CREATE TABLE \"ConversationParticipant\"",
  "CREATE TABLE \"ConversationEvent\"",
  "Conversation_maintenanceRequestId_idx",
  "Conversation_inspectionId_idx",
]);

assertIncludes("src/lib/conversations/canonical.ts", [
  "CanonicalConversation",
  "canonicalFromLead",
  "canonicalFromMessageThread",
  "assertCanAccessCanonicalConversation",
  "getCanonicalConversationCounts",
  "canAccessMaintenanceRequest",
  "canAccessInspection",
]);

assertIncludes("src/lib/messaging/unified-landlord-inbox.ts", [
  "canonicalFromLead",
  "canonicalFromMessageThread",
  "canonicalConversationId",
]);

assertIncludes("src/lib/workflow-proof.ts", [
  "buildWorkflowProofModel",
  "maintenanceWithThreads",
  "vendorWorkLogs",
  "vendorInvoices",
  "assignedInspections",
  "failedInspections",
]);

assertIncludes("src/app/admin/workflow-proof/page.tsx", [
  "Operational field workflow proof",
  "Canonical conversation model migration path",
  "buildFieldWorkflowProofModel",
  "getCanonicalConversationCounts",
]);

assertIncludes("src/lib/navigation/first-release.ts", [
  "{ href: \"/admin/workflow-proof\", label: \"Workflow Proof\"",
]);

assertIncludes("package.json", [
  "\"canonical-conversations-workflow-proof:verify\"",
  "marketplace-readiness-messaging:verify && npm run canonical-conversations-workflow-proof:verify",
]);
assertIncludes("CHANGELOG.md", ["## v4.59.1 - Landlord Units Typecheck Fix"]);

console.log("Canonical conversations and workflow proof verification passed.");
