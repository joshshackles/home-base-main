import { emailQueueStats, sendQueuedSignatureNotificationEmails } from "../src/lib/email";

async function main() {
  const limit = Number.parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || "100", 10);
  const before = await emailQueueStats();
  const results = await sendQueuedSignatureNotificationEmails(limit);
  const after = await emailQueueStats();
  const sent = results.filter((item) => item.status === "SENT").length;
  const failed = results.filter((item) => item.status === "FAILED").length;
  const retrying = results.filter((item) => item.status === "QUEUED").length;

  console.log(`Before: ${JSON.stringify(before)}`);
  console.log(`Processed ${results.length} queued signature notification(s). Sent: ${sent}. Retrying: ${retrying}. Failed permanently: ${failed}.`);
  console.log(`After: ${JSON.stringify(after)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
