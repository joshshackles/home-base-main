import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledPayments } from "@/lib/payments/scheduled";
import { generateMonthlyRentCharges, processDueAutoPay, processDuePaymentRetries } from "@/lib/payments/financial-automation";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const rent = await generateMonthlyRentCharges();
  const autopay = await processDueAutoPay();
  const scheduled = await processDueScheduledPayments();
  const retries = await processDuePaymentRetries();
  return NextResponse.json({ ok: true, rent, autopay, scheduled, retries });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
