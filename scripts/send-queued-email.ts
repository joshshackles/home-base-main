import { sendQueuedSignatureNotificationEmails } from "../src/lib/email";

async function main() {
  const results = await sendQueuedSignatureNotificationEmails(100);
  const sent = results.filter((item) => item.status === "SENT").length;
  const failed = results.filter((item) => item.status === "FAILED").length;
  console.log(`Processed ${results.length} queued signature notification(s). Sent: ${sent}. Failed: ${failed}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
