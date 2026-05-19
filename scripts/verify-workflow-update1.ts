import { readFileSync, existsSync } from "fs";

function assertFile(path: string) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
}

function assertContains(path: string, expected: string, message: string) {
  const text = readFileSync(path, "utf8");
  if (!text.includes(expected)) throw new Error(`${message}: expected ${path} to contain ${expected}`);
}

assertContains("prisma/schema.prisma", "model UserSession", "DB-backed sessions model is required");
assertContains("prisma/schema.prisma", "model ApplicationClaimToken", "Application claim token model is required");
assertContains("src/lib/auth.ts", "createDatabaseSession", "New sign-ins should create database sessions");
assertContains("src/app/login/actions.ts", "createDatabaseSession", "Login action should use revokable database sessions");
assertFile("src/app/signup/page.tsx");
assertFile("src/app/signup/actions.ts");
assertFile("src/app/claim/[token]/page.tsx");
assertFile("src/app/claim/[token]/actions.ts");
assertContains("src/app/admin/applications/[id]/page.tsx", "Generate Claim Link", "Admin application detail should expose claim-link generation");
assertContains("CHANGELOG.md", "v1.7.1 — Workflow Update 1", "Changelog should document workflow update 1");

console.log("Workflow update 1 verification passed.");
