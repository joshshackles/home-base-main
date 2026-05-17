import { NextRequest, NextResponse } from "next/server";
import { emailQueueStats, queuedEmailBatchSize, sendQueuedSignatureNotificationEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : queuedEmailBatchSize();
  const results = await sendQueuedSignatureNotificationEmails(limit);
  const stats = await emailQueueStats();

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sent: results.filter((item) => item.status === "SENT").length,
    queuedForRetry: results.filter((item) => item.status === "QUEUED").length,
    failed: results.filter((item) => item.status === "FAILED").length,
    stats
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
