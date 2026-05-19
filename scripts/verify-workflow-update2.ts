import { readFileSync, existsSync } from "node:fs";

function read(path: string) {
  if (!existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(path, "utf8");
}

function assertIncludes(path: string, needle: string) {
  const contents = read(path);
  if (!contents.includes(needle)) throw new Error(`${path} is missing: ${needle}`);
}

assertIncludes("src/lib/deployment-mode.ts", "Hobby daily queue mode");
assertIncludes("src/app/admin/notifications/page.tsx", "Process Queue Now");
assertIncludes("src/app/admin/notifications/page.tsx", "Requeue Failed");
assertIncludes("src/app/admin/actions.ts", "requeueFailedSignatureNotifications");
assertIncludes("src/app/admin/users/[id]/edit/page.tsx", "Email Password Reset Link");
assertIncludes("src/app/admin/users/[id]/edit/page.tsx", "Password reset email sent");
assertIncludes("CHANGELOG.md", "v1.7.2");

console.log("Workflow Update 2 verification passed.");
