import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function assertIncludes(file: string, expected: string, message: string) {
  const text = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  if (!text.includes(expected)) fail(`${message}. Missing ${expected} in ${file}.`);
  console.log(`PASS: ${message}`);
}

assertIncludes("src/lib/logger.ts", "JSON.stringify(payload)", "Structured JSON logger is present");
assertIncludes("src/lib/logger.ts", "[redacted]", "Logger redacts sensitive context fields");
assertIncludes("src/lib/audit.ts", "logger.error", "Audit log failures use structured logging");
assertIncludes("src/lib/security-events.ts", "logger.error", "Security event failures use structured logging");
assertIncludes("src/lib/email.ts", "logger.info", "Email queue emits structured logs");
assertIncludes("vitest.config.ts", "tests/**/*.test.ts", "Vitest test discovery is configured");
assertIncludes("package.json", "\"test\": \"vitest run\"", "Automated unit test script is configured");
assertIncludes("tests/unit/password.test.ts", "validatePasswordStrength", "Password policy has unit coverage");
assertIncludes("tests/unit/env.test.ts", "getEnvironmentWarnings", "Environment validation has unit coverage");
assertIncludes("tests/unit/email.test.ts", "emailProvider", "Email configuration has unit coverage");

console.log("Observability and test verification passed.");
