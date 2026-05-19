import { readFileSync } from "fs";
import path from "path";

let failed = false;

function assertText(file: string, expected: string, message: string) {
  const contents = readFileSync(path.join(process.cwd(), file), "utf8");
  if (!contents.includes(expected)) {
    console.error(`FAIL: ${message}`);
    console.error(`Missing text in ${file}: ${expected}`);
    failed = true;
  } else {
    console.log(`PASS: ${message}`);
  }
}

function assertNotText(file: string, unexpected: string, message: string) {
  const contents = readFileSync(path.join(process.cwd(), file), "utf8");
  if (contents.includes(unexpected)) {
    console.error(`FAIL: ${message}`);
    console.error(`Unexpected text in ${file}: ${unexpected}`);
    failed = true;
  } else {
    console.log(`PASS: ${message}`);
  }
}

assertText("src/lib/auth.ts", "getVerifiedCurrentUser", "verified current-user helper exists");
assertText("src/lib/auth.ts", "if (!dbUser || !dbUser.isActive) return null", "verified helper rejects inactive or missing users");
assertText("src/lib/auth.ts", "role: dbUser.role", "verified helper refreshes role from database");
assertText("src/lib/auth.ts", "const user = await getVerifiedCurrentUser()", "requireUser uses verified helper");

assertText("src/app/api/documents/[id]/route.ts", "getVerifiedCurrentUser", "document downloads use verified user helper");
assertText("src/app/api/documents/[id]/route.ts", "const user = await getVerifiedCurrentUser()", "document access awaits database verification");
assertNotText("src/app/api/documents/[id]/route.ts", "getCurrentUser", "document downloads no longer trust cookie-only users");

assertText("src/components/AppHeader.tsx", "getVerifiedCurrentUser", "app header uses verified user helper");
assertText("src/components/AppHeader.tsx", "type VerifiedUser = Awaited<ReturnType<typeof getVerifiedCurrentUser>>", "app header receives a database-verified user");
assertNotText("src/components/AppHeader.tsx", "getCurrentUser", "app header no longer trusts cookie-only users");

assertText("src/app/login/actions.ts", "getVerifiedCurrentUser", "logout auditing uses verified user helper");
assertText("src/app/login/actions.ts", "const user = await getVerifiedCurrentUser()", "logout action awaits database verification before audit logging");

if (failed) process.exit(1);
console.log("Session correctness verification passed.");
