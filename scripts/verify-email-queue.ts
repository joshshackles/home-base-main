import { readFileSync } from "fs";

function assertIncludes(file: string, needle: string, label: string) {
  const content = readFileSync(file, "utf8");
  if (!content.includes(needle)) {
    throw new Error(`${label} is missing from ${file}.`);
  }
}

assertIncludes("src/lib/tokens.ts", "APP_URL must be set in production", "production APP_URL fail-closed check");
assertIncludes("src/lib/tokens.ts", "APP_URL must use HTTPS in production", "production HTTPS APP_URL check");
assertIncludes("src/lib/email.ts", "nextAttemptDate", "email retry backoff helper");
assertIncludes("src/lib/email.ts", "emailMaxAttempts", "email max-attempt policy");
assertIncludes("src/lib/email.ts", "nextAttemptAt", "durable next-attempt scheduling");
assertIncludes("src/app/api/cron/send-queued-email/route.ts", "CRON_SECRET", "cron route authorization");
assertIncludes("prisma/schema.prisma", "attemptCount", "SignatureNotification attemptCount field");
assertIncludes("prisma/schema.prisma", "nextAttemptAt", "SignatureNotification nextAttemptAt field");
assertIncludes(".env.example", "EMAIL_QUEUE_BATCH_SIZE", "email queue batch env example");
assertIncludes(".env.example", "EMAIL_MAX_ATTEMPTS", "email max-attempt env example");
assertIncludes(".env.example", "CRON_SECRET", "cron secret env example");

console.log("Email queue and production link hardening verification passed.");
